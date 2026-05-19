import { useState, useMemo } from "react";
import { useRom } from "@/lib/romStore";
import { buildIPS } from "@/lib/diff";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, FileCode, Wand2, Settings } from "lucide-react";

// Face IDs that point to real face scripts in Bank 15.
// 0x53–0x80 all map to PLAYER_FACE_SCRIPT_BAD_PTR and produce no face.
const VALID_FACE_RANGE1 = Array.from({ length: 0x53 }, (_, i) => i);           // 0x00–0x52
const VALID_FACE_RANGE2 = Array.from({ length: 0xD4 - 0x81 + 1 }, (_, i) => i + 0x81); // 0x81–0xD4
const VALID_FACE_SET = new Set([...VALID_FACE_RANGE1, ...VALID_FACE_RANGE2]);

function isValidFaceId(id: number) { return VALID_FACE_SET.has(id); }

// ─── Constants ────────────────────────────────────────────────────────────────

const TSB_ATTRIBUTE_SCALE = [6, 13, 19, 25, 31, 38, 44, 50, 56, 63, 69, 75, 81, 88, 94, 100];

type PosType = "qb" | "skill" | "ol" | "def" | "kick";
type GroupId = "qb" | "skill" | "oline" | "defense" | "special";

interface PosDef { id: string; label: string; type: PosType }

const POSITIONS: PosDef[] = [
  { id: "qb1",  label: "QB1",  type: "qb" },
  { id: "qb2",  label: "QB2",  type: "qb" },
  { id: "rb1",  label: "RB1",  type: "skill" },
  { id: "rb2",  label: "RB2",  type: "skill" },
  { id: "rb3",  label: "RB3",  type: "skill" },
  { id: "rb4",  label: "RB4",  type: "skill" },
  { id: "wr1",  label: "WR1",  type: "skill" },
  { id: "wr2",  label: "WR2",  type: "skill" },
  { id: "wr3",  label: "WR3",  type: "skill" },
  { id: "wr4",  label: "WR4",  type: "skill" },
  { id: "te1",  label: "TE1",  type: "skill" },
  { id: "te2",  label: "TE2",  type: "skill" },
  { id: "c",    label: "C",    type: "ol" },
  { id: "lg",   label: "LG",   type: "ol" },
  { id: "rg",   label: "RG",   type: "ol" },
  { id: "lt",   label: "LT",   type: "ol" },
  { id: "rt",   label: "RT",   type: "ol" },
  { id: "re",   label: "RE",   type: "def" },
  { id: "nt",   label: "NT",   type: "def" },
  { id: "le",   label: "LE",   type: "def" },
  { id: "rolb", label: "ROLB", type: "def" },
  { id: "rilb", label: "RILB", type: "def" },
  { id: "lilb", label: "LILB", type: "def" },
  { id: "lolb", label: "LOLB", type: "def" },
  { id: "rcb",  label: "RCB",  type: "def" },
  { id: "lcb",  label: "LCB",  type: "def" },
  { id: "fs",   label: "FS",   type: "def" },
  { id: "ss",   label: "SS",   type: "def" },
  { id: "k",    label: "K",    type: "kick" },
  { id: "p",    label: "P",    type: "kick" },
];

// Byte counts per position type
const BYTES: Record<PosType, number> = { qb: 5, skill: 4, ol: 3, def: 4, kick: 4 };

// Total: 2×5 + 10×4 + 5×3 + 11×4 + 2×4 = 117
const TEAM_BYTES = 117;
const TEAM_COUNT = 28;

// Byte offset of each position within a team's abilities block
const POS_OFFSETS: number[] = (() => {
  const offsets: number[] = [];
  let off = 0;
  for (const p of POSITIONS) {
    offsets.push(off);
    off += BYTES[p.type];
  }
  return offsets;
})();

// Buffalo Bills QB1 signature: RP=69, RS=25, MS=13, HP=13, face=0x52, PS=56, PC=81, PA=81, APB=81
const DETECT_PATTERN = [0xa3, 0x11, 0x52, 0x8c, 0xcc];
const BUFFALO_INDEX = 2; // Buffalo is team slot 2

const TEAM_NAMES = [
  "Chicago", "New York Giants", "Buffalo", "Indianapolis", "Miami",
  "New England", "New York Jets", "Cleveland", "Houston", "Pittsburgh",
  "Cincinnati", "Denver", "Kansas City", "LA Raiders", "Seattle",
  "San Diego", "Minnesota", "Green Bay", "Detroit", "Tampa Bay",
  "Atlanta", "Dallas", "Phoenix", "Philadelphia", "Chicago Bears",
  "New York Giants 2", "San Francisco", "LA Rams",
];

const LS_KEY = "tecmo.abilitiesconfig.v1";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function detectBase(rom: Uint8Array): number | null {
  for (let i = 0; i <= rom.length - DETECT_PATTERN.length; i++) {
    if (DETECT_PATTERN.every((b, j) => rom[i + j] === b)) {
      const base = i - BUFFALO_INDEX * TEAM_BYTES;
      if (base >= 0 && base + TEAM_COUNT * TEAM_BYTES <= rom.length) return base;
    }
  }
  return null;
}

function getPlayerBytes(rom: Uint8Array, base: number, teamIdx: number, posIdx: number): Uint8Array {
  const start = base + teamIdx * TEAM_BYTES + POS_OFFSETS[posIdx];
  return rom.slice(start, start + BYTES[POSITIONS[posIdx].type]);
}

function nibble(bytes: Uint8Array, byteIdx: number, hi: boolean): number {
  const b = bytes[byteIdx] ?? 0;
  return hi ? (b >> 4) & 0xf : b & 0xf;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function downloadBlob(name: string, data: Uint8Array) {
  const blob = new Blob([data.buffer as ArrayBuffer]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FaceCell({ value, changed, onChange }: {
  value: number; changed: boolean; onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const valid = isValidFaceId(value);

  function pick(id: number) { onChange(id); setOpen(false); }

  const triggerClass = [
    "flex h-8 w-20 items-center gap-1 rounded border px-1.5 font-mono text-xs transition hover:bg-accent",
    changed ? "border-yellow-500 bg-yellow-50 text-gray-900 dark:bg-yellow-950/50 dark:text-yellow-100" : "border-input bg-background",
    !valid ? "border-red-500" : "",
  ].join(" ");

  return (
    <td className="px-1 py-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={triggerClass}>
            {!valid && <span className="text-red-500 font-bold">!</span>}
            <span>0x{value.toString(16).toUpperCase().padStart(2, "0")}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 space-y-3" align="start">
          <p className="text-xs font-semibold text-muted-foreground">Face ID picker — click to select</p>

          {/* Range 0x00–0x52 */}
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">0x00–0x52</p>
            <div className="grid gap-px" style={{ gridTemplateColumns: "repeat(16, 1fr)" }}>
              {VALID_FACE_RANGE1.map((id) => (
                <button
                  key={id}
                  title={`0x${id.toString(16).toUpperCase().padStart(2, "0")} (${id})`}
                  onClick={() => pick(id)}
                  className={`h-5 w-5 rounded-sm border text-center text-[7px] font-mono leading-5 transition hover:scale-110 ${
                    id === value ? "border-yellow-400 ring-2 ring-yellow-400" : "border-transparent hover:border-foreground/30"
                  } bg-muted`}
                >
                  {id === value ? "✓" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Range 0x81–0xD4 */}
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">0x81–0xD4</p>
            <div className="grid gap-px" style={{ gridTemplateColumns: "repeat(16, 1fr)" }}>
              {VALID_FACE_RANGE2.map((id) => (
                <button
                  key={id}
                  title={`0x${id.toString(16).toUpperCase().padStart(2, "0")} (${id})`}
                  onClick={() => pick(id)}
                  className={`h-5 w-5 rounded-sm border text-center text-[7px] font-mono leading-5 transition hover:scale-110 ${
                    id === value ? "border-yellow-400 ring-2 ring-yellow-400" : "border-transparent hover:border-foreground/30"
                  } bg-muted`}
                >
                  {id === value ? "✓" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Direct entry */}
          <div className="flex items-center gap-2 border-t pt-2">
            <span className="text-xs text-muted-foreground">Direct (0–255):</span>
            <Input
              type="number" min={0} max={255}
              value={value}
              className={`h-7 w-20 font-mono text-xs ${!valid ? "border-red-500" : ""}`}
              onChange={(e) => onChange(Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))}
            />
            {!valid && <span className="text-xs text-red-500">invalid — no face drawn</span>}
          </div>
        </PopoverContent>
      </Popover>
    </td>
  );
}

function NibbleCell({ value, changed, onChange }: {
  value: number; changed: boolean; onChange: (v: number) => void;
}) {
  return (
    <td className="px-1 py-1">
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`h-8 w-14 rounded border px-1 text-xs font-mono ${
          changed
            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/50"
            : "border-input bg-background"
        }`}
      >
        {TSB_ATTRIBUTE_SCALE.map((v, i) => (
          <option key={i} value={i}>{v}</option>
        ))}
      </select>
    </td>
  );
}

interface PlayerRowProps {
  pos: PosDef;
  cur: Uint8Array;
  orig: Uint8Array;
  onNibble: (byteIdx: number, hi: boolean, value: number) => void;
  onFace: (value: number) => void;
}

function PlayerRow({ pos, cur, orig, onNibble, onFace }: PlayerRowProps) {
  const nb = (bi: number, hi: boolean) => nibble(cur, bi, hi);
  const nbChanged = (bi: number, hi: boolean) => nibble(cur, bi, hi) !== nibble(orig, bi, hi);
  const faceChanged = (cur[2] ?? 0) !== (orig[2] ?? 0);

  return (
    <tr className="border-t hover:bg-accent/20">
      <td className="w-12 px-2 py-1 font-mono text-xs font-bold text-muted-foreground">
        {pos.label}
      </td>
      <NibbleCell value={nb(0, true)}  changed={nbChanged(0, true)}  onChange={(v) => onNibble(0, true,  v)} />
      <NibbleCell value={nb(0, false)} changed={nbChanged(0, false)} onChange={(v) => onNibble(0, false, v)} />
      <NibbleCell value={nb(1, true)}  changed={nbChanged(1, true)}  onChange={(v) => onNibble(1, true,  v)} />
      <NibbleCell value={nb(1, false)} changed={nbChanged(1, false)} onChange={(v) => onNibble(1, false, v)} />
      <FaceCell value={cur[2] ?? 0} changed={faceChanged} onChange={onFace} />
      {pos.type === "qb" && (
        <>
          <NibbleCell value={nb(3, true)}  changed={nbChanged(3, true)}  onChange={(v) => onNibble(3, true,  v)} />
          <NibbleCell value={nb(3, false)} changed={nbChanged(3, false)} onChange={(v) => onNibble(3, false, v)} />
          <NibbleCell value={nb(4, true)}  changed={nbChanged(4, true)}  onChange={(v) => onNibble(4, true,  v)} />
          <NibbleCell value={nb(4, false)} changed={nbChanged(4, false)} onChange={(v) => onNibble(4, false, v)} />
        </>
      )}
      {(pos.type === "skill" || pos.type === "def" || pos.type === "kick") && (
        <>
          <NibbleCell value={nb(3, true)}  changed={nbChanged(3, true)}  onChange={(v) => onNibble(3, true,  v)} />
          <NibbleCell value={nb(3, false)} changed={nbChanged(3, false)} onChange={(v) => onNibble(3, false, v)} />
        </>
      )}
    </tr>
  );
}

interface GroupTableProps {
  headers: string[];
  posIndices: number[];
  rom: Uint8Array;
  originalRom: Uint8Array;
  base: number;
  teamIdx: number;
  onNibble: (posIdx: number, byteIdx: number, hi: boolean, value: number) => void;
  onFace: (posIdx: number, value: number) => void;
}

function GroupTable({ headers, posIndices, rom, originalRom, base, teamIdx, onNibble, onFace }: GroupTableProps) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
          <tr>
            <th className="w-12 px-2 py-2">Pos</th>
            {headers.map((h) => <th key={h} className="px-1 py-2 whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {posIndices.map((pi) => (
            <PlayerRow
              key={pi}
              pos={POSITIONS[pi]}
              cur={getPlayerBytes(rom, base, teamIdx, pi)}
              orig={getPlayerBytes(originalRom, base, teamIdx, pi)}
              onNibble={(bi, hi, v) => onNibble(pi, bi, hi, v)}
              onFace={(v) => onFace(pi, v)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlayerAbilitiesEditor() {
  const { rom, originalRom, romName, setBytes, edits } = useRom();

  const [base, setBase] = useState<number | null>(() => {
    try { const s = localStorage.getItem(LS_KEY); return s ? parseInt(s) : null; } catch { return null; }
  });
  const [showSetup, setShowSetup] = useState(false);
  const [manualOffset, setManualOffset] = useState("");
  const [teamIdx, setTeamIdx] = useState(0);
  const [group, setGroup] = useState<GroupId>("qb");

  const detectedBase = useMemo(() => {
    if (!originalRom) return null;
    return detectBase(originalRom);
  }, [originalRom]);

  function activate(offset: number) {
    setBase(offset);
    try { localStorage.setItem(LS_KEY, String(offset)); } catch {}
    setShowSetup(false);
  }

  function handleNibble(posIdx: number, byteIdx: number, hi: boolean, value: number) {
    if (!rom || base === null) return;
    const offset = base + teamIdx * TEAM_BYTES + POS_OFFSETS[posIdx] + byteIdx;
    const b = rom[offset] ?? 0;
    const newByte = hi ? ((value & 0xf) << 4) | (b & 0x0f) : (b & 0xf0) | (value & 0xf);
    setBytes(offset, new Uint8Array([newByte]));
  }

  function handleFace(posIdx: number, value: number) {
    if (!rom || base === null) return;
    const offset = base + teamIdx * TEAM_BYTES + POS_OFFSETS[posIdx] + 2;
    setBytes(offset, new Uint8Array([value & 0xff]));
  }

  if (!rom) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground">
        Upload a ROM to use the abilities editor.
      </div>
    );
  }

  if (!base || showSetup) {
    return (
      <div className="mx-auto max-w-lg py-4 space-y-4">
        {showSetup && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Settings</span>
            <Button variant="ghost" size="sm" onClick={() => setShowSetup(false)}>Cancel</Button>
          </div>
        )}
        <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-6 space-y-3 text-center">
          <p className="text-sm font-semibold">Player Abilities Editor</p>
          {detectedBase !== null ? (
            <>
              <p className="text-xs text-muted-foreground">
                Abilities block found at file offset{" "}
                <span className="font-mono">0x{detectedBase.toString(16).toUpperCase()}</span>{" "}
                (auto-detected via Buffalo Bills QB1 signature).
              </p>
              <Button size="lg" className="gap-2" onClick={() => activate(detectedBase)}>
                <Wand2 className="size-5" /> Load abilities
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Could not auto-detect the abilities block. Enter the file offset of the first
                team's abilities data (hex).
              </p>
              <div className="flex items-center justify-center gap-2">
                <Input
                  className="w-32 font-mono text-sm"
                  placeholder="0x????"
                  value={manualOffset}
                  onChange={(e) => setManualOffset(e.target.value)}
                />
                <Button onClick={() => {
                  const n = parseInt(manualOffset.replace(/^0x/i, ""), 16);
                  if (!isNaN(n)) activate(n);
                }}>
                  Set offset
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const editCount = edits.size;

  const GROUPS: { id: GroupId; label: string }[] = [
    { id: "qb",      label: "Quarterbacks" },
    { id: "skill",   label: "Skill Players" },
    { id: "oline",   label: "O-Line" },
    { id: "defense", label: "Defense" },
    { id: "special", label: "Special Teams" },
  ];

  const QB_HEADERS    = ["Rush Pwr", "Run Spd", "Max Spd", "Hit Pwr", "Face", "Pas Spd", "Pas Ctrl", "Pas Acc", "Avd Blk"];
  const SKILL_HEADERS = ["Rush Pwr", "Run Spd", "Max Spd", "Hit Pwr", "Face", "Ball Ctrl", "Recep"];
  const OL_HEADERS    = ["Rush Pwr", "Run Spd", "Max Spd", "Hit Pwr", "Face"];
  const DEF_HEADERS   = ["Rush Pwr", "Run Spd", "Max Spd", "Hit Pwr", "Face", "Pass Int", "Quick"];
  const KICK_HEADERS  = ["Rush Pwr", "Run Spd", "Max Spd", "Hit Pwr", "Face", "Kick Abl", "Avd Blk"];

  const byGroup: Record<GroupId, number[]> = {
    qb:      POSITIONS.map((p, i) => ({ p, i })).filter(({ p }) => p.type === "qb").map(({ i }) => i),
    skill:   POSITIONS.map((p, i) => ({ p, i })).filter(({ p }) => p.type === "skill").map(({ i }) => i),
    oline:   POSITIONS.map((p, i) => ({ p, i })).filter(({ p }) => p.type === "ol").map(({ i }) => i),
    defense: POSITIONS.map((p, i) => ({ p, i })).filter(({ p }) => p.type === "def").map(({ i }) => i),
    special: POSITIONS.map((p, i) => ({ p, i })).filter(({ p }) => p.type === "kick").map(({ i }) => i),
  };

  const headersByGroup: Record<GroupId, string[]> = {
    qb: QB_HEADERS, skill: SKILL_HEADERS, oline: OL_HEADERS, defense: DEF_HEADERS, special: KICK_HEADERS,
  };

  const tableProps: Omit<GroupTableProps, "headers" | "posIndices"> = {
    rom, originalRom: originalRom!, base, teamIdx,
    onNibble: handleNibble,
    onFace: handleFace,
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
      {/* Team sidebar */}
      <aside className="rounded-lg border bg-card p-2">
        <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          Teams ({TEAM_COUNT})
        </div>
        <div className="max-h-[70vh] space-y-0.5 overflow-auto">
          {TEAM_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => setTeamIdx(i)}
              className={`w-full rounded px-2 py-1.5 text-left text-sm transition ${
                i === teamIdx ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </aside>

      {/* Main panel */}
      <div className="space-y-3">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={editCount === 0} onClick={() => downloadBlob(romName ?? "modified.nes", rom)}>
            <Download className="size-4" /> Export ROM
            {editCount > 0 && (
              <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs">{editCount}</span>
            )}
          </Button>
          <Button
            variant="outline" size="sm"
            disabled={editCount === 0 || !originalRom}
            onClick={() => originalRom && downloadBlob((romName ?? "rom") + ".ips", buildIPS(originalRom, rom))}
          >
            <FileCode className="size-4" /> Export IPS
          </Button>
          {editCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {editCount} byte{editCount === 1 ? "" : "s"} modified
            </span>
          )}
          <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={() => setShowSetup(true)}>
            <Settings className="size-4" /> Settings
          </Button>
        </div>

        {/* Group tabs */}
        <div className="flex flex-wrap gap-1 border-b pb-2">
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
        </div>

        {/* Attribute table */}
        <div className="overflow-hidden rounded-lg border bg-card">
          <GroupTable
            {...tableProps}
            headers={headersByGroup[group]}
            posIndices={byGroup[group]}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Abilities base: 0x{base.toString(16).toUpperCase()} · {TEAM_BYTES} bytes/team · {TEAM_COUNT} teams
        </p>
      </div>
    </div>
  );
}
