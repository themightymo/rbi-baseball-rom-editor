# RBI Baseball ROM Map

Confidence labels used here: **confirmed**, **strongly inferred**, **suspected**, and **unknown**.

## Confirmed container layout

| Region                | File offset |         Size | Status    | Notes                        |
| --------------------- | ----------: | -----------: | --------- | ---------------------------- |
| iNES header           |  `0x000000` |     16 bytes | confirmed | `NES 1A`; parsed generically |
| PRG ROM               |  `0x000010` | 65,536 bytes | confirmed | Four 16 KB iNES units        |
| CHR ROM               |  `0x010010` | 32,768 bytes | confirmed | Four 8 KB iNES units         |
| End of standard image |  `0x018010` |            — | confirmed | 98,320 bytes total           |

The roadmap mentions a 98,448-byte file. That is 128 bytes longer than the standard iNES header plus 64 KB PRG plus 32 KB CHR. The detector accepts an exact verified cartridge-data match with trailing bytes and reports the discrepancy; the purpose of any 128-byte suffix is **unknown** and it is not parsed.

## Confirmed cartridge profiles

Checksums below cover PRG+CHR cartridge bytes and deliberately exclude the mutable 16-byte iNES header.

| Variant                    | Mapper |   PRG |   CHR | PRG+CHR CRC32 | Support   |
| -------------------------- | -----: | ----: | ----: | ------------- | --------- |
| Licensed gray cartridge    |    206 | 64 KB | 32 KB | `3C5C81D4`    | supported |
| Unlicensed black cartridge |    206 | 64 KB | 32 KB | `2E326A1D`    | supported |

Shared CHR CRC32: `C36B03AE`. Licensed PRG CRC32: `42607A97`. Unlicensed PRG CRC32: `203D32B5`.

Sources: [NES Directory cartridge records](https://nesdir.github.io/3C5C81D4_USA.html) and [NesCartDB unlicensed cartridge record](https://nescartdb.com/profile/view/447/rbi-baseball).

## Game data

Player names, team records, batter records, pitcher records, lineups, ratings, and text encoding are currently **unknown**. No player offsets or write rules are implemented in Phase 0/1.

## Address conventions

- **File offset** is zero-based from the first byte of the `.nes` file.
- **PRG-relative offset** is `file offset - PRG start` and exists only inside the header-declared PRG range.
- With no trainer, PRG begins at file `0x000010`; with a trainer it begins at `0x000210`.
- End offsets in the research panel are inclusive; internal range calculations use exclusive ends.
- CPU addresses are shown only where mapper state is unnecessary. Mapper 206 fixes its final two 8 KB PRG banks at CPU `$C000–$FFFF`; earlier PRG banks are switchable and therefore reported as bank-dependent. This behavior is documented by [NESdev's mapper 206 reference](https://www.nesdev.org/wiki/INES_Mapper_206).

## Confirmed annotated RBI regions

None yet. The annotation registry is intentionally empty until Phase 3 verifies a game-data region. The iNES, PRG, and CHR container ranges shown by the research panel are derived metadata, not RBI game-data annotations.

## Phase 2 test-ROM observation

The locally supplied `RBI Baseball (U).nes` is 98,320 bytes with no trainer. Its header declares mapper 4, 64 KB PRG, and 32 KB CHR. Its cartridge CRC32 is `C987A275`, PRG CRC32 is `24FAA2AF`, and CHR CRC32 is the known RBI value `C36B03AE`. It does not exactly match either clean supported profile and remains inspection-only. No header correction or game-data inference was made.
