import { useMemo, useState } from "react";
import { Palette, Type } from "lucide-react";
import { useRom } from "@/lib/romStore";
import { NES_RGB } from "@/core/nes/palette";
import {
  readRbiTeamAbbreviation,
  readRbiUniformColors,
  writeRbiTeamAbbreviation,
  writeRbiUniformColors,
} from "@/games/rbi/teamCustomization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RbiTeamEditor({ teamId, editable }: { teamId: number; editable: boolean }) {
  const { rom, setBytes } = useRom();
  const data = useMemo(() => {
    if (!rom) return null;
    try {
      return {
        abbreviation: readRbiTeamAbbreviation(rom, teamId),
        colors: readRbiUniformColors(rom, teamId),
      };
    } catch {
      return null;
    }
  }, [rom, teamId]);
  const [draft, setDraft] = useState<string | null>(null);
  if (!rom || !data) return null;
  const abbreviation = draft ?? data.abbreviation;
  const apply = (next: Uint8Array) => setBytes(0, next);

  return (
    <section className="rbi-card grid gap-5 p-4 lg:grid-cols-[14rem_1fr]">
      <div>
        <div className="flex items-center gap-2 text-[#ffd43b]">
          <Type className="size-4" />
          <h3 className="text-xs">Team name</h3>
        </div>
        <p className="mt-2 text-[8px] leading-relaxed text-muted-foreground">
          RBI stores each team’s in-game identity as a two-letter tile mark.
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            aria-label="Two-letter team name"
            value={abbreviation}
            maxLength={2}
            disabled={!editable}
            onChange={(event) => setDraft(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            className="w-20 text-center text-base uppercase"
          />
          <Button
            size="sm"
            disabled={!editable || abbreviation.length !== 2 || abbreviation === data.abbreviation}
            onClick={() => {
              apply(writeRbiTeamAbbreviation(rom, teamId, abbreviation));
              setDraft(null);
            }}
          >
            Apply
          </Button>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 text-[#ffd43b]">
          <Palette className="size-4" />
          <h3 className="text-xs">Uniform colors</h3>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ColorField
            label="Cap & bat"
            value={data.colors.capAndBat}
            disabled={!editable}
            onChange={(capAndBat) =>
              apply(
                writeRbiUniformColors(rom, teamId, {
                  capAndBat,
                  jerseyAndPants: data.colors.jerseyAndPants,
                }),
              )
            }
          />
          <ColorField
            label="Jersey & pants"
            value={data.colors.jerseyAndPants}
            disabled={!editable}
            onChange={(jerseyAndPants) =>
              apply(
                writeRbiUniformColors(rom, teamId, {
                  capAndBat: data.colors.capAndBat,
                  jerseyAndPants,
                }),
              )
            }
          />
        </div>
      </div>
    </section>
  );
}

function ColorField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label className="flex items-center gap-2">
        <span className="size-5 border border-white" style={{ backgroundColor: NES_RGB[value] }} />
        {label} · ${value.toString(16).padStart(2, "0").toUpperCase()}
      </Label>
      <div className="mt-2 grid grid-cols-8 gap-1">
        {NES_RGB.map((color, index) => (
          <button
            key={index}
            type="button"
            disabled={disabled}
            aria-label={`${label} color ${index}`}
            aria-pressed={index === value}
            onClick={() => onChange(index)}
            className={`aspect-square min-w-4 border ${index === value ? "border-[#ffd43b] ring-1 ring-[#ffd43b]" : "border-white/30"}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}
