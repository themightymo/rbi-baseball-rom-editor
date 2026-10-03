import { RotateCcw } from "lucide-react";
import type { RbiBatter, RbiHandedness } from "@/games/rbi/types";
import type { RbiBatterChanges } from "@/games/rbi/batters";
import { Input } from "@/components/ui/input";
import { RbiStatSlider } from "@/components/RbiStatSlider";

export function RbiBatterCard({
  player,
  original,
  editable,
  onChange,
}: {
  player: RbiBatter;
  original: RbiBatter;
  editable: boolean;
  onChange: (changes: RbiBatterChanges) => void;
}) {
  return (
    <div className="space-y-5">
      {!editable && (
        <p className="border border-warning p-2 text-[8px] leading-relaxed text-warning">
          Editing is disabled because the originally loaded ROM is not an exact supported payload
          profile.
        </p>
      )}

      <section>
        <h3 className="nes-rule mb-3 pb-2 text-xs text-[#fc74b4]">Player</h3>
        <Field
          label="Name"
          value={player.name}
          original={original.name}
          disabled={!editable}
          onReset={() => onChange({ name: original.name })}
        >
          <Input
            value={player.name}
            maxLength={6}
            disabled={!editable}
            aria-label="Name"
            onChange={(event) => {
              try {
                onChange({ name: event.target.value });
              } catch {
                // Keep the last valid ROM-backed value for unsupported glyphs.
              }
            }}
          />
        </Field>
        <Field
          label="Bats"
          value={player.bats}
          original={original.bats}
          disabled={!editable}
          onReset={() => onChange({ bats: original.bats })}
        >
          <select
            className="h-9 w-full border border-input bg-secondary px-3 text-xs"
            value={player.bats}
            disabled={!editable}
            aria-label="Bats"
            onChange={(event) => onChange({ bats: event.target.value as RbiHandedness })}
          >
            <option value="R">Right</option>
            <option value="L">Left</option>
          </select>
        </Field>
      </section>

      <section>
        <h3 className="nes-rule mb-3 pb-2 text-xs text-[#fc74b4]">Displayed historical stats</h3>
        <NumberField
          label="Average"
          value={player.battingAverage}
          original={original.battingAverage}
          min={150}
          max={405}
          disabled={!editable}
          display={(value) => `.${value.toString().padStart(3, "0")}`}
          onChange={(battingAverage) => onChange({ battingAverage })}
        />
        <NumberField
          label="Home runs"
          value={player.homeRuns}
          original={original.homeRuns}
          min={0}
          max={255}
          disabled={!editable}
          onChange={(homeRuns) => onChange({ homeRuns })}
        />
        <p className="mt-2 text-[8px] leading-relaxed text-muted-foreground">
          Average and home runs are displayed by the game but do not control batting performance.
        </p>
      </section>

      <section>
        <h3 className="nes-rule mb-3 pb-2 text-xs text-[#fc74b4]">Game ratings</h3>
        <NumberField
          label="Contact"
          value={player.contact}
          original={original.contact}
          min={0}
          max={255}
          disabled={!editable}
          onChange={(contact) => onChange({ contact })}
        />
        <NumberField
          label="Power"
          value={player.power}
          original={original.power}
          min={0}
          max={65535}
          disabled={!editable}
          onChange={(power) => onChange({ power })}
        />
        <NumberField
          label="Speed"
          value={player.speed}
          original={original.speed}
          min={0}
          max={255}
          disabled={!editable}
          onChange={(speed) => onChange({ speed })}
        />
        <div className="mt-3 border border-white/30 p-3 text-[8px] leading-relaxed">
          <p className="text-muted-foreground">Derived first pinch-hit at-bat</p>
          <p className="mt-2">Base Power {player.power}</p>
          <p>Pinch-hit bonus +64</p>
          <p className="mt-1 text-[#fcd800]">Effective Power {player.power + 64}</p>
          <p className="mt-2 text-muted-foreground">
            The +64 bonus is game behavior, not a value stored in this player record.
          </p>
        </div>
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  original,
  min,
  max,
  disabled,
  display,
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
  return (
    <Field
      label={label}
      value={display?.(value) ?? value}
      original={display?.(original) ?? original}
      disabled={disabled}
      onReset={() => onChange(original)}
    >
      <RbiStatSlider
        label={label}
        value={value}
        original={original}
        min={min}
        max={max}
        disabled={disabled}
        display={display}
        onChange={onChange}
      />
    </Field>
  );
}

function Field({
  label,
  value,
  original,
  disabled,
  onReset,
  children,
}: {
  label: string;
  value: string | number;
  original: string | number;
  disabled: boolean;
  onReset: () => void;
  children: React.ReactNode;
}) {
  const changed = value !== original;
  return (
    <div className={`mb-3 border-l-2 pl-3 ${changed ? "border-[#fcd800]" : "border-transparent"}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-[8px] text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2 text-[8px]">
          <span className={changed ? "text-[#fcd800]" : "text-muted-foreground"}>
            {changed ? `Original ${original}` : "Unchanged"}
          </span>
          {changed && !disabled && (
            <button
              type="button"
              className="p-1 text-white hover:text-[#fcd800]"
              aria-label={`Reset ${label}`}
              onClick={onReset}
            >
              <RotateCcw className="size-3" />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
