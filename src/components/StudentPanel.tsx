"use client";

import { useRef } from "react";
import { useApp } from "@/context/AppContext";
import {
  buildTemplateStudents,
  studentsToCsv,
  parseCsv,
  downloadCsv,
} from "@/lib/csv";

interface StudentPanelProps {
  /** start lottery for a student */
  onLottery: (attendanceNo: number) => void;
  /** enter manual assign mode for a student */
  onAssign: (attendanceNo: number) => void;
  /** attendanceNo currently in assign mode (highlight) */
  assigningNo: number | null;
  /** disable buttons while a lottery animation runs */
  busy: boolean;
}

export default function StudentPanel({
  onLottery,
  onAssign,
  assigningNo,
  busy,
}: StudentPanelProps) {
  const { students, errors, setData, clearSeat } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleTemplate() {
    const csv = studentsToCsv(buildTemplateStudents());
    downloadCsv("students_template.csv", csv);
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const { students: parsed, errors: errs } = parseCsv(text);
      setData(parsed, errs);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 p-3">
        <button
          onClick={handleTemplate}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          テンプレート出力
        </button>
        <button
          onClick={handleImportClick}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          インポート
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {/* error list */}
      {errors.length > 0 && (
        <div className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="mb-1 font-semibold">データの不整合があります</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {errors.map((er, i) => (
              <li key={i}>
                {er.attendanceNo != null ? `出席番号 ${er.attendanceNo}: ` : ""}
                {er.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        {students.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-gray-500">
            生徒一覧のcsvをインポートしてください。
          </p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="w-12 py-1.5">番号</th>
                <th className="py-1.5">名前</th>
                <th className="w-12 py-1.5">座席</th>
                <th className="w-[120px] py-1.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const seated = s.assignedSeat != null;
                const isAssigning = assigningNo === s.attendanceNo;
                return (
                  <tr
                    key={s.attendanceNo}
                    className={[
                      "border-b border-gray-100",
                      isAssigning ? "bg-yellow-50" : "",
                    ].join(" ")}
                  >
                    <td className="py-1.5 align-middle">{s.attendanceNo}</td>
                    <td
                      className="ellipsis py-1.5 align-middle pr-2"
                      title={s.name}
                    >
                      {s.name}
                      <span className="ml-1 text-xs text-gray-400">
                        ({s.gender})
                      </span>
                    </td>
                    <td className="py-1.5 align-middle">
                      {seated ? `No.${s.assignedSeat}` : "-"}
                    </td>
                    <td className="py-1.5 align-middle">
                      <div className="flex gap-1">
                        <button
                          onClick={() => onLottery(s.attendanceNo)}
                          disabled={seated || busy}
                          title="抽選"
                          className="rounded bg-indigo-600 px-1.5 py-1 text-xs text-white hover:bg-indigo-700 disabled:opacity-30"
                        >
                          抽選
                        </button>
                        <button
                          onClick={() => onAssign(s.attendanceNo)}
                          disabled={seated || busy}
                          title="指定"
                          className={[
                            "rounded px-1.5 py-1 text-xs text-white disabled:opacity-30",
                            isAssigning
                              ? "bg-amber-500 hover:bg-amber-600"
                              : "bg-teal-600 hover:bg-teal-700",
                          ].join(" ")}
                        >
                          指定
                        </button>
                        <button
                          onClick={() => clearSeat(s.attendanceNo)}
                          disabled={!seated || busy}
                          title="取消"
                          className="rounded bg-rose-600 px-1.5 py-1 text-xs text-white hover:bg-rose-700 disabled:opacity-30"
                        >
                          取消
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
