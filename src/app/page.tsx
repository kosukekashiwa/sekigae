"use client";

import {
  useState,
  useCallback,
  useRef,
  ReactNode,
  CSSProperties,
  ChangeEvent,
} from "react";

// ─── 型定義 ──────────────────────────────────────────────
interface Seat {
  id: number;
  row: number;
  col: number;
  disabled: boolean;
  priority: boolean;
}

interface Student {
  no: string;
  name: string;
  seat: number | null;
  reservedSeat: number | null; // 予約座席番号
}

type ActiveSection = "seats" | "students";

// ─── 定数 ──────────────────────────────────────────────
const DEFAULT_ROWS = 5;
const DEFAULT_COLS = 6;

// ─── ユーティリティ ──────────────────────────────────────
function buildSeats(
  rows: number,
  cols: number,
  disabled: Set<number> = new Set(),
  priority: Set<number> = new Set(),
): Seat[] {
  const seats: Seat[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c + 1;
      seats.push({
        id,
        row: r,
        col: c,
        disabled: disabled.has(id),
        priority: priority.has(id),
      });
    }
  }
  return seats;
}

function parseCSV(text: string): Student[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      const [no = "", name = "", , reservedRaw = ""] = cols;
      const reservedNum = parseInt(reservedRaw, 10);
      const reservedSeat =
        !isNaN(reservedNum) && reservedNum > 0 ? reservedNum : null;
      return { no, name, seat: null, reservedSeat };
    })
    .filter((s) => s.no && s.name);
}

function downloadCSV(filename: string, content: string): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── メインアプリ ──────────────────────────────────────
export default function SeatShuffleApp() {
  const [rows, setRows] = useState<number>(DEFAULT_ROWS);
  const [cols, setCols] = useState<number>(DEFAULT_COLS);
  const [disabledSeats, setDisabledSeats] = useState<Set<number>>(new Set());
  const [prioritySeats, setPrioritySeats] = useState<Set<number>>(new Set());
  const [students, setStudents] = useState<Student[]>([]);
  const [activeSection, setActiveSection] = useState<ActiveSection>("seats");
  const [blinkingSeats, setBlinkingSeats] = useState<Set<number>>(new Set());
  const [highlightSeat, setHighlightSeat] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const seats = buildSeats(rows, cols, disabledSeats, prioritySeats);
  const availableSeats = seats.filter((s) => !s.disabled);

  // 座席設定
  const toggleDisabled = (id: number): void => {
    setDisabledSeats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setPrioritySeats((p) => {
          const np = new Set(p);
          np.delete(id);
          return np;
        });
      }
      return next;
    });
  };

  const togglePriority = (id: number): void => {
    if (disabledSeats.has(id)) return;
    setPrioritySeats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 抽選
  const drawSeat = useCallback(
    (studentIdx: number): void => {
      const student = students[studentIdx];
      if (!student || student.seat !== null) return;

      const usedSeats = new Set(
        students.map((s) => s.seat).filter((s): s is number => s !== null),
      );

      // 予約座席が指定されている場合は必ずその席に確定
      if (student.reservedSeat !== null) {
        const reserved = student.reservedSeat;
        const pool = availableSeats.filter((s) => s.id === reserved);

        // 予約席が有効かつ未使用かチェック
        if (pool.length === 0 || usedSeats.has(reserved)) {
          // 予約席が使えない場合はランダム抽選にフォールバック
          runRandomDraw(studentIdx, usedSeats);
          return;
        }

        // 予約席のみで点滅アニメーション → その席に確定
        let count = 0;
        const totalBlinks = 12;
        const interval = setInterval(() => {
          setBlinkingSeats(new Set([reserved]));
          count++;
          if (count >= totalBlinks) {
            clearInterval(interval);
            setBlinkingSeats(new Set());
            setHighlightSeat(reserved);
            setTimeout(() => setHighlightSeat(null), 1500);
            setStudents((prev) =>
              prev.map((s, i) =>
                i === studentIdx ? { ...s, seat: reserved } : s,
              ),
            );
          }
        }, 100);
        return;
      }

      // 予約座席なし → 通常のランダム抽選
      runRandomDraw(studentIdx, usedSeats);
    },
    [students, availableSeats],
  );

  // ランダム抽選の共通処理
  const runRandomDraw = useCallback(
    (studentIdx: number, usedSeats: Set<number>): void => {
      const freePriority = availableSeats.filter(
        (s) => s.priority && !usedSeats.has(s.id),
      );
      const freeNormal = availableSeats.filter(
        (s) => !s.priority && !usedSeats.has(s.id),
      );
      const pool = freePriority.length > 0 ? freePriority : freeNormal;
      if (pool.length === 0) return;

      let count = 0;
      const totalBlinks = 12;
      const interval = setInterval(() => {
        const randomSeat = pool[Math.floor(Math.random() * pool.length)];
        setBlinkingSeats(new Set([randomSeat.id]));
        count++;
        if (count >= totalBlinks) {
          clearInterval(interval);
          const winner = pool[Math.floor(Math.random() * pool.length)];
          setBlinkingSeats(new Set());
          setHighlightSeat(winner.id);
          setTimeout(() => setHighlightSeat(null), 1500);
          setStudents((prev) =>
            prev.map((s, i) =>
              i === studentIdx ? { ...s, seat: winner.id } : s,
            ),
          );
        }
      }, 100);
    },
    [availableSeats],
  );

  const cancelSeat = (studentIdx: number): void => {
    setStudents((prev) =>
      prev.map((s, i) => (i === studentIdx ? { ...s, seat: null } : s)),
    );
  };

  // CSV
  const exportTemplate = (): void => {
    const content =
      "出席番号,名前,予約座席番号\n" +
      "1,生徒A,\n" +
      "2,生徒B,3\n" +
      "3,生徒C,\n" +
      "4,生徒D,\n" +
      "5,生徒E,\n" +
      "6,生徒F,\n" +
      "7,生徒G,\n" +
      "8,生徒H,\n" +
      "9,生徒I,\n" +
      "10,生徒J,\n" +
      "11,生徒K,\n" +
      "12,生徒L,\n" +
      "13,生徒M,\n" +
      "14,生徒N,\n" +
      "15,生徒O,\n" +
      "16,生徒P,\n" +
      "17,生徒Q,\n" +
      "18,生徒R,\n" +
      "19,生徒S,\n" +
      "20,生徒T,\n" +
      "21,生徒U,\n" +
      "22,生徒V,\n" +
      "23,生徒W,\n" +
      "24,生徒X,\n" +
      "25,生徒Y,\n" +
      "26,生徒Z,\n" +
      "27,生徒a,\n" +
      "28,生徒b,\n" +
      "29,生徒c,\n" +
      "30,生徒d,\n" +
      "31,生徒e,\n" +
      "32,生徒f,\n" +
      "33,生徒g,\n" +
      "34,生徒h,\n" +
      "35,生徒i,\n" +
      "36,生徒j,\n" +
      "37,生徒k,\n" +
      "38,生徒l,\n" +
      "39,生徒m,\n" +
      "40,生徒n,\n";
    downloadCSV("生徒一覧テンプレート.csv", content);
  };

  const exportData = (): void => {
    const header = "出席番号,名前,予約座席番号,座席番号\n";
    const body = students
      .map((s) => `${s.no},${s.name},${s.reservedSeat ?? ""},${s.seat ?? ""}`)
      .join("\n");
    const seatConfig =
      `\n座席設定\n行数,${rows}\n列数,${cols}` +
      `\n無効席,"${[...disabledSeats].join("|")}"` +
      `\n優先席,"${[...prioritySeats].join("|")}"`;
    downloadCSV("席替えデータ.csv", header + body + seatConfig);
  };

  const importCSV = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setStudents(parseCSV(result));
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const getStudentForSeat = (seatId: number): Student | undefined =>
    students.find((s) => s.seat === seatId);

  const tabs: { key: ActiveSection; icon: string; label: string }[] = [
    { key: "seats", icon: "⚙️", label: "座席設定" },
    { key: "students", icon: "👤", label: "生徒一覧" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "var(--font-sans)",
        background: "#f8f7f2",
      }}
    >
      {/* ヘッダ */}
      <header
        style={{
          background: "#1a3a5c",
          color: "#fff",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1 }}>🎓</span>
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "#fff",
          }}
        >
          席替えくん
        </h1>
        <span
          style={{
            marginLeft: 8,
            fontSize: 12,
            color: "rgba(255,255,255,0.55)",
            fontWeight: 400,
          }}
        >
          座席抽選システム
        </span>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* サイドメニュー */}
        <aside
          style={{
            width: 300,
            background: "#fff",
            borderRight: "1px solid #e8e4d9",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {/* タブ */}
          <div style={{ display: "flex", borderBottom: "1px solid #e8e4d9" }}>
            {tabs.map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                style={{
                  flex: 1,
                  padding: "12px 8px",
                  border: "none",
                  cursor: "pointer",
                  background: activeSection === key ? "#f0f8ff" : "transparent",
                  borderBottom:
                    activeSection === key
                      ? "2px solid #1a3a5c"
                      : "2px solid transparent",
                  color: activeSection === key ? "#1a3a5c" : "#888",
                  fontWeight: activeSection === key ? 600 : 400,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {activeSection === "seats" ? (
              <SeatSettings
                rows={rows}
                cols={cols}
                setRows={setRows}
                setCols={setCols}
                seats={seats}
                disabledSeats={disabledSeats}
                prioritySeats={prioritySeats}
                toggleDisabled={toggleDisabled}
                togglePriority={togglePriority}
              />
            ) : (
              <StudentPanel
                students={students}
                fileRef={fileRef}
                importCSV={importCSV}
                exportTemplate={exportTemplate}
                exportData={exportData}
                drawSeat={drawSeat}
                cancelSeat={cancelSeat}
                availableCount={availableSeats.length}
                assignedCount={students.filter((s) => s.seat !== null).length}
              />
            )}
          </div>
        </aside>

        {/* メイン：座席表 */}
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "#1a3a5c",
              }}
            >
              座席表
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
              黒板側
            </p>
          </div>

          {/* 黒板 */}
          <div
            style={{
              width: "80%",
              maxWidth: 500,
              height: 48,
              background: "#2d5a3d",
              borderRadius: 4,
              marginBottom: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a8d5b5",
              fontSize: 14,
              letterSpacing: "0.1em",
              fontWeight: 500,
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            黒　板
          </div>

          {/* 座席グリッド */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, minmax(80px, 110px))`,
              gap: 8,
            }}
          >
            {seats.map((seat) => {
              const student = getStudentForSeat(seat.id);
              const isBlinking = blinkingSeats.has(seat.id);
              const isHighlight = highlightSeat === seat.id;

              let bg = "#fff";
              let borderColor = "#d9d4c7";
              let opacity = 1;

              if (seat.disabled) {
                bg = "#f0ede6";
                borderColor = "#c8c3b8";
                opacity = 0.5;
              } else if (isHighlight) {
                bg = "#fff3b0";
                borderColor = "#f0c040";
              } else if (isBlinking) {
                bg = "#dbeeff";
                borderColor = "#4a9fd8";
              } else if (seat.priority && !student) {
                bg = "#fff0f0";
                borderColor = "#f4a0a0";
              } else if (student) {
                bg = "#f0f8ef";
                borderColor = "#7dbf74";
              }

              return (
                <div
                  key={seat.id}
                  style={{
                    background: bg,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: 6,
                    padding: "8px 6px",
                    minHeight: 64,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity,
                    position: "relative",
                    transition: "background 0.12s, border-color 0.12s",
                    boxShadow: isHighlight ? "0 0 0 3px #f0c04066" : "none",
                  }}
                >
                  {seat.priority && !seat.disabled && (
                    <span
                      style={{
                        position: "absolute",
                        top: 3,
                        right: 3,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#e85c5c",
                        display: "block",
                      }}
                      title="優先席"
                    />
                  )}
                  <span
                    style={{ fontSize: 10, color: "#aaa", marginBottom: 2 }}
                  >
                    {seat.disabled ? "×" : `No.${seat.id}`}
                  </span>
                  {!seat.disabled && student && (
                    <>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#5a7d57",
                          fontWeight: 600,
                        }}
                      >
                        {student.no}番
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#2a4a28",
                          fontWeight: 600,
                          textAlign: "center",
                          lineHeight: 1.3,
                          marginTop: 2,
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {student.name}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* 凡例 */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 24,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {(
              [
                ["#fff0f0", "#f4a0a0", "優先席（空き）"],
                ["#f0f8ef", "#7dbf74", "着席済み"],
                ["#f0ede6", "#c8c3b8", "使用不可"],
              ] as [string, string, string][]
            ).map(([bg2, border, label]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "#666",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: bg2,
                    border: `1.5px solid ${border}`,
                  }}
                />
                {label}
              </div>
            ))}
          </div>
        </main>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={importCSV}
      />
    </div>
  );
}

// ─── 座席設定パネル ──────────────────────────────────────
interface SeatSettingsProps {
  rows: number;
  cols: number;
  setRows: (v: number) => void;
  setCols: (v: number) => void;
  seats: Seat[];
  disabledSeats: Set<number>;
  prioritySeats: Set<number>;
  toggleDisabled: (id: number) => void;
  togglePriority: (id: number) => void;
}

function SeatSettings({
  rows,
  cols,
  setRows,
  setCols,
  seats,
  disabledSeats,
  prioritySeats,
  toggleDisabled,
  togglePriority,
}: SeatSettingsProps) {
  return (
    <div>
      <Section title="グリッド設定">
        <Label>行数（縦）</Label>
        <SliderNum value={rows} min={2} max={10} onChange={setRows} />
        <Label style={{ marginTop: 12 }}>列数（横）</Label>
        <SliderNum value={cols} min={2} max={10} onChange={setCols} />
      </Section>

      <Section title="座席ごとの設定" subtitle="クリックで切り替え">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(cols, 8)}, 1fr)`,
            gap: 4,
          }}
        >
          {seats.map((seat) => {
            const isOff = disabledSeats.has(seat.id);
            const isPri = prioritySeats.has(seat.id);
            return (
              <button
                key={seat.id}
                title={isOff ? "使用不可" : isPri ? "優先席" : "通常席"}
                onClick={() => {
                  if (!isOff && !isPri) togglePriority(seat.id);
                  else if (!isOff && isPri) toggleDisabled(seat.id);
                  else toggleDisabled(seat.id);
                }}
                style={{
                  aspectRatio: "1",
                  border: "1.5px solid",
                  borderColor: isOff
                    ? "#c8c3b8"
                    : isPri
                      ? "#f4a0a0"
                      : "#d9d4c7",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 9,
                  fontWeight: 600,
                  background: isOff ? "#f0ede6" : isPri ? "#fff0f0" : "#fff",
                  color: isOff ? "#aaa" : isPri ? "#c05050" : "#555",
                  transition: "all 0.12s",
                }}
              >
                {seat.id}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: "#999", margin: "8px 0 0" }}>
          通常 → 優先（赤）→ 無効（グレー）→ 通常
        </p>
      </Section>

      <Section title="統計">
        <Stat label="全座席" value={seats.length} />
        <Stat label="有効席" value={seats.filter((s) => !s.disabled).length} />
        <Stat label="優先席" value={seats.filter((s) => s.priority).length} />
        <Stat label="無効席" value={[...disabledSeats].length} />
      </Section>
    </div>
  );
}

// ─── 生徒一覧パネル ──────────────────────────────────────
interface StudentPanelProps {
  students: Student[];
  fileRef: React.RefObject<HTMLInputElement | null>;
  importCSV: (e: ChangeEvent<HTMLInputElement>) => void;
  exportTemplate: () => void;
  exportData: () => void;
  drawSeat: (idx: number) => void;
  cancelSeat: (idx: number) => void;
  availableCount: number;
  assignedCount: number;
}

function StudentPanel({
  students,
  fileRef,
  importCSV,
  exportTemplate,
  exportData,
  drawSeat,
  cancelSeat,
  availableCount,
  assignedCount,
}: StudentPanelProps) {
  return (
    <div>
      <Section title="インポート / エクスポート">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ActionBtn onClick={() => fileRef.current?.click()} icon="📂">
            CSVをインポート
          </ActionBtn>
          <ActionBtn onClick={exportTemplate} icon="📋">
            テンプレートをダウンロード
          </ActionBtn>
          <ActionBtn onClick={exportData} icon="💾">
            現在のデータをエクスポート
          </ActionBtn>
        </div>
      </Section>

      {students.length > 0 && (
        <Section
          title={`生徒一覧（${students.length}名）`}
          subtitle={`着席済み ${assignedCount}/${availableCount}席`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {students.map((student, idx) => {
              const hasSeat = student.seat !== null;
              return (
                <div
                  key={idx}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: hasSeat ? "#f0f8ef" : "#fafaf8",
                    border: `1px solid ${hasSeat ? "#b8ddb4" : "#e8e4d9"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#888", minWidth: 24 }}>
                    {student.no}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#2a2a2a",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {student.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      minWidth: 32,
                      textAlign: "center",
                      color: hasSeat ? "#4a8a44" : "#bbb",
                      fontWeight: hasSeat ? 600 : 400,
                    }}
                  >
                    {hasSeat ? `${student.seat}番` : "―"}
                  </span>

                  <button
                    onClick={() => drawSeat(idx)}
                    disabled={hasSeat}
                    title="抽選"
                    style={{
                      padding: "3px 8px",
                      borderRadius: 4,
                      border: "1px solid",
                      borderColor: hasSeat ? "#ddd" : "#4a9fd8",
                      background: hasSeat ? "#f5f5f5" : "#dbeeff",
                      color: hasSeat ? "#bbb" : "#1a6fa8",
                      fontSize: 11,
                      cursor: hasSeat ? "default" : "pointer",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    抽選
                  </button>
                  <button
                    onClick={() => cancelSeat(idx)}
                    disabled={!hasSeat}
                    title="取り消し"
                    style={{
                      padding: "3px 8px",
                      borderRadius: 4,
                      border: "1px solid",
                      borderColor: !hasSeat ? "#ddd" : "#e8a0a0",
                      background: !hasSeat ? "#f5f5f5" : "#fff0f0",
                      color: !hasSeat ? "#bbb" : "#c05050",
                      fontSize: 11,
                      cursor: !hasSeat ? "default" : "pointer",
                      fontWeight: 500,
                    }}
                  >
                    取消
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {students.length === 0 && (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: "#bbb",
            fontSize: 13,
            border: "1.5px dashed #e0dbd0",
            borderRadius: 8,
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          CSVをインポートして
          <br />
          生徒を追加してください
        </div>
      )}
    </div>
  );
}

// ─── 補助コンポーネント ──────────────────────────────────
interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 8 }}>
        <h3
          style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a3a5c" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#999" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

interface LabelProps {
  children: ReactNode;
  style?: CSSProperties;
}

function Label({ children, style }: LabelProps) {
  return (
    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#666", ...style }}>
      {children}
    </p>
  );
}

interface SliderNumProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

function SliderNum({ value, min, max, onChange }: SliderNumProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        step={1}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#1a3a5c",
          minWidth: 20,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

interface StatProps {
  label: string;
  value: number;
}

function Stat({ label, value }: StatProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
        borderBottom: "0.5px solid #f0ede6",
        fontSize: 13,
      }}
    >
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#1a3a5c" }}>{value}</span>
    </div>
  );
}

interface ActionBtnProps {
  children: ReactNode;
  onClick: () => void;
  icon: string;
}

function ActionBtn({ children, onClick, icon }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 14px",
        borderRadius: 6,
        border: "1px solid #d0ccc2",
        background: "#fff",
        cursor: "pointer",
        fontSize: 13,
        color: "#2a2a2a",
        fontWeight: 500,
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "background 0.12s, border-color 0.12s",
      }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {children}
    </button>
  );
}
