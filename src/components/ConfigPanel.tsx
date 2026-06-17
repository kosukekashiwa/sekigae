"use client";

import { useApp } from "@/context/AppContext";
import { RadioKind } from "@/lib/types";

interface ConfigPanelProps {
  selectedKind: RadioKind;
  onSelectKind: (k: RadioKind) => void;
}

const KIND_OPTIONS: { value: RadioKind; label: string; swatch: string }[] = [
  { value: "none", label: "指定なし", swatch: "bg-amber-100 border-amber-300" },
  { value: "male", label: "男子席", swatch: "bg-blue-100 border-blue-300" },
  { value: "female", label: "女子席", swatch: "bg-rose-100 border-rose-300" },
  {
    value: "disabled",
    label: "使用不可",
    swatch: "bg-gray-300 border-gray-400",
  },
  { value: "priority", label: "優先席", swatch: "bg-white border-green-400" },
];

export default function ConfigPanel({
  selectedKind,
  onSelectKind,
}: ConfigPanelProps) {
  const { grid, setGrid, resetSeatConfigs } = useApp();

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">座席数</h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm">
            縦列
            <input
              type="number"
              min={1}
              max={8}
              value={grid.cols}
              onChange={(e) =>
                setGrid({ ...grid, cols: Number(e.target.value) || 1 })
              }
              className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-1 text-sm">
            横行
            <input
              type="number"
              min={1}
              max={8}
              value={grid.rows}
              onChange={(e) =>
                setGrid({ ...grid, rows: Number(e.target.value) || 1 })
              }
              className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-400">1〜8の範囲で設定できます。</p>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">座席の種類</h3>
        <p className="mb-2 text-xs text-gray-500">
          種類を選んでから、右の座席をクリックして設定します。優先席は男子席・女子席・指定なしと重ねられます。
        </p>
        <div className="space-y-1.5">
          {KIND_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                selectedKind === opt.value
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              <input
                type="radio"
                name="seatKind"
                value={opt.value}
                checked={selectedKind === opt.value}
                onChange={() => onSelectKind(opt.value)}
              />
              <span
                className={[
                  "inline-flex h-5 w-5 items-center justify-center rounded border",
                  opt.swatch,
                ].join(" ")}
              >
                {opt.value === "priority" && (
                  <span className="text-xs text-green-600">★</span>
                )}
                {opt.value === "disabled" && (
                  <span className="text-xs text-gray-500">×</span>
                )}
              </span>
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <button
          type="button"
          onClick={resetSeatConfigs}
          className="w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
        >
          座席状態リセット
        </button>
        <p className="mt-1 text-xs text-gray-400">
          全ての座席を「指定なし」にし、優先席の設定を外します。
        </p>
      </section>
    </div>
  );
}
