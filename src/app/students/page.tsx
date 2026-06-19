"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import Header from "@/components/Header";
import { Gender, RowError, Student } from "@/lib/types";
import {
  buildTemplateStudents,
  downloadCsv,
  parseCsv,
  studentsToCsv,
  validateStudents,
} from "@/lib/csv";

export default function StudentsEditPage() {
  const router = useRouter();
  const { students, setData } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Student[]>(() =>
    renumber(students.length > 0 ? students : buildTemplateStudents()),
  );
  const [errors, setErrors] = useState<RowError[]>([]);
  const [bulkCount, setBulkCount] = useState("");

  function renumber(list: Student[]): Student[] {
    return list.map((s, i) => ({ ...s, attendanceNo: i + 1 }));
  }

  function updateRow(index: number, patch: Partial<Student>) {
    setDraft((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function handleAddRow() {
    setDraft((prev) =>
      renumber([
        ...prev,
        {
          attendanceNo: 0,
          name: "",
          gender: "男",
          reservedSeat: null,
          assignedSeat: null,
        },
      ]),
    );
  }

  function handleDeleteRow(index: number) {
    setDraft((prev) => renumber(prev.filter((_, i) => i !== index)));
  }

  function handleBulkChange() {
    const count = parseInt(bulkCount, 10);
    if (!Number.isInteger(count) || count < 1) return;
    setDraft(renumber(buildTemplateStudents(count)));
  }

  function handleInsertRow(index: number) {
    setDraft((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, {
        attendanceNo: 0,
        name: "",
        gender: "男",
        reservedSeat: null,
        assignedSeat: null,
      });
      return renumber(next);
    });
  }

  function handleExport() {
    downloadCsv("students.csv", studentsToCsv(draft));
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
      setDraft(renumber(parsed));
      setErrors(errs);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }

  function handleBack() {
    router.push("/");
  }

  function handleComplete() {
    const errs = validateStudents(draft);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setData(draft, errs);
    router.push("/");
  }

  return (
    <div className="flex h-screen flex-col">
      <Header />

      <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-50 lg:hidden">
        <p className="text-sm font-medium text-gray-600">
          PCで利用してください。
        </p>
      </div>

      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        <div className="px-3 pt-3">
          <h2 className="text-base font-semibold text-gray-800">
            生徒一覧編集
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-gray-200 p-3">
          <button
            onClick={handleBack}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            戻る
          </button>
          <button
            onClick={handleExport}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            エクスポート
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
          <button
            onClick={handleAddRow}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            行を追加
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={bulkCount}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^[0-9]+$/.test(v)) setBulkCount(v);
            }}
            placeholder="人数"
            className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm ml-8"
          />
          <button
            onClick={handleBulkChange}
            disabled={!/^[1-9][0-9]*$/.test(bulkCount)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            人に一括変更
          </button>
          <button
            onClick={handleComplete}
            className="ml-auto rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            編集完了
          </button>
        </div>

        {errors.length > 0 && (
          <div className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="mb-1 font-semibold">データの不整合があります</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {errors.map((er, i) => (
                <li key={i}>
                  {er.attendanceNo != null
                    ? `出席番号 ${er.attendanceNo}: `
                    : ""}
                  {er.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <table className="table-fixed text-sm mx-auto">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="w-24 py-1.5">出席番号</th>
                <th className="w-[120px] py-1.5">名前</th>
                <th className="w-24 py-1.5">性別</th>
                <th className="w-32 py-1.5">予約座席番号</th>
                <th className="w-28 py-1.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {draft.map((s, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 align-middle pr-2">{s.attendanceNo}</td>
                  <td className="py-1.5 align-middle pr-2">
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="py-1.5 align-middle pr-2">
                    <select
                      value={s.gender}
                      onChange={(e) =>
                        updateRow(i, { gender: e.target.value as Gender })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    >
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </td>
                  <td className="py-1.5 align-middle pr-2">
                    <input
                      type="number"
                      value={s.reservedSeat ?? ""}
                      onChange={(e) =>
                        updateRow(i, {
                          reservedSeat:
                            e.target.value === ""
                              ? null
                              : parseInt(e.target.value, 10) || null,
                        })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="py-1.5 align-middle">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleInsertRow(i)}
                        title="この下に行を追加"
                        className="rounded bg-sky-600 px-1.5 py-1 text-xs text-white hover:bg-sky-700"
                      >
                        追加
                      </button>
                      <button
                        onClick={() => handleDeleteRow(i)}
                        title="削除"
                        className="rounded bg-rose-600 px-1.5 py-1 text-xs text-white hover:bg-rose-700"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
