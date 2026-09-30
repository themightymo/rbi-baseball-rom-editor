import { useMemo } from "react";
import { useRom } from "@/lib/romStore";
import {
  MAX_LAST_CHARS, MAX_NAME_CHARS, decToBcd, loadTeams, namePool, namePoolUsed, repackName,
  type Player, type TeamData,
} from "@/lib/nameLoader";

export interface NameLimits { maxFirst: number; maxLast: number }

/**
 * Player names and jerseys from the live ROM, plus writers that repack the name block so a
 * name can grow into space other names gave up. Offsets move on every rename, so always
 * go through this rather than caching a player's offset.
 */
export function usePlayerNames() {
  const { rom, originalRom, hasINES, setBytes } = useRom();

  const originalResult = useMemo(() => (originalRom ? loadTeams(originalRom, hasINES) : null), [originalRom, hasINES]);
  const pool = useMemo(() => (originalRom ? namePool(originalRom, hasINES) : null), [originalRom, hasINES]);
  const liveResult = useMemo(() => (rom ? loadTeams(rom, hasINES) : null), [rom, hasINES]);

  return useMemo(() => {
    const teams: TeamData[] | null = Array.isArray(liveResult) ? liveResult : null;
    const originalTeams: TeamData[] | null = Array.isArray(originalResult) ? originalResult : null;
    const error = typeof originalResult === "string" ? originalResult : !pool && originalRom ? "Couldn't find the player name block." : null;
    const find = (ts: TeamData[] | null, team: number, slot: number): Player | undefined =>
      ts?.[team]?.players.find((p) => p.slot === slot);

    const capacity = pool ? pool.end - pool.start : 0;
    const used = rom && pool ? namePoolUsed(rom, hasINES, pool) : 0;
    const free = capacity - used;

    return {
      teams,
      originalTeams,
      error,
      /** Letters left in the shared name pool. */
      pool: { capacity, used, free },
      player: (team: number, slot: number) => find(teams, team, slot),
      original: (team: number, slot: number) => find(originalTeams, team, slot),

      /** How long each half of a name may get, given the other half and the pool's free space. */
      limits: (first: string, last: string): NameLimits => {
        const room = first.length + last.length + Math.max(0, free);
        const total = Math.min(MAX_NAME_CHARS, room);
        return {
          maxFirst: Math.max(first.length, total - last.length),
          maxLast: Math.max(last.length, Math.min(MAX_LAST_CHARS, total - first.length)),
        };
      },

      /** Returns an error message if the name didn't fit, otherwise null. */
      setName: (team: number, slot: number, first: string, last: string): string | null => {
        if (!rom || !pool) return "No ROM loaded.";
        if (last.length > MAX_LAST_CHARS || first.length + last.length > MAX_NAME_CHARS) return "Name is too long to show in the game.";
        const bytes = repackName(rom, hasINES, pool, team, slot, first, last);
        if (typeof bytes === "string") return bytes;
        setBytes(pool.tableOffset, bytes);
        return null;
      },

      setJersey: (team: number, slot: number, n: number) => {
        const p = find(teams, team, slot);
        if (p) setBytes(p.offset, new Uint8Array([decToBcd(n)]));
      },
    };
  }, [rom, originalRom, hasINES, setBytes, liveResult, originalResult, pool]);
}

/** Shortens a first name to its initial, the way the game itself abbreviates ("R."). */
export function toInitial(first: string): string {
  return first ? `${first[0]}.` : first;
}
