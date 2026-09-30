import { useState } from "react";
import { Pencil } from "lucide-react";
import { useRom } from "@/lib/romStore";
import {
  TEAM_TEXT_ALLOWED,
  TEAM_TEXT_MAX,
  readTeamText,
  teamTextFreeBytes,
  writeTeamText,
  type TeamText,
  type TeamTextField,
} from "@/lib/tsbRoster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Button + popup for changing a regular team's city, nickname and abbreviation in the ROM. */
export function TeamRenameDialog({ teamIdx }: { teamIdx: number }) {
  const { rom, originalRom, hasINES, setBytes } = useRom();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ city: "", nickname: "", abbr: "" });
  const [error, setError] = useState<string | null>(null);

  const text = rom ? readTeamText(rom, hasINES) : null;
  const pick = (t: TeamText) => ({
    city: t.city[teamIdx]!,
    nickname: t.nickname[teamIdx]!,
    abbr: t.abbr[teamIdx]!,
  });
  const orig = originalRom ? readTeamText(originalRom, hasINES) : null;
  if (!rom || !originalRom || !text) return null;

  const onOpenChange = (o: boolean) => {
    if (o) setDraft(pick(text));
    setError(null);
    setOpen(o);
  };

  const set = (field: TeamTextField, value: string) => {
    const v = value.toUpperCase();
    if (!TEAM_TEXT_ALLOWED.test(v)) return;
    setDraft((d) => ({ ...d, [field]: v }));
    setError(null);
  };

  const save = () => {
    const city = draft.city.trim();
    const nickname = draft.nickname.trim();
    const abbr = draft.abbr.trim();
    if (!city || !nickname || !abbr)
      return setError("City, team name and abbreviation can't be empty.");
    const patch = writeTeamText(rom, originalRom, hasINES, teamIdx, { city, nickname, abbr });
    if (typeof patch === "string") return setError(patch);
    if (patch.bytes.length) setBytes(patch.offset, patch.bytes);
    setOpen(false);
  };

  const restore = () => orig && setDraft(pick(orig));

  const free = teamTextFreeBytes(rom, originalRom, hasINES);
  const field = (key: TeamTextField, label: string) => {
    const changed = orig && draft[key] !== orig[key][teamIdx];
    return (
      <div className="space-y-1">
        <Label htmlFor={`team-${key}`}>{label}</Label>
        <Input
          id={`team-${key}`}
          value={draft[key]}
          maxLength={TEAM_TEXT_MAX[key]}
          onChange={(e) => set(key, e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className={`font-mono uppercase ${changed ? "border-warning bg-warning/10" : ""}`}
        />
        <p className="text-right text-[10px] text-muted-foreground">
          {draft[key].length}/{TEAM_TEXT_MAX[key]}
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> Rename team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rename team</DialogTitle>
          <DialogDescription>
            Letters, numbers, spaces and periods only — the game shows team names in capitals.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_5rem]">
          {field("city", "City")}
          {field("nickname", "Team name")}
          {field("abbr", "Short")}
        </div>
        <p className="text-xs text-muted-foreground">
          All team names share one block of ROM space ({free} letters free right now). The short
          name (BUF., JETS…) is always 4 characters; shorter ones are padded with spaces.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={restore}>
            Restore original
          </Button>
          <Button size="sm" onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
