import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCaliforniaTeam,
  parseRbiTeams,
  RBI_TEAM_DEFINITIONS,
  teamOffset,
} from "../src/games/rbi/teams.ts";

const TEAM_ROSTERS = [
  [
    "Pettis",
    "DCincs",
    "Joyner",
    "Jacksn",
    "Dwning",
    "Grich",
    "Schfld",
    "Boone",
    "Burlsn",
    "Hendrk",
    "Wilfng",
    "Jones",
    "Witt",
    "Sutton",
    "Corbet",
    "Moore",
  ],
  [
    "Barret",
    "Bucknr",
    "Boggs",
    "J.Rice",
    "Baylor",
    "DwEvns",
    "Gedman",
    "S.Owen",
    "Hndrsn",
    "Burks",
    "Armas",
    "Sullvn",
    "Clemns",
    "Hurst",
    "Schrld",
    "Stanly",
  ],
  [
    "Tramml",
    "Gibson",
    "DaEvns",
    "Nokes",
    "Herndn",
    "Lemon",
    "Whitkr",
    "Brookn",
    "Shrdan",
    "Heath",
    "Madlck",
    "Bergmn",
    "Alxndr",
    "Morris",
    "Hrndez",
    "King",
  ],
  [
    "Gladdn",
    "Gaetti",
    "Pucket",
    "Hrbek",
    "Brnsky",
    "Gagne",
    "Laudnr",
    "Lmbrdz",
    "Smally",
    "Davdsn",
    "Bush",
    "Larkin",
    "Viola",
    "Blylvn",
    "Brnger",
    "Reardn",
  ],
  [
    "Hatchr",
    "J.Cruz",
    "Wallng",
    "GDavis",
    "K.Bass",
    "Doran",
    "Rynlds",
    "Ashby",
    "Lopes",
    "Garner",
    "D.Thon",
    "Puhl",
    "N.Ryan",
    "MScott",
    "Kerfld",
    "DSmith",
  ],
  [
    "Dykstr",
    "Wilson",
    "Herndz",
    "Carter",
    "Strwby",
    "Backmn",
    "Knight",
    "Sntana",
    "Heep",
    "Teufel",
    "Johnsn",
    "Mazzli",
    "Gooden",
    "Ojeda",
    "Orosco",
    "McDowl",
  ],
  [
    "Colman",
    "OSmith",
    "T.Herr",
    "JClark",
    "McGee",
    "Pndltn",
    "Ford",
    "T.Pena",
    "Oqendo",
    "Morris",
    "Lindmn",
    "Lake",
    "Tudor",
    "Cox",
    "Dayley",
    "Worrel",
  ],
  [
    "JUribe",
    "Mitchl",
    "Leonrd",
    "Mldndo",
    "WClark",
    "Brenly",
    "CDavis",
    "Thmpsn",
    "Spilmn",
    "Speier",
    "Aldrte",
    "Yngbld",
    "Krukow",
    "Reushl",
    "Grelts",
    "Robnsn",
  ],
  [
    "Rndlph",
    "Mtngly",
    "Bell",
    "Cansco",
    "Ripken",
    "Baines",
    "Brett",
    "Schrdr",
    "McGwir",
    "Seitzr",
    "Moltor",
    "Franco",
    "J.Key",
    "Sbrhgn",
    "Righti",
    "Henke",
  ],
  [
    "Raines",
    "Sndbrg",
    "Sntago",
    "Dawson",
    "EDavis",
    "Schmdt",
    "Gllrga",
    "Pedriq",
    "Guerro",
    "Murphy",
    "Gwynn",
    "Kruk",
    "Vlnzla",
    "Sutclf",
    "Franco",
    "Bedrsn",
  ],
] as const;

const BATTERS = [
  ["Pettis", "L", 258, 5, 20, 759, 140],
  ["DCincs", "R", 256, 26, 26, 885, 124],
  ["Joyner", "L", 290, 22, 14, 864, 130],
  ["Jacksn", "L", 275, 39, 23, 945, 128],
  ["Dwning", "R", 267, 20, 20, 867, 124],
  ["Grich", "R", 268, 9, 21, 819, 124],
  ["Schfld", "R", 249, 13, 28, 861, 130],
  ["Boone", "R", 251, 7, 24, 831, 120],
  ["Burlsn", "R", 284, 5, 17, 789, 134],
  ["Hendrk", "R", 272, 14, 20, 849, 124],
  ["Wilfng", "L", 249, 3, 29, 816, 132],
  ["Jones", "L", 250, 17, 32, 891, 128],
] as const;

const PITCHERS = [
  ["Witt", "R", "standard", 284, 4, 9, 7, 144, 160, 186, 50, 115, 140],
  ["Sutton", "R", "standard", 118, 5, 8, 5, 141, 166, 178, 50, 113, 143],
  ["Corbet", "R", "standard", 110, 8, 6, 5, 138, 162, 173, 15, 114, 142],
  ["Moore", "R", "standard", 297, 2, 4, 2, 149, 170, 197, 13, 116, 139],
] as const;

function encodeName(name: string): number[] {
  return Array.from(name.padEnd(6, " "), (character) => {
    if (character === " ") return 0x24;
    if (character === ".") return 0x25;
    const code = character.charCodeAt(0);
    return code >= 0x41 && code <= 0x5a ? 0x0a + code - 0x41 : 0x28 + code - 0x61;
  });
}

function allTeamsFixture(): Uint8Array {
  const rom = new Uint8Array(0xa10);
  for (const [teamId, roster] of TEAM_ROSTERS.entries()) {
    for (const [slot, name] of roster.entries()) {
      const offset = teamOffset(teamId) + slot * 16;
      if (slot < 12) {
        rom.set([slot, ...encodeName(name), 0, 100, 10, 20, 0x20, 0x03, 128, 0, 0], offset);
      } else {
        rom.set(
          [slot, ...encodeName(name), 0x40, 150, 140, 160, 180, 0x55, 20, 0x70, 0x90],
          offset,
        );
      }
    }
  }
  return rom;
}

function californiaFixture(): Uint8Array {
  const rom = new Uint8Array(0x110);
  for (const [slot, batter] of BATTERS.entries()) {
    const [name, bats, average, homeRuns, contact, power, speed] = batter;
    rom.set(
      [
        slot,
        ...encodeName(name),
        bats === "L" ? 1 : 0,
        average - 150,
        homeRuns,
        contact,
        power & 0xff,
        power >>> 8,
        speed,
        0,
        0,
      ],
      0x10 + slot * 16,
    );
  }
  for (const [index, pitcher] of PITCHERS.entries()) {
    const [
      name,
      throws,
      delivery,
      era,
      drop,
      leftCurve,
      rightCurve,
      slow,
      normal,
      fast,
      stamina,
      unknown1,
      unknown2,
    ] = pitcher;
    const slot = 12 + index;
    const style = (throws === "L" ? 1 : 0) | (delivery === "sidearm" ? 2 : 0);
    rom.set(
      [
        slot,
        ...encodeName(name),
        (drop << 4) | style,
        era - 100,
        slow,
        normal,
        fast,
        (leftCurve << 4) | rightCurve,
        stamina,
        unknown1,
        unknown2,
      ],
      0x10 + slot * 16,
    );
  }
  return rom;
}

test("parses all sixteen California records without crossing boundaries", () => {
  const team = parseCaliforniaTeam(californiaFixture());
  assert.equal(team.id, 0);
  assert.equal(team.name, "California");
  assert.equal(team.abbreviation, "Ca");
  assert.equal(team.offset, 0x10);
  assert.equal(team.rawBytes.length, 0x100);
  assert.equal(team.batters.length, 12);
  assert.equal(team.pitchers.length, 4);
  assert.deepEqual(
    team.batters.map(({ name }) => name),
    BATTERS.map(([name]) => name),
  );
  assert.deepEqual(
    team.pitchers.map(({ name }) => name),
    PITCHERS.map(([name]) => name),
  );
  assert.deepEqual(
    [...team.batters, ...team.pitchers].map(({ rosterSlot, offset }) => [rosterSlot, offset]),
    Array.from({ length: 16 }, (_, slot) => [slot, 0x10 + slot * 16]),
  );
});

test("every decoded California value matches the published reference", () => {
  const team = parseCaliforniaTeam(californiaFixture());
  assert.deepEqual(
    team.batters.map((batter) => [
      batter.name,
      batter.bats,
      batter.battingAverage,
      batter.homeRuns,
      batter.contact,
      batter.power,
      batter.speed,
    ]),
    BATTERS,
  );
  assert.deepEqual(
    team.batters.map(({ unknown }) => unknown),
    Array.from({ length: 12 }, () => [0, 0]),
  );
  assert.deepEqual(
    team.pitchers.map((pitcher) => [
      pitcher.name,
      pitcher.throws,
      pitcher.delivery,
      pitcher.earnedRunAverage,
      pitcher.drop,
      pitcher.leftCurve,
      pitcher.rightCurve,
      pitcher.slowPitchVelocity,
      pitcher.normalPitchVelocity,
      pitcher.fastPitchVelocity,
      pitcher.stamina,
      pitcher.unknown1,
      pitcher.unknown2,
    ]),
    PITCHERS,
  );
});

test("rejects a record-boundary mismatch instead of shifting the roster", () => {
  const rom = californiaFixture();
  rom[0x20] = 7;
  assert.throws(() => parseCaliforniaTeam(rom), /expected slot 1, found 7/);
});

test("parses all ten teams in verified ROM order", () => {
  const teams = parseRbiTeams(allTeamsFixture());
  assert.equal(teams.length, 10);
  assert.deepEqual(
    teams.map(({ name, abbreviation, offset }) => [name, abbreviation, offset]),
    RBI_TEAM_DEFINITIONS.map(({ name, abbreviation }, teamId) => [
      name,
      abbreviation,
      0x10 + teamId * 0x100,
    ]),
  );
  assert.deepEqual(
    teams.map((team) => [...team.batters, ...team.pitchers].map(({ name }) => name)),
    TEAM_ROSTERS,
  );
});

test("stops at the first invalid team boundary", () => {
  const rom = allTeamsFixture();
  rom[teamOffset(4) + 5 * 16] = 99;
  assert.throws(() => parseRbiTeams(rom), /Houston record boundary mismatch/);
});

test("never parses a partial final team", () => {
  const rom = allTeamsFixture().slice(0, 0xa0f);
  assert.throws(() => parseRbiTeams(rom), /team 9 block is outside the ROM/);
});

test("All-Star teams contain standalone records rather than regular-team duplicates", () => {
  const teams = parseRbiTeams(allTeamsFixture());
  const regular = teams.slice(0, 8).flatMap((team) => [...team.batters, ...team.pitchers]);
  const allStars = teams.slice(8).flatMap((team) => [...team.batters, ...team.pitchers]);
  assert.equal(allStars.length, 32);
  assert.equal(
    allStars.some((allStar) =>
      regular.some((player) =>
        player.rawBytes.every((byte, index) => byte === allStar.rawBytes[index]),
      ),
    ),
    false,
  );
});
