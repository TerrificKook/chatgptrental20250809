import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  search: "m21 21-5-5M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8",
  user: "M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  bag: "M4 7h16v14H4zM8 7V5a4 4 0 0 1 8 0v2",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  close: "m6 6 12 12M6 18 18 6",
  filter: "M4 7h16M4 17h16M8 4v6m8 4v6",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  grid: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  chair:
    "M6 13V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8M3 10v7h18v-7M5 17v4m14-4v4M6 13h12",
  lamp: "m8 3-4 10h16L16 3ZM12 13v8m-5 0h10",
  decor: "M9 3h6l-1 5c0 3 5 5 5 10 0 4-14 4-14 0 0-5 5-7 5-10Z",
  cup: "M3 5h14v10a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5ZM17 7h2a3 3 0 0 1 0 6h-2",
  tv: "M3 7h18v13H3zM7 2l5 5 5-5M6 10h9v7H6m12-6h1m-1 4h1",
  case: "M3 7h18v14H3zM8 7V3h8v4M7 7v14m10-14v14",
  textile: "M4 4h16v16H4zM4 8h16M8 4v16m8-16v16M4 16h16M2 22h20",
  globe:
    "M20 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0M4 10h16M12 2c-4 5-4 11 0 16 4-5 4-11 0-16M12 18v4m-4 0h8",
  check: "m5 12 4 4L20 5",
  camera: "M3 6h4l2-3h6l2 3h4v15H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2",
  film: "M3 5h18v15H3zM3 9h18M7 5v4m5-4v4m5-4v4",
};
export function Icon({
  name,
  size = 22,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
