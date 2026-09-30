import "@fontsource/press-start-2p/latin-400.css";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { decodeHelmet, NES_RGB } from "@/lib/helmets";
import { useRom } from "@/lib/romStore";
import { ALL_STAR_TEAMS, CONFERENCES, TEAM_NAMES, isAllStarTeam } from "@/lib/tsbRoster";
import { useTeamNames } from "@/lib/useTeamNames";

interface Props {
  teamIdx: number;
  onTeamChange: (i: number) => void;
  /** Also offer the AFC / NFC All-Star teams. */
  allStars?: boolean;
}

// NES palette colours from the game's TEAM DATA screen.
const BG = NES_RGB[0x11];
const WHITE = "#fcfcfc";
const HIGHLIGHT = "#f858a5";
const RED = "#e40058";

// Same 8×8 tile grid as the player card: 1em = one tile, 32 tiles across.
const SCREEN_STYLE: React.CSSProperties = {
  fontFamily: "'Press Start 2P', ui-monospace, monospace",
  fontSize: "calc(100cqw / 32)",
  lineHeight: 1,
  background: BG,
  color: WHITE,
};

/**
 * Button showing the current team; opens a popup that mirrors the game's
 * TEAM DATA → SELECT TEAM screen (helmets and abbreviations by division).
 */
export function TeamSelect({ teamIdx, onTeamChange, allStars = false }: Props) {
  const { rom, hasINES } = useRom();
  const [open, setOpen] = useState(false);
  const { name: teamName, abbr: teamAbbr } = useTeamNames();
  const helmets = useMemo(
    () => (rom ? TEAM_NAMES.map((_, t) => decodeHelmet(rom, hasINES, t)) : []),
    [rom, hasINES],
  );

  const choose = (t: number) => {
    onTeamChange(t);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 rounded-md border bg-card py-1.5 pl-2 pr-3 text-sm font-medium shadow-sm transition hover:bg-accent">
        <span className="rounded p-0.5 text-[16px]" style={{ background: BG }}>
          {isAllStarTeam(teamIdx) ? <AllStarBadge team={teamIdx} /> : <Helmet pixels={helmets[teamIdx]} />}
        </span>
        {teamName(teamIdx)}
        <ChevronDown className="size-4 text-muted-foreground" />
      </DialogTrigger>

      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          // Start keyboard focus on the current team rather than the first one.
          e.preventDefault();
          (e.currentTarget as HTMLElement)
            .querySelector<HTMLElement>("[aria-pressed=true]")
            ?.focus();
        }}
        className="w-[calc(100%-2rem)] max-w-2xl gap-0 overflow-hidden rounded-lg border-4 border-black p-0 text-white [container-type:inline-size]"
      >
        <div style={SCREEN_STYLE} className="px-[1em] py-[1.5em]">
          <div className="flex items-center justify-center gap-[1em]">
            <Stars />
            <DialogTitle className="text-[1em] font-normal leading-none tracking-normal">
              TEAM DATA
            </DialogTitle>
            <Stars />
          </div>
          {allStars ? (
            // Like the game: the All-Star teams are listed as text above the helmets,
            // with SELECT TEAM beside the first one.
            <div role="group" aria-label="All Stars" className="mt-[1.25em] pl-[3em]">
              {ALL_STAR_TEAMS.map((t, i) => (
                <div key={t} className="flex items-center gap-[1em]">
                  <AllStarButton team={t} name={teamName(t)} selected={t === teamIdx} onClick={() => choose(t)} />
                  {i === 0 && <span style={{ color: HIGHLIGHT }}>SELECT TEAM</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-[1.25em] text-center" style={{ color: HIGHLIGHT }}>
              SELECT TEAM
            </div>
          )}

          {CONFERENCES.map((conf) => (
            <div
              key={conf.name}
              role="group"
              aria-label={conf.name}
              className="mt-[1.5em] grid grid-cols-3"
            >
              {conf.divisions.map((div, d) => (
                <div key={d}>
                  {div.map((t) => (
                    <TeamButton
                      key={t}
                      helmet={helmets[t]}
                      name={teamName(t)}
                      abbr={teamAbbr(t)}
                      selected={t === teamIdx}
                      onClick={() => choose(t)}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}

          <div className="mt-[1.5em] text-center">{teamName(teamIdx).toUpperCase()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TeamButton({
  helmet,
  name,
  abbr,
  selected,
  onClick,
}: {
  helmet: Int8Array | undefined;
  name: string;
  abbr: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      title={name}
      className="group flex h-[2.5em] w-full items-center gap-[0.5em] text-left outline-none focus-visible:bg-white/15"
    >
      <Cursor visible={selected} />
      <Helmet pixels={helmet} />
      <span
        className="ml-[0.25em] group-hover:text-[#f858a5]"
        style={selected ? { color: HIGHLIGHT } : undefined}
      >
        {abbr}
      </span>
    </button>
  );
}

function AllStarButton({
  team,
  name,
  selected,
  onClick,
}: {
  team: number;
  name: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className="group flex h-[2em] items-center gap-[0.5em] outline-none focus-visible:bg-white/15"
    >
      <Cursor visible={selected} />
      <span className="group-hover:text-[#f858a5]" style={selected ? { color: HIGHLIGHT } : undefined}>
        {name.toUpperCase()}
      </span>
    </button>
  );
}

function Cursor({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 8 8" className="size-[1em] shrink-0" shapeRendering="crispEdges" aria-hidden>
      {visible && <path d="M1 0h2v1h1v1h1v1h1v2h-1v1h-1v1h-1v1h-2z" fill={WHITE} />}
    </svg>
  );
}

function Stars() {
  const star = (fill: string, x: number) => (
    <path
      key={x}
      transform={`translate(${x} 0)`}
      d="M4 0 5 3H8L5.5 5 6.5 8 4 6 1.5 8 2.5 5 0 3H3Z"
      fill={fill}
    />
  );
  return (
    <svg viewBox="0 0 24 8" className="h-[1em] w-[3em]" aria-hidden>
      {star(RED, 0)}
      {star(WHITE, 8)}
      {star(RED, 16)}
    </svg>
  );
}

/** The ROM has no All-Star helmets, so these get a star in the conference's colour. */
function AllStarBadge({ team }: { team: number }) {
  return (
    <svg viewBox="0 0 16 16" className="size-[2em] shrink-0" aria-hidden>
      <path
        d="M8 1 9.8 6H15l-4.2 3.2L12.4 15 8 11.6 3.6 15l1.6-5.8L1 6h5.2Z"
        fill={team === ALL_STAR_TEAMS[0] ? RED : NES_RGB[0x21]}
        stroke={WHITE}
        strokeWidth="0.75"
      />
    </svg>
  );
}

/** Draws a decoded 16×16 helmet as one SVG path per colour. */
function Helmet({ pixels }: { pixels: Int8Array | undefined }) {
  const paths = new Map<number, string>();
  pixels?.forEach((c, i) => {
    if (c >= 0) paths.set(c, (paths.get(c) ?? "") + `M${i % 16} ${i >> 4}h1v1h-1z`);
  });
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-[2em] shrink-0"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {[...paths].map(([c, d]) => (
        <path key={c} d={d} fill={NES_RGB[c]} />
      ))}
    </svg>
  );
}
