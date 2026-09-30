import { useMemo } from "react";
import { useRom } from "@/lib/romStore";
import { Input } from "@/components/ui/input";
import { bcdToDec, decToBcd, loadTeams, splitName, type Player } from "@/lib/nameLoader";
import { TEAM_NAMES } from "@/lib/tsbRoster";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// ─── Main component ───────────────────────────────────────────────────────────

export function PlayerNameEditor() {
  const { rom, originalRom, hasINES, setBytes } = useRom();

  // Load teams from original ROM (stable offsets)
  const result = useMemo(() => {
    if (!originalRom) return null;
    return loadTeams(originalRom, hasINES);
  }, [originalRom, hasINES]);

  const teams = Array.isArray(result) ? result : null;
  const loadError = typeof result === "string" ? result : null;

  // For each player, read current name from live ROM at same offsets
  function getCurrent(p: Player) {
    if (!rom) return { first: p.first, last: p.last, jersey: p.jersey };
    const jerseyBcd = rom[p.offset];
    const rawBytes = rom.slice(p.offset + 1, p.offset + 1 + p.nameLength);
    const rawName = String.fromCharCode(...rawBytes);
    const { first, last } = splitName(rawName);
    return { first: first.trimEnd(), last: last.trimEnd(), jersey: bcdToDec(jerseyBcd) };
  }

  function writeName(p: Player, newFirst: string, newLast: string) {
    if (!rom) return;
    const combined = newFirst.toLowerCase() + newLast.toUpperCase();
    const bytes = new Uint8Array(p.nameLength).fill(0x20);
    for (let i = 0; i < Math.min(p.nameLength, combined.length); i++) {
      bytes[i] = combined.charCodeAt(i) & 0xff;
    }
    setBytes(p.offset + 1, bytes);
  }

  function writeJersey(p: Player, n: number) {
    setBytes(p.offset, new Uint8Array([decToBcd(n)]));
  }

  if (!rom) return null;

  if (loadError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">
          Couldn't find the player rosters in this ROM.
        </p>
        <p className="mt-1 text-muted-foreground">
          This editor expects an unmodified-layout NTSC Tecmo Super Bowl ROM. Heavily hacked
          ROMs may need the Advanced tools. <span className="font-mono text-xs">({loadError})</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Teams */}
      <Accordion type="multiple" className="rounded-lg border bg-card overflow-hidden">
        {teams?.map((team) => {
          const changedCount = team.players.filter((p) => {
            const cur = getCurrent(p);
            return cur.first !== p.first || cur.last !== p.last || cur.jersey !== p.jersey;
          }).length;
          return (
          <AccordionItem key={team.index} value={`team-${team.index}`} className="border-b last:border-b-0">
            <AccordionTrigger className="px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:no-underline hover:bg-muted/50">
              <span className="flex items-center gap-2">
                {TEAM_NAMES[team.index] ?? `Team ${team.index + 1}`}
                {changedCount > 0 && (
                  <span className="rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600 dark:text-yellow-400">
                    {changedCount} edited
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-14 px-3 py-2">Jersey</th>
                  <th className="px-2 py-2">First Name</th>
                  <th className="px-2 py-2">Last Name</th>
                </tr>
              </thead>
              <tbody>
                {team.players.map((p) => {
                  const cur = getCurrent(p);
                  const fnChanged = cur.first !== p.first;
                  const lnChanged = cur.last !== p.last;
                  const jerseyChanged = cur.jersey !== p.jersey;
                  const maxFirst = p.nameLength - cur.last.length;
                  const maxLast = p.nameLength - cur.first.length;
                  return (
                    <tr key={p.slot} className="border-t hover:bg-accent/20">
                      <td className="px-3 py-1">
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          className={`h-8 w-12 text-center font-mono text-xs ${jerseyChanged ? "border-yellow-500" : ""}`}
                          value={cur.jersey}
                          onChange={(e) => writeJersey(p, parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className={`h-9 border-2 font-mono text-sm font-semibold ${fnChanged ? "border-yellow-500" : "border-input"}`}
                          value={cur.first}
                          maxLength={maxFirst}
                          onChange={(e) => writeName(p, e.target.value, cur.last)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className={`h-9 border-2 font-mono text-sm font-semibold ${lnChanged ? "border-yellow-500" : "border-input"}`}
                          value={cur.last}
                          maxLength={maxLast}
                          onChange={(e) => writeName(p, cur.first, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </AccordionContent>
          </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
