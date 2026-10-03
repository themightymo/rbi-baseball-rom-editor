# RBI Baseball NES ROM Editor

## AI Vibe-Coding Roadmap and Build Instructions

## 1. Project Goal

Build a modern, browser-based ROM editor for the original NES version of **R.B.I. Baseball**, modeled architecturally and visually after:

https://github.com/themightymo/tecmo-rom-editor

The new application should allow a user to load their own legally obtained R.B.I. Baseball NES ROM, inspect game data, edit player/team attributes, save a modified ROM, and export changes as an IPS patch.

The ROM must remain entirely in the browser. Do not upload ROM data to a server.

The first goal is **not** to support every R.B.I. hack ever created.

The first goal is:

> Reliably load, understand, edit, and export a known-good original 98,448-byte R.B.I. Baseball NES ROM.

Once the clean original ROM is completely understood and tested, support for additional ROM variants can be added.

---

# 2. Starting Point

Do not build the app from scratch.

Clone:

https://github.com/themightymo/tecmo-rom-editor

into a new repository:

```text
rbi-rom-editor
```

Preserve as much generic infrastructure as practical.

The Tecmo project has already solved:

- browser ROM loading
- Uint8Array ROM manipulation
- original-ROM preservation
- byte-level change tracking
- revert/reset
- CRC32
- iNES detection
- ROM download
- IPS patch generation
- byte diffing
- project files
- localStorage
- hex inspection
- custom data layouts
- single-file builds
- React/Vite infrastructure
- NES-inspired interface conventions

Reuse those systems.

Do not rewrite working infrastructure unless there is a clear architectural reason.

---

# 3. Core Engineering Rule

Maintain a strict separation between:

## Generic ROM/NES infrastructure

and

## R.B.I.-specific game knowledge

The final architecture should move toward:

```text
src/

  core/
    rom/
      romStore.tsx
      checksum.ts
      diff.ts
      ips.ts
      download.ts
      projectFiles.ts

    nes/
      ines.ts
      encoding.ts
      chr.ts
      palette.ts
      tiles.ts

  games/
    rbi/
      profiles.ts
      detect.ts
      constants.ts
      types.ts
      teams.ts
      batters.ts
      pitchers.ts
      ratings.ts
      encoding.ts
      graphics.ts

  components/
    ...
```

Tecmo-specific code should not remain mixed into generic ROM utilities.

However:

**Do not perform a huge theoretical refactor before doing useful RBI work.**

Refactor only enough to allow clean reuse.

---

# 4. Development Philosophy

Follow these rules throughout the project.

## Rule 1 — Never guess ROM structures

Do not invent offsets, field sizes, encodings, formulas, or data structures.

Every ROM assumption must come from one of:

1. observed ROM bytes,
2. documented community research,
3. comparisons between known player values and ROM bytes,
4. emulator testing,
5. repeatable experiments.

Document uncertainty explicitly.

---

## Rule 2 — Separate known from suspected

Use terminology such as:

```text
confirmed
strongly inferred
suspected
unknown
```

Do not silently turn a theory into application logic.

---

## Rule 3 — Always preserve raw ROM offsets

Any parsed data record should retain enough information to locate the underlying bytes.

Example:

```ts
interface RbiBatter {
  teamId: number;
  rosterSlot: number;

  name: string;
  bats: "L" | "R";

  battingAverage: number;
  homeRuns: number;

  power: number;
  contact: number;
  speed: number;

  offset: number;
  rawBytes: Uint8Array;
}
```

We must always be able to answer:

> Which exact ROM bytes produced this value?

---

## Rule 4 — Parsing and writing must be symmetrical

For every editable property there should eventually be both:

```ts
decodeX(...)
```

and

```ts
encodeX(...)
```

or equivalent read/write functions.

Reading and immediately writing an unchanged value must reproduce the original bytes.

---

## Rule 5 — Make tiny edits

Never rewrite large ROM regions when changing one field unless the format genuinely requires repacking.

If Power occupies two bytes, changing Power should change those two bytes and nothing unrelated.

---

## Rule 6 — Protect the original ROM

Always preserve an immutable copy of the originally loaded ROM.

All changes should occur against a working copy.

---

# 5. Phase 0 — Clone and Stabilize

## Objective

Create the RBI repository without breaking the existing ROM editing infrastructure.

## Tasks

Clone the Tecmo project.

Rename:

```text
Tecmo Super Bowl Roster Editor
```

to something temporary such as:

```text
RBI Baseball ROM Editor
```

Remove Tecmo-specific landing-page language.

Keep working:

- ROM loading
- ROM checksum
- iNES detection
- save ROM
- undo all
- diff viewer
- hex viewer
- IPS export
- project/change tracking

Remove or disable UI that assumes football concepts.

Examples:

- formations
- QB/RB/WR positions
- helmets
- Tecmo faces
- Tecmo player ratings
- Tecmo team selection

Do not delete useful code until it is clear it will not be reused.

## Acceptance Criteria

The app starts.

A `.nes` file can be loaded.

The application displays:

- filename
- ROM size
- CRC32
- iNES status

The user can:

- download the unchanged ROM
- inspect the ROM in the hex viewer
- create an IPS patch after manually changing a byte through development/debug tooling

No Tecmo-specific parser is required to run the application.

Commit.

Suggested commit:

```text
chore: establish RBI editor from Tecmo ROM Editor foundation
```

---

# 6. Phase 1 — NES ROM Identification

## Objective

Correctly identify whether the loaded file looks like an R.B.I. Baseball ROM.

Create:

```text
src/games/rbi/profiles.ts
src/games/rbi/detect.ts
```

## Support Initially

Primary profile:

```text
Original clean RBI Baseball
98,448 bytes
16-byte iNES header
64 KB PRG
32 KB CHR
Mapper 206
```

Support both known licensed/unlicensed clean variants if their differences can be reliably detected.

Do not yet support stuffed/overstuffed ROMs for editing.

They may be recognized as unsupported variants.

## Return a structured detection result

Example:

```ts
interface RbiDetectionResult {
  isRbi: boolean;

  confidence: "exact" | "high" | "possible" | "unknown";

  profileId?: string;

  romSize: number;

  mapper?: number;
  prgSize?: number;
  chrSize?: number;

  warnings: string[];
}
```

Do not rely solely on filename.

Prefer:

1. known CRC where available,
2. iNES properties,
3. size,
4. known ROM signatures,
5. known data signatures.

## UI

Display something like:

```text
R.B.I. Baseball detected

Variant:
Clean original

ROM size:
98,448 bytes

Mapper:
206

Status:
Supported
```

Unknown ROM:

```text
This ROM does not match a currently supported RBI Baseball layout.

You may inspect it, but roster editing has been disabled.
```

## Acceptance Criteria

Known clean RBI ROM is recognized reliably.

Random NES ROM does not get identified as RBI simply because its size matches.

Commit.

---

# 7. Phase 2 — Build the ROM Research Toolkit

This phase is important.

Do not rush directly into a pretty player editor.

We want tools that allow us to investigate the ROM efficiently.

## Add or enhance:

### String search

Search for:

- player names
- team names
- known text strings

Support custom text encoding if necessary.

### Hex inspector

Allow:

- jumping to decimal/hex offset
- selecting byte ranges
- copying bytes
- showing file offset
- showing PRG-relative offset
- showing CPU address when calculable

### Byte annotation

Allow known byte ranges to display labels.

Example:

```text
0x12345  B1  Power low byte
0x12346  03  Power high byte
```

### Structured data experiment

Allow temporary record definitions.

Example:

```text
Record start
Record length

Byte 0 = field
Byte 1 = field
Bytes 2-3 = little-endian value
```

This can build on Tecmo's Custom Data Layout functionality.

## Acceptance Criteria

The developer can quickly inspect a candidate player record and correlate decoded values to underlying bytes.

Commit.

---

# 8. Phase 3 — Decode One Batter

## Objective

Completely understand one known batter before attempting an entire roster.

Start with a well-documented California player.

Good candidates include Gary Pettis or Reggie Jackson.

For the selected player, identify and verify:

- player name
- bats left/right
- displayed batting average
- displayed home runs
- contact
- power
- speed
- roster position/slot
- record boundaries

For power, verify the documented two-byte little-endian interpretation.

Example:

```text
B1 03
```

should decode as:

```text
0x03B1
```

which is:

```text
945
```

if the selected documented player is the appropriate test case.

## Create

```text
src/games/rbi/batters.ts
```

with pure functions.

Prefer APIs like:

```ts
parseBatter(
  rom: Uint8Array,
  offset: number
): RbiBatter
```

and later:

```ts
writeBatterPower(
  romOffset: number,
  value: number
): Uint8Array
```

## Unit Tests

Create tests for known values.

Examples conceptually:

```ts
expect(player.name).toBe("Jackson");
expect(player.power).toBe(945);
```

Use actual verified values from the ROM being tested.

Never alter a test merely to make incorrect parsing pass.

## Acceptance Criteria

One batter is completely decoded.

Every known field maps to documented ROM bytes.

Changing Power to a different value causes only the expected byte change.

Changing Power back produces the original ROM bytes.

Commit.

---

# 9. Phase 4 — Decode One Pitcher

## Objective

Determine the complete pitcher record format.

Identify:

- name
- throws left/right
- delivery type
- ERA
- sinker/drop rating
- left curve
- right curve
- slow pitch velocity
- normal pitch velocity
- fast pitch velocity
- stamina
- any unknown fields

Do not guess at unknown bytes.

Represent them explicitly:

```ts
unknown1: number;
unknown2: number;
```

until understood.

Create:

```text
src/games/rbi/pitchers.ts
```

## Acceptance Criteria

One known pitcher matches trusted documented values.

Changing one rating changes only the expected byte(s).

Commit.

---

# 10. Phase 5 — Decode California Completely

## Objective

Use California as the reference team.

Parse:

- all starters
- bench players
- pitchers

Determine:

- number of batters
- number of pitchers
- slot order
- lineup structure
- team record boundaries
- team-to-player references
- whether All-Star teams reuse player records or maintain copies

Create:

```text
src/games/rbi/teams.ts
```

Create the main data model:

```ts
interface RbiTeam {
  id: number;
  name: string;
  abbreviation: string;

  batters: RbiBatter[];
  pitchers: RbiPitcher[];
}
```

## Validation

Compare the decoded California roster against historically documented roster information.

Every player should be identifiable.

## Acceptance Criteria

California loads programmatically from ROM.

No player information is hardcoded merely to make the UI look correct.

The ROM itself remains the source of truth.

Commit.

---

# 11. Phase 6 — Decode All Ten Teams

Original selectable teams:

```text
California
Boston
Detroit
Minnesota
Houston
New York
St. Louis
San Francisco
American League All-Stars
National League All-Stars
```

Determine the actual ROM team order from the data.

Do not assume UI order and ROM order are necessarily identical without verification.

## Critical investigation

Determine whether All-Star players:

- duplicate player records,
- reference players from regular teams,
- use separate lineup tables,
- or use another mechanism.

Document the result.

## Acceptance Criteria

All ten teams display correct players.

Player values match known reference material where available.

No out-of-range records are parsed.

Commit.

---

# 12. Phase 7 — Round-Trip ROM Testing

Before building polished editing screens, prove the ROM parser/writer is trustworthy.

## Test A

Load ROM.

Make no changes.

Export ROM.

Expected:

```text
Original === Exported
```

byte-for-byte.

## Test B

Change exactly one batter Power rating.

Expected:

Only known Power bytes change.

## Test C

Change one pitcher attribute.

Expected:

Only its known byte(s) change.

## Test D

Change a value.

Change it back.

Expected:

ROM equals original again.

## Test E

Generate IPS.

Apply IPS externally to original ROM.

Expected result equals application-exported modified ROM.

## Acceptance Criteria

All tests pass.

Commit.

---

# 13. Phase 8 — Build the Primary RBI Interface

Now build the fun part.

Do not make the primary UI look like a database editor.

Make it feel visually inspired by the original R.B.I. Baseball interface while remaining usable.

Do not copy copyrighted artwork unnecessarily.

Recreate the feeling using:

- NES-like colors
- pixel typography
- panels
- simple baseball presentation
- original UI concepts

## Main screen

Team selector.

Then roster.

Suggested organization:

```text
TEAM

STARTING LINEUP

1
2
3
4
5
6
7
8
9

BENCH

PITCHERS
```

Clicking a player opens their editor.

---

# 14. Phase 9 — Batter Editor

Build a dedicated Batter Card.

Fields:

```text
Name
Bats
AVG
HR

Contact
Power
Speed
```

Clearly separate:

## Displayed historical stats

from:

## Gameplay ratings

Example:

```text
DISPLAY STATS

AVG  .275
HR   39
```

versus:

```text
GAME RATINGS

Power    945
Contact   23
Speed    128
```

Provide:

- original value
- current value
- reset field
- changed indicator

If pinch-hit behavior is understood and configurable, show an explanatory derived value.

Example:

```text
Base Power: 807
Pinch Hit Bonus: +64
First PH At-Bat Effective Power: 871
```

Do not imply this derived number is stored in the player record if it is not.

---

# 15. Phase 10 — Pitcher Editor

Fields:

```text
Name
Throws
Delivery
ERA

Drop / Sinker
Curve Left
Curve Right

Slow Pitch
Normal Pitch
Fast Pitch

Stamina
```

Unknown attributes should either:

- remain hidden from normal users,
- or appear under Advanced.

Do not invent friendly names for unknown bytes.

---

# 16. Phase 11 — Advanced Roster Editor

Provide a table-oriented editor for power users.

Suggested tabs:

```text
Batters
Pitchers
All Players
```

Allow bulk scanning and editing.

Changed values should be visually highlighted.

Do not remove the game-style player card.

The table complements it.

---

# 17. Phase 12 — Save and Share

Reuse Tecmo functionality.

Include:

## Save ROM As

Download edited `.nes`.

## IPS patch

Create an IPS containing only changed ranges.

## Project file

Save edits without redistributing the ROM.

A project file should ideally include:

```json
{
  "game": "rbi-baseball",
  "version": 1,
  "sourceRomCrc32": "...",
  "profile": "...",
  "edits": []
}
```

Reject or warn when applying a project file to the wrong ROM CRC/profile.

## Changed bytes

Show:

```text
Offset
Original
Modified
Description
```

Where possible, description could be:

```text
California / Reggie Jackson / Power low byte
```

---

# 18. Phase 13 — Team Metadata

Research and implement:

- team names
- abbreviations
- roster labels
- end-game/newspaper names if separate

Do not assume one team name string is reused everywhere.

Determine whether different screens use different text tables.

Add editing only once storage constraints are understood.

---

# 19. Phase 14 — Colors and Palettes

Research:

- team colors
- uniforms
- field palette
- interface palettes

Create generic NES palette utilities if Tecmo equivalents can be reused.

Expose safe palette editing.

Display exact NES color options rather than unrestricted RGB if the ROM uses NES palette indices.

---

# 20. Phase 15 — CHR Graphics

Reuse/refactor lessons from Tecmo's pixel editing work.

Implement generic NES CHR tools:

```text
decodeTile
encodeTile

decodeTileGrid
encodeTileGrid
```

NES tiles are 2-bit planar 8×8 graphics.

Do not assume Tecmo and RBI store graphics in identical locations merely because both are NES games.

Research RBI CHR layout independently.

Possible eventual features:

- sprite editing
- logo editing
- UI graphic editing
- field tile editing

Do this after roster editing is stable.

---

# 21. Phase 16 — Additional ROM Profiles

Only now add:

```text
stuffed
overstuffed
historical hacked ROM
```

variants.

Use profile-based offsets.

Example:

```ts
interface RbiRomProfile {
  id: string;

  expectedSizes: number[];

  playerData: {
    baseOffset: number;
  };

  teamData: {
    baseOffset: number;
  };

  chr: {
    baseOffset: number;
  };
}
```

Avoid:

```ts
if (rom.length === X) offset += 0x12345;
```

spread throughout the codebase.

All variant-specific knowledge belongs in profiles.

---

# 22. Phase 17 — CSV Import/Export

Allow exporting rosters into a documented format.

Example:

```csv
team,type,name,bats,avg,hr,power,contact,speed
California,batter,Jackson,L,.275,39,945,23,128
```

Pitcher CSV should include pitching-specific attributes.

Support importing edited data.

Validate every field before modifying ROM bytes.

Show errors by row.

Never partially corrupt the ROM because one CSV row was invalid.

---

# 23. Phase 18 — Ratings Generator

This is optional but valuable.

Create a separate feature that converts real baseball statistics into suggested RBI-style ratings.

Important:

Generated ratings are recommendations, not canonical truth.

Display them as:

```text
Suggested Power
Suggested Contact
Suggested Speed
```

Allow manual adjustment before writing.

Do not mingle real-world stat import logic with low-level ROM parsing.

---

# 24. Testing Requirements

Add tests as the project develops rather than waiting until the end.

At minimum test:

## ROM

```text
iNES recognition
RBI detection
profile selection
unsupported ROM handling
```

## Batters

```text
record parsing
power little-endian conversion
contact
speed
HR
AVG
handedness
```

## Pitchers

```text
record parsing
stamina
curves
velocity
handedness
delivery
```

## Writers

```text
read → write unchanged = identical bytes
```

## Export

```text
IPS output
diff output
project output
```

---

# 25. Add a Research Document

Create:

```text
docs/RBI-ROM-MAP.md
```

This is extremely important.

It should become the project's source of truth.

Use a table like:

```text
AREA                  OFFSET       LENGTH     CONFIDENCE
--------------------------------------------------------
Team table            ?????        ?????      confirmed
Player records        ?????        ?????      confirmed
Pitchers              ?????        ?????      confirmed
Team colors           ?????        ?????      suspected
CHR                    ?????        ?????      confirmed
```

For records:

```text
BATTER RECORD

BYTE    SIZE    FIELD             STATUS
0       ?       ...
...
```

Every discovery made during coding should be written there.

Do not leave ROM knowledge buried only inside TypeScript.

---

# 26. Maintain a Research Log

Also create:

```text
docs/RESEARCH-LOG.md
```

Entries should look like:

```text
2026-10-02

Investigated Reggie Jackson Power.

Observed:
B1 03

Interpretation:
Little-endian value 0x03B1 = 945.

Confidence:
Confirmed.

Test:
Changed value to 900 and verified exported ROM bytes.
```

This prevents reverse-engineering knowledge from disappearing into chat history.

---

# 27. AI Agent Behavior

When executing this project, follow these operating rules.

## Do not fake completion

If a field has not been reverse engineered, say:

```text
Unknown
```

Do not invent implementation.

---

## Do not silently broaden scope

Complete the current phase before adding unrelated features.

---

## Never make large rewrites unnecessarily

Prefer incremental commits.

---

## Run the application after meaningful changes

At a minimum after each phase:

```bash
npm run build
```

Also run:

```bash
npm run lint
```

and tests when available.

Fix failures before proceeding.

---

## Maintain a working application

Do not leave the repository broken while attempting a major refactor.

---

# 28. Git Strategy

Commit after every successful phase.

Examples:

```text
chore: establish RBI editor foundation

feat: detect original RBI Baseball ROM

feat: add RBI ROM research tools

feat: decode batter records

feat: decode pitcher records

feat: parse California roster

feat: parse all RBI teams

test: validate RBI ROM round trips

feat: add RBI-style team roster UI

feat: add batter editor

feat: add pitcher editor

feat: add advanced roster table

feat: add RBI project and IPS exports
```

Avoid one giant commit containing the whole project.

---

# 29. Mandatory Stop Conditions

The AI must stop and investigate instead of continuing if:

- decoded roster does not match known players
- record boundaries overlap unexpectedly
- editing one property changes unrelated data
- exported ROM no longer boots
- the same field behaves differently across teams
- a suspected offset does not work consistently
- the app encounters an unsupported ROM layout

Do not patch around these problems.

They indicate the ROM model is wrong or incomplete.

---

# 30. Definition of MVP

The MVP is complete when a user can:

1. open a clean original RBI Baseball NES ROM
2. have the app identify it correctly
3. choose any of the ten original teams
4. view the correct roster
5. inspect hitters
6. inspect pitchers
7. edit supported hitter ratings
8. edit supported pitcher ratings
9. see which values changed
10. revert individual or all changes
11. save a modified ROM
12. create an IPS patch
13. inspect changed bytes
14. save a project file
15. reload the modified ROM successfully in an NES emulator

Do not delay MVP for:

- graphics editing
- arbitrary hacked-ROM support
- season generation
- CSV
- advanced palette editing

Those are later phases.

---

# 31. First AI Coding Assignment

Start the project now.

Your first assignment is **only Phase 0 and Phase 1**.

Perform the following:

1. Clone/fork the Tecmo ROM Editor codebase into the RBI project.
2. Preserve reusable ROM infrastructure.
3. disable/remove Tecmo-specific screens from the normal RBI workflow.
4. restructure shared code only where necessary.
5. implement a clean RBI ROM detection layer.
6. display ROM detection information in the application.
7. document the current architecture.
8. create `docs/RBI-ROM-MAP.md`.
9. create `docs/RESEARCH-LOG.md`.
10. run build/lint.
11. fix all introduced errors.
12. commit the completed work.

Do not begin decoding player records yet.

At the end, report:

```text
FILES ADDED
FILES CHANGED
FILES REMOVED

REUSED FROM TECMO
RBI-SPECIFIC CODE CREATED

ROM DETECTION METHOD

KNOWN LIMITATIONS

BUILD RESULT
LINT RESULT

NEXT PHASE
```

Then stop.

---

# 32. Second AI Coding Assignment

After Phase 0/1 passes, the next assignment is:

> Reverse-engineer and decode one California batter.

Do not build the whole roster.

Use existing published RBI research as leads, but verify all assumptions against the user's ROM.

Add the results to:

```text
docs/RBI-ROM-MAP.md
docs/RESEARCH-LOG.md
```

Write tests for the discovered record format.

Prove that changing one attribute changes only the expected bytes.

Then stop and report findings.

---

# 33. Third AI Coding Assignment

After one batter is proven:

> Reverse-engineer one California pitcher.

Repeat the same discipline:

```text
discover
document
test
write
round-trip
verify
```

Then stop.

---

# 34. Overall Principle

Do not think of this project as:

> Build an RBI editor UI.

Think of it as:

> Build a verified software model of the RBI Baseball ROM, then put a good editor UI on top of it.

The correctness of the ROM model is more important than feature count.

A smaller editor that edits known bytes reliably is better than a larger editor based on guessed offsets.
