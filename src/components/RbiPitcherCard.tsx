import { RotateCcw } from "lucide-react";
import type { RbiHandedness, RbiPitcher, RbiPitcherDelivery } from "@/games/rbi/types";
import type { RbiPitcherChanges } from "@/games/rbi/pitchers";
import { Input } from "@/components/ui/input";

export function RbiPitcherCard({
  player,
  original,
  editable,
  onChange,
}: {
  player: RbiPitcher;
  original: RbiPitcher;
  editable: boolean;
  onChange: (changes: RbiPitcherChanges) => void;
}) {
  return (
    <div className="space-y-5">
      {!editable && (
        <p className="border border-warning p-2 text-[8px] leading-relaxed text-warning">
          Editing is disabled because the originally loaded ROM is not a supported clean profile.
        </p>
      )}
      <section>
        <Heading>Player</Heading>
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
                /* retain last valid glyphs */
              }
            }}
          />
        </Field>
        <Field
          label="Throws"
          value={player.throws}
          original={original.throws}
          disabled={!editable}
          onReset={() => onChange({ throws: original.throws })}
        >
          <select
            className="h-9 w-full border border-input bg-secondary px-3 text-xs"
            value={player.throws}
            disabled={!editable}
            aria-label="Throws"
            onChange={(event) => onChange({ throws: event.target.value as RbiHandedness })}
          >
            <option value="R">Right</option>
            <option value="L">Left</option>
          </select>
        </Field>
        <Field
          label="Delivery"
          value={player.delivery}
          original={original.delivery}
          disabled={!editable}
          onReset={() => onChange({ delivery: original.delivery })}
        >
          <select
            className="h-9 w-full border border-input bg-secondary px-3 text-xs"
            value={player.delivery}
            disabled={!editable}
            aria-label="Delivery"
            onChange={(event) => onChange({ delivery: event.target.value as RbiPitcherDelivery })}
          >
            <option value="standard">Standard</option>
            <option value="sidearm">Sidearm</option>
          </select>
        </Field>
      </section>
      <section>
        <Heading>Displayed historical stat</Heading>
        <NumberField
          label="ERA"
          value={player.earnedRunAverage}
          original={original.earnedRunAverage}
          min={100}
          max={355}
          disabled={!editable}
          display={(value) => (value / 100).toFixed(2)}
          onChange={(earnedRunAverage) => onChange({ earnedRunAverage })}
        />
        <p className="mt-2 text-[8px] leading-relaxed text-muted-foreground">
          ERA is displayed by the game but does not control pitching performance.
        </p>
      </section>
      <section>
        <Heading>Movement</Heading>
        <NumberField
          label="Drop / sinker"
          value={player.drop}
          original={original.drop}
          min={0}
          max={15}
          disabled={!editable}
          onChange={(drop) => onChange({ drop })}
        />
        <NumberField
          label="Curve left"
          value={player.leftCurve}
          original={original.leftCurve}
          min={0}
          max={15}
          disabled={!editable}
          onChange={(leftCurve) => onChange({ leftCurve })}
        />
        <NumberField
          label="Curve right"
          value={player.rightCurve}
          original={original.rightCurve}
          min={0}
          max={15}
          disabled={!editable}
          onChange={(rightCurve) => onChange({ rightCurve })}
        />
      </section>
      <section>
        <Heading>Pitch speeds and stamina</Heading>
        <NumberField
          label="Slow pitch"
          value={player.slowPitchVelocity}
          original={original.slowPitchVelocity}
          min={0}
          max={255}
          disabled={!editable}
          onChange={(slowPitchVelocity) => onChange({ slowPitchVelocity })}
        />
        <NumberField
          label="Normal pitch"
          value={player.normalPitchVelocity}
          original={original.normalPitchVelocity}
          min={0}
          max={255}
          disabled={!editable}
          onChange={(normalPitchVelocity) => onChange({ normalPitchVelocity })}
        />
        <NumberField
          label="Fast pitch"
          value={player.fastPitchVelocity}
          original={original.fastPitchVelocity}
          min={0}
          max={255}
          disabled={!editable}
          onChange={(fastPitchVelocity) => onChange({ fastPitchVelocity })}
        />
        <NumberField
          label="Stamina"
          value={player.stamina}
          original={original.stamina}
          min={0}
          max={255}
          disabled={!editable}
          onChange={(stamina) => onChange({ stamina })}
        />
      </section>
      <details className="border border-white/30 p-3 text-[8px]">
        <summary className="cursor-pointer text-muted-foreground">Advanced unknown bytes</summary>
        <p className="mt-3">
          Unknown 1: 0x{hexByte(player.unknown1)} ({player.unknown1})
        </p>
        <p className="mt-2">
          Unknown 2: 0x{hexByte(player.unknown2)} ({player.unknown2})
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          These bytes are read-only because their meanings are not confirmed.
        </p>
      </details>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="nes-rule mb-3 pb-2 text-xs text-[#fc74b4]">{children}</h3>;
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
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isInteger(next) && next >= min && next <= max) onChange(next);
        }}
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

function hexByte(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, "0");
}
