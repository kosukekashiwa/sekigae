export type Gender = "男" | "女";

export interface Student {
  /** 出席番号 */
  attendanceNo: number;
  /** 名前 */
  name: string;
  /** 性別 */
  gender: Gender;
  /** 予約座席番号 (1-based seat number) or null */
  reservedSeat: number | null;
  /** 決定済みの座席番号 (1-based) or null */
  assignedSeat: number | null;
}

export type SeatKind =
  | "none" // 指定なし
  | "male" // 男子席
  | "female" // 女子席
  | "disabled"; // 使用不可

export interface SeatConfig {
  kind: SeatKind;
  /** 優先席フラグ (male/female/none と重複可能) */
  priority: boolean;
}

export interface Grid {
  /** 縦列数 (1-8) */
  cols: number;
  /** 横行数 (1-8) */
  rows: number;
}

export type RadioKind = SeatKind | "priority";

export interface RowError {
  attendanceNo: number | null;
  message: string;
}
