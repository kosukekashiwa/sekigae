import { Student, Gender, RowError } from "./types";

export const CSV_HEADER = ["出席番号", "名前", "性別", "予約座席番号"];

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
