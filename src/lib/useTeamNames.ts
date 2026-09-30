import { useMemo } from "react";
import { useRom } from "@/lib/romStore";
import { readTeamText, teamAbbrFrom, teamNameFrom } from "@/lib/tsbRoster";

/** Team names and abbreviations as currently stored in the ROM, so renames show everywhere. */
export function useTeamNames() {
  const { rom, hasINES } = useRom();
  const text = useMemo(() => (rom ? readTeamText(rom, hasINES) : null), [rom, hasINES]);
  return useMemo(
    () => ({
      name: (team: number) => teamNameFrom(text, team),
      abbr: (team: number) => teamAbbrFrom(text, team),
    }),
    [text],
  );
}
