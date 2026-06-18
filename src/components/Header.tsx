import { ReactNode } from "react";

interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-indigo-700 px-5 text-white shadow">
      <span className="text-xl" aria-hidden="true">
        🪑
      </span>
      <h1 className="text-lg font-bold tracking-wide">席替えアプリ</h1>
      {children}
      <a
        href="https://github.com/kosukekashiwa/sekigae#readme"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto text-sm font-medium text-indigo-100 underline-offset-2 hover:text-white hover:underline"
      >
        使い方
      </a>
    </header>
  );
}
