import { SeatConfig, Student, Grid } from "./types";

export function totalSeats(grid: Grid): number {
  return grid.cols * grid.rows;
}

/** seat numbers are 1-based indices into the flattened grid. */
export function ensureConfigLength(
  configs: SeatConfig[],
  grid: Grid,
): SeatConfig[] {
  const n = totalSeats(grid);
  const out = configs.slice(0, n);
  while (out.length < n) {
    out.push({ kind: "none", priority: false });
  }
  return out;
}

/** Seat is occupied if some student has assignedSeat === seatNo */
export function occupiedSeatSet(students: Student[]): Set<number> {
  const s = new Set<number>();
  for (const st of students) {
    if (st.assignedSeat != null) s.add(st.assignedSeat);
  }
  return s;
}

export interface SeatView {
  seatNo: number; // 1-based
  config: SeatConfig;
  occupant: Student | null;
}

export function buildSeatViews(
  configs: SeatConfig[],
  students: Student[],
  grid: Grid,
): SeatView[] {
  const cfgs = ensureConfigLength(configs, grid);
  const bySeat = new Map<number, Student>();
  for (const st of students) {
    if (st.assignedSeat != null) bySeat.set(st.assignedSeat, st);
  }
  const views: SeatView[] = [];
  for (let i = 0; i < cfgs.length; i++) {
    const seatNo = i + 1;
    views.push({
      seatNo,
      config: cfgs[i],
      occupant: bySeat.get(seatNo) ?? null,
    });
  }
  return views;
}

/** A seat is selectable for assignment if it is not disabled and not occupied. */
function isFree(view: SeatView, occupied: Set<number>): boolean {
  if (view.config.kind === "disabled") return false;
  return !occupied.has(view.seatNo);
}

/**
 * Seat numbers reserved by students OTHER than `exceptAttendanceNo`.
 * These seats must be held for their owners and never lotteried to anyone
 * else. A reserved seat that is already occupied by its owner is naturally
 * excluded by the occupied check, so we only need the reservation here.
 */
export function reservedByOthers(
  students: Student[],
  exceptAttendanceNo: number,
): Set<number> {
  const s = new Set<number>();
  for (const st of students) {
    if (st.attendanceNo === exceptAttendanceNo) continue;
    if (st.reservedSeat != null) s.add(st.reservedSeat);
  }
  return s;
}

/**
 * Determine the candidate seat numbers a student may be lotteried into,
 * following the spec priority order:
 *  1. priority seats with space -> from those
 *  2. male student & male seats with space -> from those
 *  3. female student & female seats with space -> from those
 *  4. otherwise -> any free, non-disabled seat
 *
 * Note: per the spec the blinking set mirrors these candidate rules.
 * Reservation overrides the final result (handled separately) but does
 * not affect blinking.
 *
 * `blockedSeats` are seat numbers reserved by OTHER students; they are
 * never offered to this student so each reservation is held for its owner.
 */
export function lotteryCandidates(
  student: Student,
  views: SeatView[],
  occupied: Set<number>,
  blockedSeats: Set<number> = new Set(),
): number[] {
  const free = views.filter(
    (v) => isFree(v, occupied) && !blockedSeats.has(v.seatNo),
  );

  const priorityFree = free.filter((v) => v.config.priority);
  if (priorityFree.length > 0) {
    // A priority seat that also carries a gender kind (男子席/女子席) is only
    // valid for a matching student. Priority seats with kind "none" are open
    // to anyone. Pick the gender-compatible priority seats.
    const genderOk = priorityFree.filter((v) => {
      if (v.config.kind === "male") return student.gender === "男";
      if (v.config.kind === "female") return student.gender === "女";
      return true; // "none" priority seat: open to all
    });
    if (genderOk.length > 0) {
      return genderOk.map((v) => v.seatNo);
    }
    // No gender-compatible priority seat — fall through to the normal rules
    // below rather than forcing a mismatched priority seat.
  }

  if (student.gender === "男") {
    const maleFree = free.filter((v) => v.config.kind === "male");
    if (maleFree.length > 0) return maleFree.map((v) => v.seatNo);
  } else {
    const femaleFree = free.filter((v) => v.config.kind === "female");
    if (femaleFree.length > 0) return femaleFree.map((v) => v.seatNo);
  }

  // fallback: any free seat that is not gender-mismatched is allowed;
  // "指定なし" and priority seats are general. Male student should not
  // land on a female-only seat and vice versa when general seats exist.
  const general = free.filter((v) => v.config.kind === "none");
  if (general.length > 0) return general.map((v) => v.seatNo);

  // last resort: any free seat at all
  return free.map((v) => v.seatNo);
}

/**
 * Resolve the FINAL seat for a student.
 * - If reservedSeat is set AND free -> that seat.
 * - Else -> random among lotteryCandidates, excluding seats reserved by
 *   other students so each reservation is held for its owner.
 * Returns null if nothing available.
 */
export function resolveFinalSeat(
  student: Student,
  views: SeatView[],
  occupied: Set<number>,
  rng: () => number = Math.random,
  allStudents: Student[] = [],
): number | null {
  if (student.reservedSeat != null) {
    const view = views.find((v) => v.seatNo === student.reservedSeat);
    if (view && view.config.kind !== "disabled" && !occupied.has(view.seatNo)) {
      return student.reservedSeat;
    }
  }
  const blocked = reservedByOthers(allStudents, student.attendanceNo);
  const candidates = lotteryCandidates(student, views, occupied, blocked);
  if (candidates.length === 0) return null;
  const idx = Math.floor(rng() * candidates.length);
  return candidates[idx];
}
