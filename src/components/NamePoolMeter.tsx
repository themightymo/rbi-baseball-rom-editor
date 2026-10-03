import { usePlayerNames } from "@/lib/usePlayerNames";

/** Shows how much of the shared player-name space is left for longer names. */
export function NamePoolMeter({ className = "" }: { className?: string }) {
  const { pool } = usePlayerNames();
  if (!pool.capacity) return null;
  const pct = Math.min(100, (pool.used / pool.capacity) * 100);
  const full = pool.free <= 0;
  return (
    <div
      className={`text-xs ${className}`}
      title="All player names share one fixed block of ROM space. Shorten a name to free letters for longer ones."
    >
      <div className="flex justify-between gap-2">
        <span className="text-muted-foreground">Name space</span>
        <span className={full ? "font-medium text-warning" : "font-medium"}>
          {pool.free} letter{pool.free === 1 ? "" : "s"} free
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${full ? "bg-warning" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {full && (
        <p className="mt-1 text-muted-foreground">
          Full. Shorten a name (or use a first initial) to make room for a longer one.
        </p>
      )}
    </div>
  );
}
