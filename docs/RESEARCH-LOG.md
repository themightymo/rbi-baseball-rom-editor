# Research Log

## 2026-10-03 — Dedicated play screen

- “Save and Play Game” now leaves the editor workspace and opens a dedicated play screen, matching
  the Tecmo editor's navigation model instead of embedding the emulator in an editor tab.
- “Back to editor” destroys the emulator and restores the unchanged editor tab and in-memory ROM.
  The play snapshot remains an isolated copy of the ROM at the moment the button was pressed.

## 2026-10-03 — Safe batter gameplay limits

- Replaced storage-width maxima in normal editors and CSV import with authentic gameplay limits:
  Contact `0–40`, Power `640–975`, and Speed `118–148`.
- Contact is now identified as a penalty where lower values are better. Ratings Lab maps a higher
  average to a lower Contact penalty rather than increasing it.
- Raw byte experimentation remains possible through the explicitly advanced hex and custom-layout
  research tools, while roster writers reject values likely to create unstable gameplay.

## 2026-10-03 — Direct batter stat-to-rating relationships

- Ratings Lab now ties Contact only to batting average, Power only to home runs, and Speed only to
  stolen-base rate. The visible input form was reduced to those source stats plus at-bats.
- Stolen bases remain a recommendation-only input. No ROM offset was assigned because no stored
  stolen-base field has been confirmed.
- Added the same single-file GitHub Pages deployment and pre-push build guard used by the Tecmo
  editor so every push to `main` can publish the current application build.

## 2026-10-03 — Slider-based stat editing

- Replaced numeric text fields on the primary batter and pitcher cards with a shared NES-styled
  slider interface.
- Every slider shows the live exact value, range endpoints, and a pink marker for the immutable
  original value. Minus/plus buttons and keyboard arrow control retain single-unit precision for
  wide ranges such as batter Power.
- Existing changed indicators, individual reset buttons, validation ranges, and confirmed ROM
  writer APIs remain unchanged. Names and categorical fields retain their appropriate controls.

## 2026-10-03 — In-browser play and supplied modified profile

- Added an in-memory play snapshot: “Save and Play Game” copies the current working ROM bytes into
  React state and opens a browser NES player without downloading, uploading, or persisting the ROM.
- The player follows the referenced Retro Game Emulator fork's JSNES 2.1 approach: 256×240
  pixel-rendered canvas, 60 FPS timing, audio, focus-scoped keyboard controls, pause/reset, and
  fullscreen. JSNES is consumed as its Apache-2.0 npm package rather than copying the fork's
  WordPress-specific wrapper.
- The two supplied ROMs differ at only 17 isolated PRG bytes, all at file `0x5E19–0x5F94`. Their
  complete roster table and CHR are identical. `RBI Baseball (U).nes` now has a checksum-specific
  supported profile (`C987A275`); this does not weaken detection for any other modified ROM.
- Added the user-supplied `rbi-logo-in-game.jpg` to the application header.

## 2026-10-03 — Phase 18 Ratings Lab

- Added pure, deterministic batter and pitcher recommendation functions, documented in
  [`RATINGS-GENERATOR.md`](RATINGS-GENERATOR.md).
- Batter recommendations use direct average/contact, home-run/power, and stolen-base/speed links.
  Pitcher recommendations use ERA, innings per appearance, K/9, BB/9, and entered fastball MPH.
- The formulas are explicitly product heuristics, not reverse-engineered original rating formulas.
  The UI calls every output “Suggested” and requires a separate apply action after manual review.
- The generator module has no ROM dependency. The UI sends reviewed values through the existing
  confirmed field writers, preserving record slots and all unknown bytes.
- Pure tests cover exact formulas, range clamps, and invalid/impossible stat-line rejection.

## 2026-10-02 — Phase 17 atomic roster CSV

- Added complete roster export/import using the documented schema in [`RBI-CSV.md`](RBI-CSV.md).
- Exports contain all 160 player rows. Batter and pitcher columns are separated explicitly, while
  `team`, `type`, and `slot` form stable record identities.
- Both unresolved bytes remain visible as `unknown_1` and `unknown_2` but are read-only. Import
  rejects changes to them rather than assigning a speculative meaning.
- Import validates the exact header, row width, all ranges/enums, name glyphs, applicable/blank
  fields, unique team/slot pairs, and complete roster coverage. Errors carry CSV row and field.
- Validation and writes occur against a clone. A replacement ROM is returned only if every row is
  valid, proving that one bad row cannot partially modify application state.

## 2026-10-02 — Phase 16 profile-based ROM variants

### Profile architecture

- All variant-specific player, team, and CHR base offsets now live in typed profiles and are
  relative to the iNES PRG/CHR regions. The parser accepts a resolved team base instead of
  scattering file-size conditionals.
- Only a complete known PRG+CHR checksum can select a profile automatically. Expected file sizes
  and structural similarity are never sufficient to enable editing.
- The exact licensed and unlicensed payload profiles accept canonical mapper 206 and the common
  legacy mapper-4 iNES header. The latter always produces a warning and is accepted only after the
  complete payload checksum matches.
- The supplied `[!]` image therefore becomes editable as the exact licensed payload; the other
  supplied image remains inspection-only because its modified PRG has no verified checksum.

### Expanded/hacked families

The community [technical page](https://dee-nee.com/rbi/tech.shtml) reports overstuffed licensed and
unlicensed sizes of 196,924 and 262,160 bytes, two copies of player data, and an editable copy at
PRG-relative `0x10000`. Those facts are recorded in unsupported profiles. The distinct stuffed
licensed image is described as having relocated data, but its exact offset and checksum were not
published and remain null. Historical ten-team hacks vary by base image, so their offsets also
remain null pending an individually verified payload.

The [RBI ROMs page](https://dee-nee.com/rbi/roms/) describes the families but uses size/naming that
does not cleanly agree with the technical page. No family-only profile is auto-detected, and no
offset was invented to resolve that inconsistency.

## 2026-10-02 — Phase 15 generic CHR tools

### Implemented and confirmed

- Added pure encode/decode helpers for individual 8×8 NES 2-bit planar tiles and rectangular,
  row-major tile grids.
- Added boundary and pixel-value validation plus symmetry tests covering all four 2-bit values.
- Added a raw tile editor bounded by the iNES-declared CHR range. It reports the tile index, file
  offset, and CHR-relative byte offset, and writes only the selected tile's 16 bytes.
- The preview intentionally uses neutral shades for plane indices 0–3. A pattern-table pixel does
  not itself select an NES RGB color; the relevant attribute and palette state are separate.

### RBI-specific status

Both supplied ROMs have the same confirmed 32 KB CHR payload (`C36B03AE`), comprising 2,048 NES
tiles. No tile has been assigned a sprite, logo, field, or interface meaning. Those associations,
tile-grid dimensions, mirroring/copies, and runtime palette selection remain unresolved. The
generic tools therefore make CHR research observable without treating Tecmo locations or layouts
as RBI evidence.

### Implementation boundary

The planar bit ordering is generic NES behavior. Tecmo's broader pixel-editor concept informed the
workflow, but no Tecmo graphics offset, tile identity, or game-specific layout was copied.

## 2026-10-02 — Phase 0/1 foundation and identification

### Confirmed

- The licensed and unlicensed original cartridges use mapper 206 with 64 KB PRG and 32 KB CHR.
- Published cartridge-dump CRC32 values distinguish the two PRG payloads; both use the same CHR payload.
- A standard iNES image containing those regions is 98,320 bytes, not 98,448 bytes.
- Filename matching is unnecessary and is not used.

### Implementation decision

Exact identification requires a published full PRG+CHR CRC32 match. A modified payload can receive `high` confidence only when its mapper/sizes match and its CHR checksum matches the verified RBI CHR; it remains inspection-only. Matching mapper and sizes alone yields `possible`, does not set `isRbi`, and cannot enable editing. This prevents an unrelated 96 KB mapper-206 game from being identified solely by size.

Trailing bytes are not included in cartridge-data hashing because the iNES header declares the authoritative PRG and CHR lengths. They produce a visible warning and remain untouched on export.

### Sources reviewed

- [NES Directory: R.B.I. Baseball](https://nesdir.github.io/3C5C81D4_USA.html)
- [NesCartDB: unlicensed R.B.I. Baseball](https://nescartdb.com/profile/view/447/rbi-baseball)
- [TASVideos game-version hash](https://tasvideos.org/444G)

### Unknown / deferred

- Why the supplied roadmap identifies 98,448 bytes as the known-good size.
- Player/team offsets, record sizes, encodings, and field meanings.
- Whether modified or expanded ROM families can be safely edited.

No player record decoding was attempted in this phase.

## 2026-10-02 — Phase 2 research toolkit

### Added

- Decimal/hex file-offset navigation and byte-range selection in the hex viewer.
- File, PRG-relative, and statically calculable CPU-address display.
- Exact ASCII/custom-table string search with all match offsets and direct hex-view navigation.
- An RBI annotation registry and generic range lookup. It contains no entries yet because no RBI game-data ranges have been confirmed.
- A research summary with iNES layout, checksums, detected profile, PRG/CHR bounds, and annotations.
- Candidate layouts now support selectable little- or big-endian numeric fields.

### Addressing decision

CPU mapping is deliberately conservative. Mapper 206 offsets in the fixed final 16 KB can be mapped to `$C000–$FFFF`; switchable banks return no CPU address. Mapper 4 exposes only its fixed final 8 KB as `$E000–$FFFF`. Mapper 0 is linear. CHR bytes do not receive CPU addresses.

Source: [NESdev mapper 206 documentation](https://www.nesdev.org/wiki/INES_Mapper_206).

### Supplied-ROM observation

`RBI Baseball (U).nes` has a standard 98,320-byte size and header bytes declaring mapper 4. Its PRG is not a known clean-profile match, while its CHR checksum matches the verified RBI CHR. It remains unsupported for structured editing. This was recorded as an observation only; no player data was investigated.

## 2026-10-02 — Phase 3 single-batter investigation

### Subject

California roster slot 3, displayed in-game as `Jacksn` (Reggie Jackson), at file offset `0x40` in the supplied ROM.

### Evidence and conclusions

- Community technical documentation identifies clean-ROM bytes `0000–1000`, relative to the cartridge data after the iNES header, as player/pitcher data and documents the loaded batter field order as handedness, average, HR, contact, power high/low in RAM, and speed.
- Direct byte inspection found fixed 16-byte records beginning at file `0x10`; slot 3 therefore begins at file `0x40`.
- The six glyph bytes correlate to the documented in-game abbreviation `Jacksn`.
- `01` correlates with the documented left-handed value; California's documented right-handed batters contain `00` in the same field.
- Average byte `0x7D` plus 150 equals the displayed `.275`. Repeating that calculation for all twelve California batters reproduces every manual value.
- HR `0x27`, contact `0x17`, and speed `0x80` directly equal published decimal values 39, 23, and 128.
- ROM bytes `B1 03` are little-endian power `0x03B1`, decimal 945, matching the published rating. The community RAM description lists high then low because the loaded RAM representation differs from this ROM record order.
- Bytes `+14` and `+15` remain unknown and are preserved.
- A second supplied image has the published licensed payload CRC32 `3C5C81D4`. Its 16-byte `Jacksn` record is identical, confirming this offset and layout in the licensed cartridge payload as well as the initially supplied modified PRG. That file's legacy header declares mapper 4, so its header is not treated as canonical.

### Round-trip proof

Pure tests parse the known record, encode/decode Power symmetrically, change Power to 1256 while changing only file offsets `0x4B–0x4C`, then restore 945 and reproduce the entire original byte array.

### Sources

- [RBI Baseball Technical Page](https://dee-nee.com/rbi/tech.shtml)
- [California player ratings](https://dee-nee.com/rbi/cali.shtml)
- [Original manual roster table](https://www.nesfiles.com/NES/RBI_Baseball/RBI_Baseball.pdf)

### Scope held

No second batter, pitcher, team, lineup, or All-Star structure was parsed. The clean unlicensed payload and canonical mapper-206 headers remain untested.

## 2026-10-02 — Phase 4 single-pitcher investigation

### Subject

California pitcher slot 12, `Witt` (Mike Witt), at file offset `0xD0` in both supplied ROMs.

### Evidence and conclusions

- The community technical map documents the loaded pitcher order as style/handedness, ERA, slow speed, normal speed, fast speed, packed curves, stamina, Unknown 1, and Unknown 2.
- The full 16-byte record is identical in the modified test ROM and the image with verified licensed payload CRC32 `3C5C81D4`.
- Composite byte `0x40` decodes as drop 4 and style 0. Documented pitcher examples verify style nibbles `0` right/standard, `1` left/standard, `2` right/sidearm, and `3` left/sidearm.
- ERA byte `0xB8` plus 100 gives 284, displayed as `2.84`. The same formula reproduces the other three California ERAs.
- Velocity bytes `90 A0 BA` directly equal 144 slow/sinker, 160 normal/curve, and 186 fastball.
- Packed curve byte `0x97` gives left curve 9 and right curve 7.
- Stamina byte `0x32` directly equals 50.
- Bytes `0x73` and `0x8C` match published `Un1=115` and `Un2=140`, but their purposes remain unknown.

### Round-trip proof

Pure tests change Stamina from 50 to 54, verify that only file offset `0xDD` changes, then restore 50 and reproduce the entire original byte array. The input is never mutated.

### Sources

- [RBI Baseball Technical Page](https://dee-nee.com/rbi/tech.shtml)
- [California player ratings](https://dee-nee.com/rbi/cali.shtml)
- [Detailed RBI player-rating FAQ](https://gamefaqs.gamespot.com/nes/587559-rbi-baseball/faqs/63117)

### Scope held

No second pitcher, additional batter, team, lineup, or All-Star structure was parsed. Unknown 1 and Unknown 2 were not assigned speculative meanings.

## 2026-10-02 — Phase 5 complete California decode

### Structural gate

- California is exactly one contiguous 256-byte block at file `0x10–0x10F`, or PRG-relative `0x00–0xFF`.
- Sixteen consecutive records passed the established 16-byte parsers: batter slots `0–11`, then pitcher slots `12–15`.
- Each record's first byte equals its expected slot. Both supplied ROMs contain a byte-identical California block, so no deviation triggered the required stop condition.
- The parser rejects the whole team if a slot boundary is wrong or a player name contains an unknown glyph.

### Decoded roster

- Batters: Pettis, DCincs, Joyner, Jacksn, Dwning, Grich, Schfld, Boone, Burlsn, Hendrk, Wilfng, Jones.
- Pitchers: Witt, Sutton, Corbet, Moore.
- Every decoded statistic was checked against the published California reference values.
- Name casing revealed separate contiguous uppercase and lowercase glyph ranges. The decoder now covers uppercase `A–Z`, space, and lowercase `a–z`; this corrects the earlier all-uppercase rendering without changing record bytes.

### Unknown / deferred

- Batter bytes `+14` and `+15` remain unknown for every California batter and are preserved verbatim.
- Pitcher bytes `+14` and `+15` remain explicitly `unknown1` and `unknown2` for every California pitcher. Their raw values are retained; no meanings were invented.
- The records establish California's inline player order, but no independent lineup table or player-pointer table was identified.
- An exact byte search found each California 16-byte record and six-byte name only at its source location. Therefore the supplied licensed payload does not contain exact California record copies in an All-Star area. A compact reference scheme or altered copies remain possible, so All-Star reuse is unresolved until the surrounding teams are decoded.
- No non-California player record was parsed.

## 2026-10-02 — Phase 6 all-team decode

### Boundary validation and ROM order

- Sequential validation found ten contiguous 256-byte team blocks at file `0x10–0xA0F`.
- Every block contains slots `0–11` using the batter structure and slots `12–15` using the pitcher structure. All 160 leading slot bytes match their expected boundaries.
- The verified ROM order is California, Boston, Detroit, Minnesota, Houston, New York, St. Louis, San Francisco, American League All-Stars, and National League All-Stars.
- Both supplied ROMs are byte-identical across the entire 2,560-byte team-data range.
- The parser checks bounds before reading a team, parses in ROM order, and stops at the first invalid slot, style, handedness, name glyph, or partial block.

### Names and value validation

- The complete roster matches the original manual, including starters, bench players, pitchers, displayed statistics, and handedness.
- Hidden batter and pitcher values were compared with the detailed published rating table where available.
- Byte `0x25` is a period glyph, consistently accounting for names such as `J.Rice`, `S.Owen`, `J.Cruz`, `K.Bass`, `D.Thon`, `N.Ryan`, `T.Herr`, `T.Pena`, and `J.Key`.
- The application preserves ROM abbreviations exactly. In particular, the ROM contains `Righti`, while the manual identifies the player as Dave Righetti.

### All-Star mechanism

- American and National All-Stars are ordinary inline team blocks at IDs 8 and 9, each with twelve complete batter records and four complete pitcher records.
- No All-Star name or complete record duplicates a record from team IDs 0–7.
- No team-to-player references are used for these rosters. The All-Star records are standalone data, mostly for players from clubs without selectable regular teams.

### Implementation

- A generic team parser now loads all ten teams while retaining the California compatibility entry point.
- A read-only RBI Rosters tab displays every decoded batter and pitcher value directly from the loaded ROM, including explicitly labeled unknown bytes.
- Confirmed byte-range annotations now cover all ten team blocks and all 160 player records.

### Sources

- [Original RBI Baseball manual](https://dee-nee.com/rbi/files/RBI_Baseball.pdf)
- [RBI Baseball Technical Page](https://dee-nee.com/rbi/tech.shtml)
- [Detailed RBI player-rating FAQ](https://gamefaqs.gamespot.com/nes/587559-rbi-baseball/faqs/63117)

### Still unknown

- Batter bytes `+14/+15` and pitcher bytes `+14/+15` retain their existing explicit unknown status.
- No meaning was inferred for data immediately after the ten team blocks.

## 2026-10-02 — Phase 7 round-trip verification

### Automated guarantees

- Test A copies and exports a complete 98,320-byte fixture without edits and confirms byte-for-byte identity with a distinct output buffer.
- Test B changes Jacksn's Power from 945 to 1256 and confirms that only file offsets `0x4B–0x4C` change.
- Test C changes Witt's Stamina from 50 to 54 and confirms that only file offset `0xDD` changes.
- Test D applies both edits, restores both original values, and confirms equality across the complete ROM image.
- Test E generates an IPS patch for both edits and applies it with an independent test-only IPS reader. The result exactly equals the directly modified ROM.

### Supplied-ROM verification

The same five checks passed in memory against both supplied 98,320-byte ROMs. Each combined two-field patch is 26 bytes. No modified ROM or patch was written to the repository.

### IPS safety changes

- IPS generation now rejects unequal original/modified lengths instead of silently ignoring length changes.
- Changed ranges larger than the IPS 65,535-byte record limit are split into valid records.
- An offset that exceeds the format's 24-bit range now produces an explicit error instead of being skipped.

## 2026-10-02 — Phase 8 primary roster interface

- The decoded RBI roster is now the application's default post-load screen rather than a research-only table.
- A compact team carousel follows the verified ten-team ROM order and uses only generic NES-inspired shapes, colors, and typography.
- Each team is presented as eight starting batter records, four bench batter records, and four pitcher records. No ninth stored batter was invented; pitcher batting behavior is not represented as a separate ROM batter record.
- Selecting a player opens a read-only game-style card backed entirely by the parsed ROM values. Editing remains gated for the dedicated batter and pitcher phases.

## 2026-10-02 — Phase 9 batter editor

- The batter card separates cosmetic historical statistics (AVG and HR) from gameplay ratings (Contact, Power, and Speed).
- Name, handedness, AVG, HR, Contact, Power, and Speed use validated field writers. Roster slot and both unknown trailing bytes are not writable.
- Every field shows its immutable original value, current value, changed state, and an individual reset control.
- The documented first pinch-hit at-bat Power bonus is shown as a derived `base + 64` value and explicitly identified as game behavior rather than stored record data.
- Editing permission is determined from the originally loaded ROM profile so a valid first edit does not disable subsequent edits when the working CRC changes.
- Pure tests write all confirmed fields, reparse them, verify the input is unchanged, verify unknown bytes remain intact, and reject invalid ranges or unsupported name glyphs.

## 2026-10-02 — Phase 10 pitcher editor

- The pitcher card separates cosmetic ERA from movement, velocity, and Stamina gameplay ratings.
- Name, throwing hand, delivery, ERA, Drop, both Curve directions, all three pitch velocities, and Stamina use validated field writers with original/current/reset presentation.
- Partial writes to packed style or curve bytes preserve the other field in the same byte.
- Unknown 1 and Unknown 2 appear only in a collapsed Advanced section with raw hexadecimal and decimal values. They remain read-only and unnamed.
- Pure tests write every confirmed field, verify packed-field preservation, verify slot and unknown bytes remain unchanged, and reject invalid byte/nibble ranges.

## 2026-10-02 — Phase 11 advanced roster editor

- Added Batters, Pitchers, and All Players table views for scanning the complete 160-player roster.
- Batter and pitcher tables edit the same validated field APIs used by the game-style cards; they do not introduce a second byte-writing implementation.
- Cells that differ from the immutable originally loaded ROM are highlighted in yellow.
- The game-style roster and individual cards remain the primary interface; the table is a complementary power-user workflow.

## 2026-10-02 — Phase 12 save and share

- Full-ROM and IPS export continue to use the Phase 7 verified paths.
- RBI project files now identify `game`, format `version`, full source-file CRC32, detected profile, and sorted edits with expected original bytes.
- Project import rejects the wrong CRC/profile, malformed values, out-of-range offsets, and original-byte mismatches before exposing a modified ROM.
- Import applies the complete validated result in one state update, fixing the inherited multiple-`setBytes` batching hazard.
- The changed-byte table now uses confirmed annotations to describe player records and known fields; unconfirmed offsets remain labeled `Unannotated byte`.

## 2026-10-02 — Phase 13 team metadata

- Verified team names and abbreviations remain application metadata tied to the proven roster order; no adjacent ROM string table was found.
- Published technical offsets confirm three separate end-paper name fields at PRG-relative `0x1456–0x1467` (headered file `0x1466–0x1477`). Both supplied ROMs contain identical bytes there.
- The end-paper bytes do not decode with the player-name table. Opening-screen text also mixes glyph and control bytes, confirming that screen text cannot safely reuse the roster-name writer.
- These confirmed regions are annotated, but no metadata writer was added. Team-selection labels, roster labels, newspaper/end-paper names, and opening text remain separate until their exact tile/control encoding and fixed-space constraints are proven.

Source: [RBI Baseball Technical Page](https://dee-nee.com/rbi/tech.shtml).

## 2026-10-02 — Phase 14 colors and palettes

- Extracted the inherited FCEUX-compatible 64-color NES palette into generic `core/nes` infrastructure with strict 0–63 index validation.
- RBI stores NES palette indices rather than unrestricted RGB colors; any future picker will therefore use this exact indexed palette.
- Historical editor documentation confirms separate cap/bat and jersey/pants colors and mentions field-color editing, but the clean 96 KB ROM offsets were not published in the accessible source.
- No ROM byte was labeled or made writable merely because its value happened to fall within 0–63. Uniform, field, and interface palette locations remain unresolved pending trace-based verification.

Source: [RBITool editor research thread](https://forums.dee-nee.com/index.php?topic=22874.0).
