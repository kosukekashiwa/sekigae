"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import { Student, SeatConfig, Grid, RowError } from "@/lib/types";
import { ensureConfigLength } from "@/lib/seating";

interface AppState {
  students: Student[];
  errors: RowError[];
  configs: SeatConfig[];
  grid: Grid;

  setData: (students: Student[], errors: RowError[]) => void;
  setGrid: (grid: Grid) => void;
  setSeatConfig: (
    seatNo: number,
    updater: (c: SeatConfig) => SeatConfig,
  ) => void;
  assignSeat: (attendanceNo: number, seatNo: number) => void;
  clearSeat: (attendanceNo: number) => void;
  clearSeatByNo: (seatNo: number) => void;
}

const Ctx = createContext<AppState | null>(null);

const DEFAULT_GRID: Grid = { cols: 6, rows: 6 };

function makeDefaultConfigs(grid: Grid): SeatConfig[] {
  return ensureConfigLength([], grid);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [grid, setGridState] = useState<Grid>(DEFAULT_GRID);
  const [configs, setConfigs] = useState<SeatConfig[]>(() =>
    makeDefaultConfigs(DEFAULT_GRID),
  );

  const setData = useCallback((s: Student[], e: RowError[]) => {
    setStudents(s);
    setErrors(e);
  }, []);

  const setGrid = useCallback((g: Grid) => {
    const clamped: Grid = {
      cols: Math.min(8, Math.max(1, g.cols)),
      rows: Math.min(8, Math.max(1, g.rows)),
    };
    setGridState(clamped);
    setConfigs((prev) => ensureConfigLength(prev, clamped));
    // Clear assignments that fall outside the new grid.
    const max = clamped.cols * clamped.rows;
    setStudents((prev) =>
      prev.map((st) =>
        st.assignedSeat != null && st.assignedSeat > max
          ? { ...st, assignedSeat: null }
          : st,
      ),
    );
  }, []);

  const setSeatConfig = useCallback(
    (seatNo: number, updater: (c: SeatConfig) => SeatConfig) => {
      setConfigs((prev) => {
        const next = ensureConfigLength(prev, grid).slice();
        const idx = seatNo - 1;
        if (idx < 0 || idx >= next.length) return prev;
        const updated = updater(next[idx]);
        next[idx] = updated;
        // If the seat became disabled, evict its occupant.
        if (updated.kind === "disabled") {
          setStudents((sPrev) =>
            sPrev.map((st) =>
              st.assignedSeat === seatNo ? { ...st, assignedSeat: null } : st,
            ),
          );
        }
        return next;
      });
    },
    [grid],
  );

  const assignSeat = useCallback((attendanceNo: number, seatNo: number) => {
    setStudents((prev) => {
      // Don't allow double-booking.
      if (prev.some((s) => s.assignedSeat === seatNo)) return prev;
      return prev.map((s) =>
        s.attendanceNo === attendanceNo ? { ...s, assignedSeat: seatNo } : s,
      );
    });
  }, []);

  const clearSeat = useCallback((attendanceNo: number) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.attendanceNo === attendanceNo ? { ...s, assignedSeat: null } : s,
      ),
    );
  }, []);

  const clearSeatByNo = useCallback((seatNo: number) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.assignedSeat === seatNo ? { ...s, assignedSeat: null } : s,
      ),
    );
  }, []);

  const value = useMemo<AppState>(
    () => ({
      students,
      errors,
      configs: ensureConfigLength(configs, grid),
      grid,
      setData,
      setGrid,
      setSeatConfig,
      assignSeat,
      clearSeat,
      clearSeatByNo,
    }),
    [
      students,
      errors,
      configs,
      grid,
      setData,
      setGrid,
      setSeatConfig,
      assignSeat,
      clearSeat,
      clearSeatByNo,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
