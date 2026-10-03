import { useRom } from "@/lib/romStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toInitial, usePlayerNames } from "@/lib/usePlayerNames";
import { useTeamNames } from "@/lib/useTeamNames";
import { NamePoolMeter } from "@/components/NamePoolMeter";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// ─── Main component ───────────────────────────────────────────────────────────

export function PlayerNameEditor() {
  const { rom } = useRom();
  const { name: teamName } = useTeamNames();
  const names = usePlayerNames();
  const teams = names.teams;
  const loadError = names.error;

  // Current name from the live ROM, alongside the original for change highlighting
  function getCurrent(team: number, slot: number) {
    const p = names.player(team, slot);
    const o = names.original(team, slot);
    return {
      first: p?.first.trimEnd() ?? "",
      last: p?.last.trimEnd() ?? "",
      jersey: p?.jersey ?? 0,
      origFirst: o?.first.trimEnd() ?? "",
      origLast: o?.last.trimEnd() ?? "",
      origJersey: o?.jersey ?? 0,
    };
  }

  if (!rom) return null;

  if (loadError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">
          Couldn't find the player rosters in this ROM.
        </p>
        <p className="mt-1 text-muted-foreground">
          This editor expects an unmodified-layout NTSC Tecmo Super Bowl ROM. Heavily hacked ROMs
          may need the Advanced tools. <span className="font-mono text-xs">({loadError})</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="nes-window p-3">
        <NamePoolMeter />
      </div>

      {/* Teams */}
      <Accordion type="multiple" className="nes-window overflow-hidden">
        {teams?.map((team) => {
          const changedCount = team.players.filter((p) => {
            const cur = getCurrent(team.index, p.slot);
            return (
              cur.first !== cur.origFirst ||
              cur.last !== cur.origLast ||
              cur.jersey !== cur.origJersey
            );
          }).length;
          return (
            <AccordionItem
              key={team.index}
              value={`team-${team.index}`}
              className="border-b last:border-b-0"
            >
              <AccordionTrigger className="px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:no-underline hover:bg-muted/50">
                <span className="flex items-center gap-2">
                  {teamName(team.index)}
                  {changedCount > 0 && (
                    <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
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
                      const cur = getCurrent(team.index, p.slot);
                      const fnChanged = cur.first !== cur.origFirst;
                      const lnChanged = cur.last !== cur.origLast;
                      const jerseyChanged = cur.jersey !== cur.origJersey;
                      const { maxFirst, maxLast } = names.limits(cur.first, cur.last);
                      const canInitial =
                        cur.first.length > 2 ||
                        (cur.first.length === 2 && !cur.first.endsWith("."));
                      return (
                        <tr key={p.slot} className="border-t hover:bg-accent/20">
                          <td className="px-3 py-1">
                            <Input
                              type="number"
                              min={0}
                              max={99}
                              className={`h-8 w-12 text-center font-mono text-xs ${jerseyChanged ? "border-warning" : ""}`}
                              value={cur.jersey}
                              onChange={(e) =>
                                names.setJersey(team.index, p.slot, parseInt(e.target.value) || 0)
                              }
                            />
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-1">
                              <Input
                                className={`h-9 border-2 font-mono text-sm font-semibold ${fnChanged ? "border-warning" : "border-input"}`}
                                value={cur.first}
                                maxLength={maxFirst}
                                onChange={(e) =>
                                  names.setName(team.index, p.slot, e.target.value, cur.last)
                                }
                              />
                              {canInitial && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 shrink-0 px-2 font-mono text-xs"
                                  title={`Shorten to "${toInitial(cur.first)}" and free ${cur.first.length - 2} letters`}
                                  onClick={() =>
                                    names.setName(
                                      team.index,
                                      p.slot,
                                      toInitial(cur.first),
                                      cur.last,
                                    )
                                  }
                                >
                                  {toInitial(cur.first).toUpperCase()}
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              className={`h-9 border-2 font-mono text-sm font-semibold ${lnChanged ? "border-warning" : "border-input"}`}
                              value={cur.last}
                              maxLength={maxLast}
                              onChange={(e) =>
                                names.setName(team.index, p.slot, cur.first, e.target.value)
                              }
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
