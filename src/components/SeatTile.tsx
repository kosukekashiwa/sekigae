"use client";

import type React from "react";
import { SeatView } from "@/lib/seating";

interface SeatTileProps {
  view: SeatView;
  blinking: boolean;
  /** click handler for the seat body (used in 設定 and 指定 modes) */
  onClick?: () => void;
  /** click handler for the × button to clear occupant */
  onClear?: () => void;
  clickable?: boolean;
}

function baseClasses(view: SeatView): string {
  const { kind } = view.config;
  if (kind === "disabled") return "bg-gray-300 border-gray-400 text-gray-500";
  if (kind === "male") return "bg-blue-100 border-blue-300 text-blue-900";
  if (kind === "female") return "bg-rose-100 border-rose-300 text-rose-900";
  return "bg-amber-50 border-amber-200 text-amber-900";
}

export default function SeatTile({
  view,
  blinking,
  onClick,
  onClear,
  clickable,
}: SeatTileProps) {
  const disabled = view.config.kind === "disabled";
  const occupant = view.occupant;

  return (
    <div
      className={[
        "relative aspect-[4/3] w-full rounded-md border-2 transition",
        baseClasses(view),
        blinking ? "seat-blink z-10" : "",
      ].join(" ")}
    >
      {/* seat body — handles config / assign clicks */}
      <button
        type="button"
        onClick={onClick}
        disabled={!clickable}
        aria-label={`座席 No.${view.seatNo}`}
        className={[
          "block h-full w-full rounded-[4px] p-1.5 text-left",
          clickable
            ? "cursor-pointer hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            : "cursor-default",
        ].join(" ")}
      >
        {disabled ? (
          <div className="flex h-full items-center justify-center text-2xl text-gray-500">
            ×
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <span className="text-[10px] font-semibold opacity-70">
              No.{view.seatNo}
              {view.config.priority && (
                <span
                  className="ml-1 text-green-600"
                  aria-label="優先席"
                  title="優先席"
                >
                  ★
                </span>
              )}
            </span>
            <span className="ellipsis mt-auto text-sm font-medium">
              {occupant ? occupant.name : "\u00A0"}
            </span>
          </div>
        )}
      </button>

      {/* × clear button — sibling of the body so it works in any mode */}
      {!disabled && occupant && onClear && (
        <button
          type="button"
          aria-label={`${occupant.name} の座席を取消`}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute right-0.5 top-0.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-xs text-gray-600 shadow hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          ×
        </button>
      )}
    </div>
  );
}
