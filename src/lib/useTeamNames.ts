import { useMemo } from "react";
import { useRom } from "@/lib/romStore";
import { readTeamText, teamNameFrom } from "@/lib/tsbRoster";

/** Team display names as currently stored in the ROM, so renamed teams show everywhere. */
export function useTeamNames() {
  const { rom, hasINES } = useRom();
  const text = useMemo(() => (rom ? readTeamText(rom, hasINES) : null), [rom, hasINES]);
  return useMemo(() => (team: number) => teamNameFrom(text, team), [text]);
}
