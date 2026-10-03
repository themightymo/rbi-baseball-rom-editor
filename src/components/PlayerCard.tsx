import { useMemo, useRef, useState } from "react";
import "@fontsource/press-start-2p/latin-400.css";
import { useRom } from "@/lib/romStore";
import { toInitial, usePlayerNames } from "@/lib/usePlayerNames";
import {
  POSITIONS,
  TSB_ATTRIBUTE_SCALE,
  detectBase,
  faceImgUrl,
  hexId,
  isValidFaceId,
  playerAbilityOffset,
  readStoredBase,
  resolveBase,
  withNibble,
  type PosType,
} from "@/lib/abilities";
import { POSITION_NAMES, isAllStarTeam, resolvePlayer, teamScreenColor } from "@/lib/tsbRoster";
import { useTeamNames } from "@/lib/useTeamNames";
import { FacePickerGrid } from "@/components/FacePicker";
import { FacePainter } from "@/components/FacePainter";
import { clearCustomFace, useCustomFace } from "@/lib/customFaces";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Where each rating lives: byte index within the player's record, and which nibble.
// `label` is split into lines exactly as the game wraps it; later lines are indented.
interface Ability {
  label: string[];
  byte: number;
  hi: boolean;
  kind: "physical" | "skill";
}

const PHYSICAL: Ability[] = [
  { label: ["RUNNING SPEED"], byte: 0, hi: false, kind: "physical" },
  { label: ["RUSHING POWER"], byte: 0, hi: true, kind: "physical" },
  { label: ["MAXIMUM SPEED"], byte: 1, hi: true, kind: "physical" },
  { label: ["HITTING POWER"], byte: 1, hi: false, kind: "physical" },
];

const SKILLS: Record<PosType, Ability[]> = {
  qb: [
    { label: ["PASSING SPEED"], byte: 3, hi: true, kind: "skill" },
    { label: ["PASS CONTROL"], byte: 3, hi: false, kind: "skill" },
    { label: ["ACCURACY", "OF PASSING"], byte: 4, hi: true, kind: "skill" },
    { label: ["AVOID", "PASS BLOCK"], byte: 4, hi: false, kind: "skill" },
  ],
  skill: [
    { label: ["BALL CONTROL"], byte: 3, hi: true, kind: "skill" },
    { label: ["RECEPTIONS"], byte: 3, hi: false, kind: "skill" },
  ],
  ol: [],
  def: [
    { label: ["PASS", "INTERCEPTIONS"], byte: 3, hi: true, kind: "skill" },
    { label: ["QUICKNESS"], byte: 3, hi: false, kind: "skill" },
  ],
  kick: [
    { label: ["KICKING ABILITY"], byte: 3, hi: true, kind: "skill" },
    { label: ["AVOID", "KICK BLOCK"], byte: 3, hi: false, kind: "skill" },
  ],
};

// NES palette colours sampled from the game's player screen.
const PINK = "#ff75b6";
const SKY = "#3cbeff";
const CHANGED = "#fcd800";

// The screen is laid out on the NES's 8×8 character grid: 1em = one 8-pixel tile,
// 32 tiles across. The font size scales with the container so it always fits.
const SCREEN_STYLE: React.CSSProperties = {
  fontFamily: "'Press Start 2P', ui-monospace, monospace",
  fontSize: "calc(100cqw / 32)",
  lineHeight: 1,
  imageRendering: "pixelated",
};

const NAME_WIDTH = 20; // tiles available for "NN-FIRST LAST" before the game abbreviates

interface Props {
  /** A regular team, or an All-Star team (the card then shows the player that slot points to). */
  teamIdx: number;
  /** Roster slot 0–29, or null when closed. */
  posIdx: number | null;
  onClose: () => void;
  onNavigate: (posIdx: number) => void;
}

export function PlayerCard({ teamIdx, posIdx, onClose, onNavigate }: Props) {
  return (
    <Dialog open={posIdx !== null} onOpenChange={(o) => !o && onClose()}>
      {/* As wide as fits — up to ~3× NES scale — without the screen overflowing a short window. */}
      <DialogContent className="w-[min(calc(100vw-2rem),800px,calc((100dvh-7rem)*1.15))] max-w-none gap-0 overflow-hidden border-0 bg-black p-0 sm:max-w-none [&>button:last-child]:hidden">
        {posIdx !== null && (
          <CardBody teamIdx={teamIdx} posIdx={posIdx} onNavigate={onNavigate} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardBody({
  teamIdx,
  posIdx,
  onNavigate,
  onClose,
}: {
  teamIdx: number;
  posIdx: number;
  onNavigate: (p: number) => void;
  onClose: () => void;
}) {
  const { rom, originalRom, hasINES, setBytes } = useRom();
  const { name: teamName } = useTeamNames();
  const [faceOpen, setFaceOpen] = useState(false);
  const [painterOpen, setPainterOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const names = usePlayerNames();

  const base = useMemo(
    () =>
      originalRom ? resolveBase(originalRom, readStoredBase(), detectBase(originalRom)) : null,
    [originalRom],
  );

  // Everything below reads the real player; for an All-Star slot that's on another team.
  const src = rom ? resolvePlayer(rom, hasINES, teamIdx, posIdx) : { team: teamIdx, slot: posIdx };
  const customFace = useCustomFace(src.team, src.slot);

  if (!rom || !originalRom) return null;

  const pos = POSITIONS[src.slot]!;
  const player = names.player(src.team, src.slot);
  const orig = names.original(src.team, src.slot);

  // Name + jersey (live ROM so edits show immediately)
  const first = player?.first.trimEnd() ?? "";
  const last = player?.last.trimEnd() ?? "";
  const jersey = player?.jersey ?? 0;
  const origFirst = orig?.first.trimEnd() ?? "";
  const origLast = orig?.last.trimEnd() ?? "";
  const origJersey = orig?.jersey ?? 0;

  const writeName = (f: string, l: string) => player && names.setName(src.team, src.slot, f, l);
  const { maxFirst, maxLast } = names.limits(first, last);
  const canInitial = first.length > 2 || (first.length === 2 && !first.endsWith("."));

  // Like the game, shorten a long first name to its initial ("R.CUNNINGHAM").
  const jerseyText = `${jersey}-`;
  const fullName = first ? `${first} ${last}` : last;
  const shortName =
    jerseyText.length + fullName.length > NAME_WIDTH && first ? `${first[0]}.${last}` : fullName;

  // Keep the full name showing while focus moves between the first/last name boxes.
  const endNameEdit = (e: React.FocusEvent) => {
    if (!(e.relatedTarget as HTMLElement | null)?.hasAttribute("data-name-input"))
      setEditingName(false);
  };

  // Abilities
  const recOff = base !== null ? playerAbilityOffset(base, src.team, src.slot) : null;
  const level = (r: Uint8Array, a: Ability) => {
    if (recOff === null) return 0;
    const b = r[recOff + a.byte] ?? 0;
    return a.hi ? (b >> 4) & 0xf : b & 0xf;
  };
  const setLevel = (a: Ability, v: number) => {
    if (recOff === null) return;
    const off = recOff + a.byte;
    const clamped = Math.max(0, Math.min(15, v));
    if (clamped === level(rom, a)) return;
    setBytes(off, new Uint8Array([withNibble(rom[off] ?? 0, a.hi, clamped)]));
  };
  const face = recOff !== null ? (rom[recOff + 2] ?? 0) : 0;
  const origFace = recOff !== null ? (originalRom[recOff + 2] ?? 0) : 0;
  const setFace = (id: number) =>
    recOff !== null && setBytes(recOff + 2, new Uint8Array([id & 0xff]));

  const skills = SKILLS[pos.type];
  const prev = (posIdx + POSITIONS.length - 1) % POSITIONS.length;
  const next = (posIdx + 1) % POSITIONS.length;
  const bg = teamScreenColor(src.team);

  return (
    <>
      <DialogTitle className="sr-only">
        {first} {last}, {teamName(teamIdx)} {POSITION_NAMES[posIdx]}
      </DialogTitle>

      {/* ── The game screen ───────────────────────────────────────────── */}
      <div className="@container w-full" style={{ containerType: "inline-size" }}>
        <div
          className="relative uppercase text-white"
          style={{ ...SCREEN_STYLE, background: bg, padding: "1.5em 1em 2em 2em" }}
        >
          {/* Team name + position */}
          <div className="flex justify-between" style={{ paddingLeft: "3em", paddingRight: "2em" }}>
            <span>{teamName(src.team)}</span>
            <span>{POSITION_NAMES[posIdx]!.replace(/\d$/, "")}</span>
          </div>

          {/* Face + number/name + condition */}
          <div className="flex" style={{ marginTop: "1.25em" }}>
            <Popover open={faceOpen} onOpenChange={setFaceOpen}>
              <PopoverTrigger asChild>
                <button
                  title="Click to change face"
                  className="relative shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{
                    width: "4em",
                    height: "4em",
                    marginLeft: "2em",
                    background: SKY,
                    boxShadow: "0.75em 0.75em 0 #000",
                    outline:
                      face !== origFace || customFace ? `0.125em solid ${CHANGED}` : undefined,
                  }}
                >
                  {customFace ? (
                    <img
                      src={customFace}
                      alt="Custom headshot"
                      className="h-full w-full"
                      style={{ imageRendering: "pixelated", objectFit: "cover" }}
                    />
                  ) : isValidFaceId(face) ? (
                    <img
                      src={faceImgUrl(face)}
                      alt={`Face ${hexId(face)}`}
                      className="h-full w-full"
                      style={{ imageRendering: "pixelated", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ color: "#a80010" }}>?</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-3 normal-case"
                align="start"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                {customFace && (
                  <div className="mb-3 flex items-center gap-2 rounded border border-highlight bg-highlight/10 p-2 text-xs">
                    <img
                      src={customFace}
                      alt=""
                      width={32}
                      height={32}
                      style={{ imageRendering: "pixelated" }}
                    />
                    <span className="flex-1">
                      Showing a custom headshot. The original face below is kept and the game still
                      uses it.
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => clearCustomFace(src.team, src.slot)}
                    >
                      Revert to original
                    </Button>
                  </div>
                )}
                <FacePickerGrid
                  value={face}
                  onPick={(id) => {
                    setFace(id);
                    setFaceOpen(false);
                  }}
                  onChange={setFace}
                  onPaint={() => {
                    setFaceOpen(false);
                    setPainterOpen(true);
                  }}
                />
              </PopoverContent>
            </Popover>
            <FacePainter
              open={painterOpen}
              onOpenChange={setPainterOpen}
              team={src.team}
              slot={src.slot}
              faceId={face}
              playerLabel={`${teamName(src.team)} ${POSITION_NAMES[src.slot]} ${first} ${last}`.trim()}
            />

            <div style={{ marginLeft: "3em", marginTop: "0.5em" }}>
              {/* NN-FIRST LAST */}
              <div className="flex flex-wrap items-baseline" style={{ rowGap: "0.5em" }}>
                <PixelInput
                  label="Jersey number"
                  value={String(jersey)}
                  width={Math.max(1, String(jersey).length)}
                  changed={jersey !== origJersey}
                  inputMode="numeric"
                  onChange={(v) =>
                    names.setJersey(
                      src.team,
                      src.slot,
                      parseInt(v.replace(/\D/g, "").slice(-2) || "0"),
                    )
                  }
                />
                <span>-</span>
                {editingName || shortName === fullName ? (
                  <>
                    {first && (
                      <>
                        <PixelInput
                          label="First name"
                          value={first}
                          width={Math.max(1, first.length)}
                          maxLength={player ? maxFirst : 0}
                          changed={first !== origFirst}
                          data-name-input
                          autoFocus={shortName !== fullName}
                          onFocus={() => setEditingName(true)}
                          onBlur={endNameEdit}
                          onChange={(v) => writeName(v, last)}
                        />
                        <span>&nbsp;</span>
                      </>
                    )}
                    <PixelInput
                      label="Last name"
                      value={last}
                      width={Math.max(1, last.length)}
                      maxLength={player ? maxLast : 0}
                      changed={last !== origLast}
                      data-name-input
                      onFocus={() => setEditingName(true)}
                      onBlur={endNameEdit}
                      onChange={(v) => writeName(first, v)}
                    />
                  </>
                ) : (
                  <button
                    title="Click to edit name"
                    onClick={() => setEditingName(true)}
                    className="uppercase hover:underline"
                    style={{
                      color: first !== origFirst || last !== origLast ? CHANGED : undefined,
                      textUnderlineOffset: "0.25em",
                    }}
                  >
                    {shortName}
                  </button>
                )}
              </div>

              <div
                style={{ marginTop: "1.25em" }}
                title="Set by the game each week during a season — not stored in the ROM"
              >
                <div>PHYSICAL</div>
                <div>CONDITION: AVERAGE</div>
              </div>
            </div>
          </div>

          {/* ABILITY */}
          <div style={{ marginTop: "1.75em", paddingLeft: "10em" }}>
            <span style={{ borderBottom: "0.125em solid #c5c3db", paddingBottom: "0.25em" }}>
              ABILITY
            </span>
          </div>

          {recOff === null ? (
            <p
              className="normal-case"
              style={{ marginTop: "2em", fontSize: "0.75em", lineHeight: 1.5 }}
            >
              Ratings couldn't be located in this ROM. Set their location from Advanced › Edit
              Players.
            </p>
          ) : (
            <div style={{ marginTop: "1.25em" }}>
              {PHYSICAL.map((a, i) => (
                <AbilityRow
                  key={i}
                  ability={a}
                  value={level(rom, a)}
                  changed={level(rom, a) !== level(originalRom, a)}
                  onChange={(v) => setLevel(a, v)}
                />
              ))}
              {/* The game leaves a gap before the position skills, except for QBs (no room). */}
              {skills.length > 0 && pos.type !== "qb" && <div style={{ height: "2em" }} />}
              {skills.map((a, i) => (
                <AbilityRow
                  key={i}
                  ability={a}
                  value={level(rom, a)}
                  changed={level(rom, a) !== level(originalRom, a)}
                  onChange={(v) => setLevel(a, v)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Controls (outside the game screen) ───────────────────────── */}
      <div className="flex items-center justify-between gap-2 bg-card px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <CtrlBtn label="Previous player" onClick={() => onNavigate(prev)}>
            <ChevronLeft className="size-4" />
          </CtrlBtn>
          <span className="w-12 text-center font-mono">{POSITION_NAMES[posIdx]}</span>
          <CtrlBtn label="Next player" onClick={() => onNavigate(next)}>
            <ChevronRight className="size-4" />
          </CtrlBtn>
        </div>
        {editingName ? (
          <span className="flex items-center gap-2">
            <span
              className={names.pool.free <= 0 ? "text-warning" : undefined}
              title="All player names share one fixed block of ROM space"
            >
              {names.pool.free} letter{names.pool.free === 1 ? "" : "s"} of name space free
            </span>
            {canInitial && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                data-name-input
                onBlur={endNameEdit}
                onMouseDown={(e) => e.preventDefault()} // keep focus in the name so editing stays open
                title={`Shorten the first name to "${toInitial(first)}"`}
                onClick={() => writeName(toInitial(first), last)}
              >
                Use initial
              </Button>
            )}
          </span>
        ) : (
          <span className="hidden text-muted-foreground sm:inline">
            {isAllStarTeam(teamIdx)
              ? `${teamName(teamIdx)} · edits also apply on the ${teamName(src.team)}`
              : "Click a bar, name, number or face to edit"}
          </span>
        )}
        <CtrlBtn label="Close" onClick={onClose}>
          <X className="size-4" />
        </CtrlBtn>
      </div>
    </>
  );
}

function AbilityRow({
  ability,
  value,
  changed,
  onChange,
}: {
  ability: Ability;
  value: number;
  changed: boolean;
  onChange: (v: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const color = ability.kind === "physical" ? PINK : SKY;
  const name = ability.label.join(" ");

  // Map a pointer position on the bar to the nearest of the 16 rating levels.
  const levelAt = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect();
    const pct = ((clientX - r.left) / r.width) * 100;
    let best = 0;
    TSB_ATTRIBUTE_SCALE.forEach((v, i) => {
      if (Math.abs(v - pct) < Math.abs(TSB_ATTRIBUTE_SCALE[best]! - pct)) best = i;
    });
    return best;
  };

  const leading = ability.label.slice(0, -1);
  const lastLine = ability.label[ability.label.length - 1]!;

  return (
    <div style={{ marginBottom: 0 }}>
      {leading.map((l) => (
        <div key={l} style={{ height: "1em" }}>
          {l}
        </div>
      ))}
      <div className="flex items-center" style={{ height: "1em" }}>
        <span style={{ width: "14em", paddingLeft: leading.length ? "3em" : 0 }}>{lastLine}</span>
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label={name}
          aria-valuemin={TSB_ATTRIBUTE_SCALE[0]}
          aria-valuemax={TSB_ATTRIBUTE_SCALE[15]}
          aria-valuenow={TSB_ATTRIBUTE_SCALE[value]}
          title={`${name}: ${TSB_ATTRIBUTE_SCALE[value]} — click or drag to change`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onChange(levelAt(e.clientX));
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) onChange(levelAt(e.clientX));
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              onChange(value + 1);
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(value - 1);
            }
          }}
          className="relative cursor-pointer touch-none outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{
            width: "8em",
            height: "0.625em",
            border: "0.125em solid #fff",
            boxSizing: "border-box",
          }}
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${TSB_ATTRIBUTE_SCALE[value]}%`, background: color }}
          />
        </div>
        <span className="text-right" style={{ width: "5em", color: changed ? CHANGED : undefined }}>
          {TSB_ATTRIBUTE_SCALE[value]}
        </span>
      </div>
    </div>
  );
}

function PixelInput({
  label,
  value,
  width,
  changed,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  width: number;
  changed: boolean;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "width">) {
  return (
    <input
      {...rest}
      aria-label={label}
      title={`Click to edit ${label.toLowerCase()}`}
      value={value}
      size={width}
      onChange={(e) => onChange(e.target.value)}
      className="m-0 border-0 bg-transparent p-0 uppercase outline-none hover:underline focus:bg-black/30 focus:underline"
      style={{
        font: "inherit",
        width: `${width}em`,
        color: changed ? CHANGED : "inherit",
        caretColor: "#fff",
        textUnderlineOffset: "0.25em",
      }}
    />
  );
}

function CtrlBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded p-1.5 hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}
