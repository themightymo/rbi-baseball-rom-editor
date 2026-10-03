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
