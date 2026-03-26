export function formatTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const s = diff / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
