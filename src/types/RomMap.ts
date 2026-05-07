export type FieldType = "text" | "number" | "enum" | "raw";

export interface FieldDef {
  start: number;
  length: number;
  type: FieldType;
  min?: number;
  max?: number;
  values?: Record<string, string>; // enum byte(hex) -> label
  encoding?: string; // optional named encoding override
}

export interface PlayerRecordDef {
  offset: number | null;
  recordLength: number | null;
  count: number | null;
  teamGrouping: { type: "fixed"; playersPerTeam: number | null };
  fields: Record<string, FieldDef>;
}

export interface TeamRecordDef {
  offset: number | null;
  recordLength: number | null;
  count: number | null;
  fields: Record<string, FieldDef>;
}

export interface RomMap {
  game: string;
  platform: string;
  romVersion: string;
  hasINESHeader: boolean;
  checksum: string | null;
  encoding: {
    type: "ascii" | "custom";
    characterMap: Record<string, string>; // hex byte -> char
  };
  players: PlayerRecordDef;
  teams: TeamRecordDef;
  notes: { offset: number; length: number; label: string }[];
}

export const DEFAULT_ROM_MAP: RomMap = {
  game: "Tecmo Super Bowl",
  platform: "NES",
  romVersion: "unknown",
  hasINESHeader: true,
  checksum: null,
  encoding: { type: "ascii", characterMap: {} },
  players: {
    offset: null,
    recordLength: null,
    count: null,
    teamGrouping: { type: "fixed", playersPerTeam: null },
    fields: {},
  },
  teams: {
    offset: null,
    recordLength: null,
    count: null,
    fields: {},
  },
  notes: [],
};
