"use client";

import { useCallback, useRef, useState } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import StudentPanel from "@/components/StudentPanel";
import ConfigPanel from "@/components/ConfigPanel";
import SeatGrid from "@/components/SeatGrid";
import {
  buildSeatViews,
  occupiedSeatSet,
  lotteryCandidates,
  resolveFinalSeat,
  reservedByOthers,
} from "@/lib/seating";
import { RadioKind } from "@/lib/types";

type Tab = "students" | "config";

function Workspace() {
  const { students, configs, grid, assignSeat } = useApp();

  const [tab, setTab] = useState<Tab>("students");
  const [configKind, setConfigKind] = useState<RadioKind>("none");
  const [assigningNo, setAssigningNo] = useState<number | null>(null);
  const [blinking, setBlinking] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const handleLottery = useCallback(
    (attendanceNo: number) => {
      if (busy) return;
      const student = students.find((s) => s.attendanceNo === attendanceNo);
      if (!student) return;

      const views = buildSeatViews(configs, students, grid);
      const occupied = occupiedSeatSet(students);
      // Seats reserved by other students are held for their owners and must
      // never be lotteried to this student.
      const blocked = reservedByOthers(students, attendanceNo);

      // Determine the final seat (reservation overrides; else random candidate).
      const finalSeat = resolveFinalSeat(
        student,
        views,
        occupied,
        Math.random,
        students,
      );
      if (finalSeat == null) {
        window.alert("空いている座席がありません。");
        return;
      }

      // Blinking set: per spec, mirrors the candidate rules and ignores
      // this student's own reservation, but still excludes seats held for
      // other students.
      const blinkPool = lotteryCandidates(student, views, occupied, blocked);
      if (blinkPool.length === 0) {
        // No pool to animate (e.g. only the reserved seat is free) — assign directly.
        assignSeat(attendanceNo, finalSeat);
        return;
      }

      setBusy(true);
      setAssigningNo(null);

      const totalMs = 1600;
      const stepMs = 90;
      const steps = Math.floor(totalMs / stepMs);
      let i = 0;

      const tick = () => {
        const idx = Math.floor(Math.random() * blinkPool.length);
        setBlinking(new Set([blinkPool[idx]]));
        i++;
        if (i < steps) {
          const t = window.setTimeout(tick, stepMs);
          timers.current.push(t);
        } else {
          // settle
          const t = window.setTimeout(() => {
            setBlinking(new Set());
            assignSeat(attendanceNo, finalSeat);
            setBusy(false);
            clearTimers();
          }, stepMs);
          timers.current.push(t);
        }
      };
      tick();
    },
    [busy, students, configs, grid, assignSeat],
  );

  const handleAssign = useCallback((attendanceNo: number) => {
    setAssigningNo((prev) => (prev === attendanceNo ? null : attendanceNo));
  }, []);

  const handleAssignSeat = useCallback(
    (seatNo: number) => {
      if (assigningNo == null) return;
      assignSeat(assigningNo, seatNo);
      setAssigningNo(null);
    },
    [assigningNo, assignSeat],
  );

  const mode: "view" | "config" | "assign" =
    tab === "config" ? "config" : assigningNo != null ? "assign" : "view";

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-2 bg-indigo-700 px-5 text-white shadow">
        <span className="text-xl">🪑</span>
        <h1 className="text-lg font-bold tracking-wide">席替えアプリ</h1>
        {assigningNo != null && (
          <span className="ml-4 rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-900">
            指定モード: 空席をクリックしてください
          </span>
        )}
      </header>

      {/* Unsupported viewport notice (screen-size based, not user-agent based) */}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-50 lg:hidden">
        <p className="text-sm font-medium text-gray-600">
          PCで利用してください。
        </p>
      </div>

      <div className="hidden min-h-0 flex-1 lg:flex">
        {/* Sidebar */}
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="flex shrink-0 border-b border-gray-200">
            <button
              onClick={() => setTab("students")}
              className={[
                "flex-1 py-3 text-sm font-medium",
                tab === "students"
                  ? "border-b-2 border-indigo-600 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              生徒一覧
            </button>
            <button
              onClick={() => {
                setTab("config");
                setAssigningNo(null);
              }}
              className={[
                "flex-1 py-3 text-sm font-medium",
                tab === "config"
                  ? "border-b-2 border-indigo-600 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              座席設定
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {tab === "students" ? (
              <StudentPanel
                onLottery={handleLottery}
                onAssign={handleAssign}
                assigningNo={assigningNo}
                busy={busy}
              />
            ) : (
              <ConfigPanel
                selectedKind={configKind}
                onSelectKind={setConfigKind}
              />
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 overflow-auto bg-gray-50 p-6">
          <SeatGrid
            blinkingSeats={blinking}
            mode={mode}
            configKind={configKind}
            onAssignSeat={handleAssignSeat}
            assigningNo={assigningNo}
          />
        </main>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <Workspace />
    </AppProvider>
  );
}
