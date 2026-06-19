import { Student, Gender, RowError, Grid, SeatConfig, SeatKind } from "./types";

export const CSV_HEADER = ["出席番号", "名前", "性別", "予約座席番号"];

export const SEAT_GRID_CSV_HEADER = ["縦列数", "横行数"];
export const SEAT_CONFIG_CSV_HEADER = ["座席番号", "種類", "優先席"];

const SEAT_KINDS: SeatKind[] = ["none", "male", "female", "disabled"];

/** Build the 40-student template (生徒1..40, all 男, no reservation) */
export function buildTemplateStudents(): Student[] {
  const list: Student[] = [];
  for (let i = 1; i <= 40; i++) {
    list.push({
      attendanceNo: i,
      name: `生徒${i}`,
      gender: "男",
      reservedSeat: null,
      assignedSeat: null,
    });
  }
  return list;
}

function escapeField(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/** Serialize students to CSV (without assignedSeat — that is runtime state, but 予約座席 is the persisted reservation). */
export function studentsToCsv(students: Student[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const s of students) {
    const row = [
      String(s.attendanceNo),
      s.name,
      s.gender,
      s.reservedSeat == null ? "" : String(s.reservedSeat),
    ];
    lines.push(row.map(escapeField).join(","));
  }
  return lines.join("\r\n");
}

/** Minimal CSV line splitter handling quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

/** Serialize the seat grid size and per-seat configuration to CSV. */
export function seatConfigToCsv(grid: Grid, configs: SeatConfig[]): string {
  const lines = [
    SEAT_GRID_CSV_HEADER.join(","),
    [String(grid.cols), String(grid.rows)].join(","),
    "",
    SEAT_CONFIG_CSV_HEADER.join(","),
  ];
  configs.forEach((c, i) => {
    lines.push(
      [String(i + 1), c.kind, c.priority ? "true" : "false"].join(","),
    );
  });
  return lines.join("\r\n");
}

export interface SeatConfigParseResult {
  grid: Grid | null;
  configs: SeatConfig[];
  errors: string[];
}

function parseSeatInt(raw: string): number | null {
  const t = raw.trim();
  if (!/^[0-9]+$/.test(t)) return null;
  return parseInt(t, 10);
}

/** Parse seat grid + seat configuration CSV text (as produced by seatConfigToCsv). */
export function parseSeatConfigCsv(text: string): SeatConfigParseResult {
  const normalized = text
    .replace(/^﻿/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  const errors: string[] = [];

  let i = 0;
  while (i < rawLines.length && rawLines[i].trim() === "") i++;
  if (i >= rawLines.length) {
    return { grid: null, configs: [], errors: ["CSVが空です。"] };
  }

  let grid: Grid | null = null;
  const gridHeader = splitCsvLine(rawLines[i]).map((c) => c.trim());
  if (
    gridHeader[0] === SEAT_GRID_CSV_HEADER[0] &&
    gridHeader[1] === SEAT_GRID_CSV_HEADER[1]
  ) {
    i++;
    if (i < rawLines.length) {
      const cols = splitCsvLine(rawLines[i]).map((c) => c.trim());
      i++;
      const c = parseSeatInt(cols[0] ?? "");
      const r = parseSeatInt(cols[1] ?? "");
      if (c != null && r != null && c >= 1 && c <= 8 && r >= 1 && r <= 8) {
        grid = { cols: c, rows: r };
      } else {
        errors.push("縦列数・横行数は1〜8の半角数字で設定してください。");
      }
    }
  } else {
    errors.push("座席数の見出し行が見つかりません。");
  }

  while (i < rawLines.length && rawLines[i].trim() === "") i++;

  if (i < rawLines.length) {
    const header = splitCsvLine(rawLines[i]).map((c) => c.trim());
    if (header[0] === SEAT_CONFIG_CSV_HEADER[0]) i++;
  }

  const configs: SeatConfig[] = [];
  for (; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (line.trim() === "") continue;
    const cols = splitCsvLine(line);
    const seatNoRaw = (cols[0] ?? "").trim();
    const kindRaw = (cols[1] ?? "").trim();
    const priorityRaw = (cols[2] ?? "").trim();

    const seatNo = parseSeatInt(seatNoRaw);
    if (seatNo == null) {
      errors.push(`座席番号「${seatNoRaw}」が不正です。`);
      continue;
    }
    if (!SEAT_KINDS.includes(kindRaw as SeatKind)) {
      errors.push(`座席番号 ${seatNo}: 種類「${kindRaw}」は不正です。`);
      continue;
    }
    configs[seatNo - 1] = {
      kind: kindRaw as SeatKind,
      priority: /^(true|1)$/i.test(priorityRaw),
    };
  }
  for (let j = 0; j < configs.length; j++) {
    if (!configs[j]) configs[j] = { kind: "none", priority: false };
  }

  return { grid, configs, errors };
}

export interface ParseResult {
  students: Student[];
  errors: RowError[];
}

/** Half-width integer check */
function parseHalfWidthInt(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  if (!/^[0-9]+$/.test(t)) return NaN as unknown as number;
  return parseInt(t, 10);
}

/**
 * Parse CSV text into students with validation.
 * Errors collected per the spec's 生徒データの属性.
 */
export function parseCsv(text: string): ParseResult {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const rawLines = normalized
    .split("\n")
    .filter((l, idx) => !(idx > 0 && l.trim() === ""));
  if (rawLines.length === 0) {
    return {
      students: [],
      errors: [{ attendanceNo: null, message: "CSVが空です。" }],
    };
  }

  // Drop header if it matches.
  let startIdx = 0;
  const first = splitCsvLine(rawLines[0]).map((c) => c.trim());
  if (first[0] === CSV_HEADER[0] && first[1] === CSV_HEADER[1]) {
    startIdx = 1;
  }

  const students: Student[] = [];
  const errors: RowError[] = [];
  const seenAttendance = new Set<number>();
  const seenReserved = new Set<number>();

  for (let i = startIdx; i < rawLines.length; i++) {
    const cols = splitCsvLine(rawLines[i]);
    if (cols.every((c) => c.trim() === "")) continue;

    const attRaw = (cols[0] ?? "").trim();
    const name = (cols[1] ?? "").trim();
    const genderRaw = (cols[2] ?? "").trim();
    const reservedRaw = (cols[3] ?? "").trim();

    // 出席番号
    const att = parseHalfWidthInt(attRaw);
    let attValid = true;
    if (att == null || Number.isNaN(att) || seenAttendance.has(att)) {
      attValid = false;
      errors.push({
        attendanceNo: att && !Number.isNaN(att) ? att : null,
        message: "出席番号は重複のない半角数字を設定してください。",
      });
    } else {
      seenAttendance.add(att);
    }

    // 性別
    let gender: Gender = "男";
    if (genderRaw === "男" || genderRaw === "女") {
      gender = genderRaw;
    } else {
      errors.push({
        attendanceNo: att && !Number.isNaN(att) ? att : null,
        message: "性別は「男」または「女」を設定してください。",
      });
    }

    // 予約座席番号
    let reserved: number | null = null;
    const r = parseHalfWidthInt(reservedRaw);
    if (reservedRaw === "") {
      reserved = null;
    } else if (r == null || Number.isNaN(r) || seenReserved.has(r)) {
      errors.push({
        attendanceNo: att && !Number.isNaN(att) ? att : null,
        message:
          "予約座席番号は重複のない半角数字、または未入力にしてください。",
      });
    } else {
      reserved = r;
      seenReserved.add(r);
    }

    if (attValid) {
      students.push({
        attendanceNo: att as number,
        name,
        gender,
        reservedSeat: reserved,
        assignedSeat: null,
      });
    }
  }

  return { students, errors };
}

/** Validate an already-structured student list (e.g. edited in a table). */
export function validateStudents(students: Student[]): RowError[] {
  const errors: RowError[] = [];
  const seenAttendance = new Set<number>();
  const seenReserved = new Set<number>();
  for (const s of students) {
    if (seenAttendance.has(s.attendanceNo)) {
      errors.push({
        attendanceNo: s.attendanceNo,
        message: "出席番号は重複のない半角数字を設定してください。",
      });
    } else {
      seenAttendance.add(s.attendanceNo);
    }

    if (s.reservedSeat != null) {
      if (seenReserved.has(s.reservedSeat)) {
        errors.push({
          attendanceNo: s.attendanceNo,
          message:
            "予約座席番号は重複のない半角数字、または未入力にしてください。",
        });
      } else {
        seenReserved.add(s.reservedSeat);
      }
    }
  }
  return errors;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
