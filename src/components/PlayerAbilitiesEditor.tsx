import { useState, useMemo } from "react";
import { useRom } from "@/lib/romStore";
import type { Player } from "@/lib/nameLoader";
import { usePlayerNames, type NameLimits } from "@/lib/usePlayerNames";
import { TeamSelect } from "@/components/TeamSelect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FacePickerGrid } from "@/components/FacePicker";
import { FacePainter } from "@/components/FacePainter";
import { clearCustomFace, useCustomFace } from "@/lib/customFaces";
import {
  BYTES,
  POSITIONS,
  POS_OFFSETS,
  TEAM_BYTES,
  TSB_ATTRIBUTE_SCALE,
  detectBase,
  faceImgUrl,
  getPlayerBytes,
  hexId,
  isValidFaceId,
  nibble,
  readStoredBase,
  resolveBase,
  withNibble,
  writeStoredBase,
  type GroupId,
  type PosDef,
} from "@/lib/abilities";
import { Wand2, Settings } from "lucide-react";

function FaceCell({
  value,
  changed,
  onChange,
  teamIdx,
  posIdx,
  label,
}: {
  value: number;
  changed: boolean;
  onChange: (v: number) => void;
  teamIdx: number;
  posIdx: number;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [painterOpen, setPainterOpen] = useState(false);
  const custom = useCustomFace(teamIdx, posIdx);
  const valid = isValidFaceId(value);

  function pick(id: number) {
    onChange(id);
    setOpen(false);
  }

  return (
    <td className="px-1 py-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={[
              "flex h-12 w-16 flex-col items-center justify-center gap-0.5 rounded border transition hover:bg-accent",
              changed || custom ? "border-warning bg-warning/20" : "border-input bg-background",
              !valid ? "border-destructive" : "",
            ].join(" ")}
          >
            {custom ? (
              <>
                <img
                  src={custom}
                  alt="Custom headshot"
                  width={32}
                  height={32}
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="font-mono text-[8px] text-muted-foreground">custom</span>
              </>
            ) : valid ? (
              <>
                <img
                  src={faceImgUrl(value)}
                  alt={hexId(value)}
                  width={32}
                  height={36}
                  className="object-cover"
                />
                <span className="font-mono text-[8px] text-muted-foreground">{hexId(value)}</span>
              </>
            ) : (
              <>
                <span className="text-destructive font-bold text-base leading-none">!</span>
                <span className="font-mono text-[8px] text-destructive">{hexId(value)}</span>
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-3 space-y-3"
          align="start"
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          {custom && (
            <div className="flex items-center gap-2 rounded border border-highlight bg-highlight/10 p-2 text-xs">
              <img
                src={custom}
                alt=""
                width={32}
                height={32}
                style={{ imageRendering: "pixelated" }}
              />
              <span className="flex-1">Showing a custom headshot. The original face is kept.</span>
              <Button size="sm" variant="outline" onClick={() => clearCustomFace(teamIdx, posIdx)}>
                Revert to original
              </Button>
            </div>
          )}
          <FacePickerGrid
            value={value}
            onPick={pick}
            onChange={onChange}
            onPaint={() => {
              setOpen(false);
              setPainterOpen(true);
            }}
          />
        </PopoverContent>
      </Popover>
      <FacePainter
        open={painterOpen}
        onOpenChange={setPainterOpen}
        team={teamIdx}
        slot={posIdx}
        faceId={value}
        playerLabel={label}
      />
    </td>
  );
}

function NibbleCell({
  value,
  changed,
  onChange,
}: {
  value: number;
  changed: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <td className="px-1 py-1">
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`h-8 w-14 rounded border px-1 text-xs font-mono ${
          changed ? "border-warning bg-warning/20" : "border-input bg-background"
        }`}
      >
        {TSB_ATTRIBUTE_SCALE.map((v, i) => (
          <option key={i} value={i}>
            {v}
          </option>
        ))}
      </select>
    </td>
  );
}

interface PlayerRowProps {
  pos: PosDef;
  cur: Uint8Array;
  orig: Uint8Array;
  curFirst?: string;
  curLast?: string;
  origFirst?: string;
  origLast?: string;
  maxFirst?: number;
  maxLast?: number;
  onNibble: (byteIdx: number, hi: boolean, value: number) => void;
  onFace: (value: number) => void;
  onName?: (first: string, last: string) => void;
  onOpen?: () => void;
  teamIdx: number;
  posIdx: number;
}

function PlayerRow({
  teamIdx,
  posIdx,
  pos,
  cur,
  orig,
  curFirst,
  curLast,
  origFirst,
  origLast,
  maxFirst,
  maxLast,
  onNibble,
  onFace,
  onName,
  onOpen,
}: PlayerRowProps) {
  const nb = (bi: number, hi: boolean) => nibble(cur, bi, hi);
  const nbChanged = (bi: number, hi: boolean) => nibble(cur, bi, hi) !== nibble(orig, bi, hi);
  const faceChanged = (cur[2] ?? 0) !== (orig[2] ?? 0);
  const fnChanged = curFirst !== origFirst;
  const lnChanged = curLast !== origLast;

  return (
    <tr className="border-t hover:bg-accent/20">
      <td className="min-w-[14rem] px-2 py-1">
        {onName && curFirst !== undefined && curLast !== undefined ? (
          <div className="flex items-center gap-1">
            <Input
              className={`h-7 w-[5.5rem] border font-mono text-xs ${fnChanged ? "border-warning" : "border-input"}`}
              value={curFirst}
              maxLength={maxFirst}
              onChange={(e) => onName(e.target.value, curLast)}
            />
            <Input
              className={`h-7 w-[6.5rem] border font-mono text-xs font-semibold ${lnChanged ? "border-warning" : "border-input"}`}
              value={curLast}
              maxLength={maxLast}
              onChange={(e) => onName(curFirst, e.target.value)}
            />
            {onOpen ? (
              <button
                onClick={onOpen}
                title="Open player card"
                className="whitespace-nowrap rounded px-1 text-[10px] text-muted-foreground underline-offset-2 hover:bg-accent hover:text-foreground hover:underline"
              >
                {pos.label}
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                ({pos.label})
              </span>
            )}
          </div>
        ) : (
          <span className="font-mono text-xs font-bold text-muted-foreground">{pos.label}</span>
        )}
      </td>
      <NibbleCell
        value={nb(0, true)}
        changed={nbChanged(0, true)}
        onChange={(v) => onNibble(0, true, v)}
      />
      <NibbleCell
        value={nb(0, false)}
        changed={nbChanged(0, false)}
        onChange={(v) => onNibble(0, false, v)}
      />
      <NibbleCell
        value={nb(1, true)}
        changed={nbChanged(1, true)}
        onChange={(v) => onNibble(1, true, v)}
      />
      <NibbleCell
        value={nb(1, false)}
        changed={nbChanged(1, false)}
        onChange={(v) => onNibble(1, false, v)}
      />
      <FaceCell
        value={cur[2] ?? 0}
        changed={faceChanged}
        onChange={onFace}
        teamIdx={teamIdx}
        posIdx={posIdx}
        label={`${pos.label} ${curFirst ?? ""} ${curLast ?? ""}`.trim()}
      />
      {pos.type === "qb" && (
        <>
          <NibbleCell
            value={nb(3, true)}
            changed={nbChanged(3, true)}
            onChange={(v) => onNibble(3, true, v)}
          />
          <NibbleCell
            value={nb(3, false)}
            changed={nbChanged(3, false)}
            onChange={(v) => onNibble(3, false, v)}
          />
          <NibbleCell
            value={nb(4, true)}
            changed={nbChanged(4, true)}
            onChange={(v) => onNibble(4, true, v)}
          />
          <NibbleCell
            value={nb(4, false)}
            changed={nbChanged(4, false)}
            onChange={(v) => onNibble(4, false, v)}
          />
        </>
      )}
      {(pos.type === "skill" || pos.type === "def" || pos.type === "kick") && (
        <>
          <NibbleCell
            value={nb(3, true)}
            changed={nbChanged(3, true)}
            onChange={(v) => onNibble(3, true, v)}
          />
          <NibbleCell
            value={nb(3, false)}
            changed={nbChanged(3, false)}
            onChange={(v) => onNibble(3, false, v)}
          />
        </>
      )}
    </tr>
  );
}

interface GroupTableProps {
  headers: string[];
  posIndices: number[];
  teamPlayers: Player[];
  origPlayers: Player[];
  limits: (first: string, last: string) => NameLimits;
  liveRom: Uint8Array;
  originalRom: Uint8Array;
  base: number;
  teamIdx: number;
  onNibble: (posIdx: number, byteIdx: number, hi: boolean, value: number) => void;
  onFace: (posIdx: number, value: number) => void;
  onName: (player: Player, first: string, last: string) => void;
  onOpen?: (posIdx: number) => void;
}

function GroupTable({
  headers,
  posIndices,
  teamPlayers,
  origPlayers,
  limits,
  liveRom,
  originalRom,
  base,
  teamIdx,
  onNibble,
  onFace,
  onName,
  onOpen,
}: GroupTableProps) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
          <tr>
            <th className="min-w-[14rem] px-2 py-2">Player</th>
            {headers.map((h) => (
              <th key={h} className="px-1 py-2 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {posIndices.map((pi) => {
            const player = teamPlayers[pi];
            const orig = origPlayers[pi];
            const curFirst = player?.first.trimEnd();
            const curLast = player?.last.trimEnd();
            const lim = player ? limits(curFirst ?? "", curLast ?? "") : undefined;
            return (
              <PlayerRow
                key={pi}
                teamIdx={teamIdx}
                posIdx={pi}
                pos={POSITIONS[pi]}
                cur={getPlayerBytes(liveRom, base, teamIdx, pi)}
                orig={getPlayerBytes(originalRom, base, teamIdx, pi)}
                curFirst={curFirst}
                curLast={curLast}
                origFirst={orig?.first.trimEnd()}
                origLast={orig?.last.trimEnd()}
                maxFirst={lim?.maxFirst}
                maxLast={lim?.maxLast}
                onNibble={(bi, hi, v) => onNibble(pi, bi, hi, v)}
                onFace={(v) => onFace(pi, v)}
                onName={player ? (f, l) => onName(player, f, l) : undefined}
                onOpen={onOpen ? () => onOpen(pi) : undefined}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface EditorProps {
  teamIdx?: number;
  onTeamChange?: (i: number) => void;
  group?: GroupId;
  onGroupChange?: (g: GroupId) => void;
  /** Opens the single-player card for a roster slot. */
  onOpenPlayer?: (posIdx: number) => void;
}

export function PlayerAbilitiesEditor(props: EditorProps = {}) {
  const { rom, originalRom, hasINES, setBytes } = useRom();

  const names = usePlayerNames();

  const [storedBase, setStoredBase] = useState<number | null>(readStoredBase);
  const [showSetup, setShowSetup] = useState(false);
  const [manualOffset, setManualOffset] = useState("");
  // Team and group can be controlled by the parent (so other views can jump here).
  const [localTeam, setLocalTeam] = useState(0);
  const [localGroup, setLocalGroup] = useState<GroupId>("qb");
  const teamIdx = props.teamIdx ?? localTeam;
  const setTeamIdx = props.onTeamChange ?? setLocalTeam;
  const group = props.group ?? localGroup;
  const setGroup = props.onGroupChange ?? setLocalGroup;

  const detectedBase = useMemo(() => {
    if (!originalRom) return null;
    return detectBase(originalRom);
  }, [originalRom]);

  const base = originalRom ? resolveBase(originalRom, storedBase, detectedBase) : null;

  function activate(offset: number | null) {
    setStoredBase(offset);
    writeStoredBase(offset);
    setShowSetup(false);
  }

  function handleNibble(posIdx: number, byteIdx: number, hi: boolean, value: number) {
    if (!rom || base === null) return;
    const offset = base + teamIdx * TEAM_BYTES + POS_OFFSETS[posIdx] + byteIdx;
    const b = rom[offset] ?? 0;
    setBytes(offset, new Uint8Array([withNibble(b, hi, value)]));
  }

  function handleFace(posIdx: number, value: number) {
    if (!rom || base === null) return;
    const offset = base + teamIdx * TEAM_BYTES + POS_OFFSETS[posIdx] + 2;
    setBytes(offset, new Uint8Array([value & 0xff]));
  }

  if (!rom) return null;

  if (base === null || showSetup) {
    return (
      <div className="mx-auto max-w-lg py-4 space-y-4">
        {showSetup && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Ratings data location</span>
            <Button variant="ghost" size="sm" onClick={() => setShowSetup(false)}>
              Cancel
            </Button>
          </div>
        )}
        <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-6 space-y-3 text-center">
          <p className="text-sm font-semibold">Where are the player ratings?</p>
          {detectedBase !== null ? (
            <>
              <p className="text-xs text-muted-foreground">
                Found automatically at file offset{" "}
                <span className="font-mono">0x{detectedBase.toString(16).toUpperCase()}</span>. You
                only need to change this for a heavily modified ROM.
              </p>
              <Button size="lg" className="gap-2" onClick={() => activate(null)}>
                <Wand2 className="size-5" /> Use detected location
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                We couldn't find the player ratings in this ROM automatically. It may be modified or
                a different version. If you know where the ratings table starts, enter its file
                offset in hex. Names &amp; jersey numbers can still be edited on the next tab.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Input
                  className="w-32 font-mono text-sm"
                  placeholder="0x????"
                  value={manualOffset}
                  onChange={(e) => setManualOffset(e.target.value)}
                />
                <Button
                  onClick={() => {
                    const n = parseInt(manualOffset.replace(/^0x/i, ""), 16);
                    if (!isNaN(n)) activate(n);
                  }}
                >
                  Set offset
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const GROUPS: { id: GroupId; label: string }[] = [
    { id: "qb", label: "Quarterbacks" },
    { id: "skill", label: "Skill Players" },
    { id: "oline", label: "O-Line" },
    { id: "defense", label: "Defense" },
    { id: "special", label: "Special Teams" },
  ];

  const QB_HEADERS = [
    "Rush Pwr",
    "Run Spd",
    "Max Spd",
    "Hit Pwr",
    "Face",
    "Pas Spd",
    "Pas Ctrl",
    "Pas Acc",
    "Avd Blk",
  ];
  const SKILL_HEADERS = ["Rush Pwr", "Run Spd", "Max Spd", "Hit Pwr", "Face", "Ball Ctrl", "Recep"];
  const OL_HEADERS = ["Rush Pwr", "Run Spd", "Max Spd", "Hit Pwr", "Face"];
  const DEF_HEADERS = ["Rush Pwr", "Run Spd", "Max Spd", "Hit Pwr", "Face", "Pass Int", "Quick"];
  const KICK_HEADERS = ["Rush Pwr", "Run Spd", "Max Spd", "Hit Pwr", "Face", "Kick Abl", "Avd Blk"];

  const byGroup: Record<GroupId, number[]> = {
    qb: POSITIONS.map((p, i) => ({ p, i }))
      .filter(({ p }) => p.type === "qb")
      .map(({ i }) => i),
    skill: POSITIONS.map((p, i) => ({ p, i }))
      .filter(({ p }) => p.type === "skill")
      .map(({ i }) => i),
    oline: POSITIONS.map((p, i) => ({ p, i }))
      .filter(({ p }) => p.type === "ol")
      .map(({ i }) => i),
    defense: POSITIONS.map((p, i) => ({ p, i }))
      .filter(({ p }) => p.type === "def")
      .map(({ i }) => i),
    special: POSITIONS.map((p, i) => ({ p, i }))
      .filter(({ p }) => p.type === "kick")
      .map(({ i }) => i),
  };

  const headersByGroup: Record<GroupId, string[]> = {
    qb: QB_HEADERS,
    skill: SKILL_HEADERS,
    oline: OL_HEADERS,
    defense: DEF_HEADERS,
    special: KICK_HEADERS,
  };

  const teamPlayers: Player[] = names.teams?.[teamIdx]?.players ?? [];
  const origPlayers: Player[] = names.originalTeams?.[teamIdx]?.players ?? [];

  function writePlayerName(player: Player, newFirst: string, newLast: string) {
    names.setName(teamIdx, player.slot, newFirst, newLast);
  }

  const tableProps: Omit<GroupTableProps, "headers" | "posIndices"> = {
    liveRom: rom,
    originalRom: originalRom!,
    base,
    teamIdx,
    teamPlayers,
    origPlayers,
    limits: names.limits,
    onNibble: handleNibble,
    onFace: handleFace,
    onName: writePlayerName,
    onOpen: props.onOpenPlayer,
  };

  return (
    <div className="space-y-4">
      <TeamSelect teamIdx={teamIdx} onTeamChange={setTeamIdx} />

      {/* Main panel */}
      <div className="space-y-3">
        {/* Group tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b pb-2">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={`rounded px-3 py-1 text-sm transition ${
                g.id === group ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {g.label}
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1.5 text-muted-foreground"
            title="Change where the ratings are read from (advanced)"
            onClick={() => setShowSetup(true)}
          >
            <Settings className="size-4" />
          </Button>
        </div>

        {/* Attribute table */}
        <div className="overflow-hidden nes-window">
          <GroupTable {...tableProps} headers={headersByGroup[group]} posIndices={byGroup[group]} />
        </div>

        <p className="text-xs text-muted-foreground">
          Ratings use the game's 6–100 scale. Click a face to pick a different portrait.
        </p>
      </div>
    </div>
  );
}
