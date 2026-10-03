import { Minus, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export function RbiStatSlider({
  label,
  value,
  original,
  min,
  max,
  disabled,
  display = String,
  onChange,
}: {
  label: string;
  value: number;
  original: number;
  min: number;
  max: number;
  disabled: boolean;
  display?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const originalPosition = ((original - min) / (max - min)) * 100;
  const changeBy = (amount: number) => onChange(Math.min(max, Math.max(min, value + amount)));

  return (
    <div className="rounded-sm border-2 border-white/20 bg-black/30 px-3 py-3">
      <div className="mb-3 flex items-end justify-between gap-3">
        <span className="text-[7px] uppercase tracking-wider text-muted-foreground">Current</span>
        <output
          className="min-w-20 border-2 border-[#fcd800] bg-black px-2 py-1 text-center font-mono text-xs text-[#fcd800] shadow-[2px_2px_0_0_#747474]"
          aria-live="polite"
        >
          {display(value)}
        </output>
      </div>

      <div className="relative px-1 pt-3">
        <span
          className="pointer-events-none absolute top-0 h-3 w-px bg-[#fc74b4]"
          style={{ left: `calc(${originalPosition}% + ${4 - originalPosition * 0.08}px)` }}
          title={`Original ${display(original)}`}
        />
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          aria-label={label}
          className="py-2 [&_[role=slider]]:size-5 [&_[role=slider]]:rounded-none [&_[role=slider]]:border-2 [&_[role=slider]]:border-black [&_[role=slider]]:bg-[#fcd800] [&_[role=slider]]:shadow-[2px_2px_0_0_#747474]"
          onValueChange={([next]) => onChange(next)}
        />
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={disabled || value <= min}
          className="grid size-7 place-items-center border border-white/50 bg-secondary text-white hover:border-[#fcd800] hover:text-[#fcd800] disabled:opacity-30"
          aria-label={`Decrease ${label}`}
          onClick={() => changeBy(-1)}
        >
          <Minus className="size-3" />
        </button>
        <div className="flex flex-1 justify-between font-mono text-[7px] text-muted-foreground">
          <span>{display(min)}</span>
          <span className="text-[#fc74b4]">▲ original {display(original)}</span>
          <span>{display(max)}</span>
        </div>
        <button
          type="button"
          disabled={disabled || value >= max}
          className="grid size-7 place-items-center border border-white/50 bg-secondary text-white hover:border-[#fcd800] hover:text-[#fcd800] disabled:opacity-30"
          aria-label={`Increase ${label}`}
          onClick={() => changeBy(1)}
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}
