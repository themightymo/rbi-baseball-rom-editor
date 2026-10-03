# Research Log

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

California roster slot 3, displayed in-game as `JACKSN` (Reggie Jackson), at file offset `0x40` in the supplied ROM.

### Evidence and conclusions

- Community technical documentation identifies clean-ROM bytes `0000–1000`, relative to the cartridge data after the iNES header, as player/pitcher data and documents the loaded batter field order as handedness, average, HR, contact, power high/low in RAM, and speed.
- Direct byte inspection found fixed 16-byte records beginning at file `0x10`; slot 3 therefore begins at file `0x40`.
- The six glyph bytes correlate to the documented in-game abbreviation `JACKSN`.
- `01` correlates with the documented left-handed value; California's documented right-handed batters contain `00` in the same field.
- Average byte `0x7D` plus 150 equals the displayed `.275`. Repeating that calculation for all twelve California batters reproduces every manual value.
- HR `0x27`, contact `0x17`, and speed `0x80` directly equal published decimal values 39, 23, and 128.
- ROM bytes `B1 03` are little-endian power `0x03B1`, decimal 945, matching the published rating. The community RAM description lists high then low because the loaded RAM representation differs from this ROM record order.
- Bytes `+14` and `+15` remain unknown and are preserved.
- A second supplied image has the published licensed payload CRC32 `3C5C81D4`. Its 16-byte `JACKSN` record is identical, confirming this offset and layout in the licensed cartridge payload as well as the initially supplied modified PRG. That file's legacy header declares mapper 4, so its header is not treated as canonical.

### Round-trip proof

Pure tests parse the known record, encode/decode Power symmetrically, change Power to 1256 while changing only file offsets `0x4B–0x4C`, then restore 945 and reproduce the entire original byte array.

### Sources

- [RBI Baseball Technical Page](https://dee-nee.com/rbi/tech.shtml)
- [California player ratings](https://dee-nee.com/rbi/cali.shtml)
- [Original manual roster table](https://www.nesfiles.com/NES/RBI_Baseball/RBI_Baseball.pdf)

### Scope held

No second batter, pitcher, team, lineup, or All-Star structure was parsed. The clean unlicensed payload and canonical mapper-206 headers remain untested.
