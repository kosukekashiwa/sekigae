"use client";

import { useApp } from "@/context/AppContext";
import {
  buildSeatViews,
  occupiedSeatSet,
  reservedByOthers,
} from "@/lib/seating";
import { RadioKind } from "@/lib/types";
import SeatTile from "./SeatTile";

interface SeatGridProps {
  /** seat numbers currently blinking during lottery */
  blinkingSeats: Set<number>;
  /** mode controls what a seat click does */
  mode: "view" | "config" | "assign";
  /** active radio kind in config mode */
  configKind?: RadioKind;
  /** in assign mode, the student awaiting a seat */
  onAssignSeat?: (seatNo: number) => void;
  /** attendance no of the student being manually assigned (assign mode) */
  assigningNo?: number | null;
}

export default function SeatGrid({
  blinkingSeats,
  mode,
  configKind,
  onAssignSeat,
  assigningNo,
}: SeatGridProps) {
  const { configs, students, grid, setSeatConfig, clearSeatByNo } = useApp();
  const views = buildSeatViews(configs, students, grid);
  const occupied = occupiedSeatSet(students);
  // Seats reserved by students other than the one being assigned must stay
  // available for their owners and cannot be picked manually.
  const blocked =
    mode === "assign" && assigningNo != null
      ? reservedByOthers(students, assigningNo)
      : new Set<number>();

  function handleSeatClick(seatNo: number) {
    if (mode === "config" && configKind) {
      applyConfig(seatNo, configKind);
    } else if (mode === "assign" && onAssignSeat) {
      const view = views[seatNo - 1];
      if (view.config.kind === "disabled") return;
      if (occupied.has(seatNo)) return;
      if (blocked.has(seatNo)) return;
      onAssignSeat(seatNo);
    }
  }

  function applyConfig(seatNo: number, kind: RadioKind) {
    setSeatConfig(seatNo, (c) => {
      if (kind === "priority") {
        // toggle priority; allowed to combine with male/female/none
        return { ...c, priority: !c.priority };
      }
      if (kind === "none") {
        return { ...c, kind: "none" };
      }
      if (kind === "disabled") {
        // disabled cannot coexist with priority per spec (priority only with male/female/none)
        return { kind: "disabled", priority: false };
      }
      // male / female: exclusive among male/female/disabled, keeps priority
      return { ...c, kind };
    });
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
      {/* Blackboard */}
      <div className="mx-auto mb-4 flex h-12 w-3/4 shrink-0 items-center justify-center rounded-md border-4 border-amber-900/40 bg-[var(--chalk-board)] text-lg font-semibold tracking-widest text-white shadow-inner">
        黒板
      </div>

      <div
        className="grid min-h-0 flex-1 gap-2"
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
        }}
      >
        {views.map((view) => {
          const clickable =
            mode === "config" ||
            (mode === "assign" &&
              view.config.kind !== "disabled" &&
              !occupied.has(view.seatNo) &&
              !blocked.has(view.seatNo));
          return (
            <SeatTile
              key={view.seatNo}
              view={view}
              blinking={blinkingSeats.has(view.seatNo)}
              clickable={clickable}
              onClick={() => handleSeatClick(view.seatNo)}
              onClear={
                mode !== "config" && view.occupant
                  ? () => clearSeatByNo(view.seatNo)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
