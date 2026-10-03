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

### California batter slot 3 — `JACKSN`

Both supplied ROMs store California's batter records immediately after the 16-byte iNES header. The selected record begins at file `0x000040` (PRG-relative `0x000030`) and is 16 bytes long.

| Record byte |  File offset |                 Raw | Meaning           | Decoded value        | Confidence |
| ----------: | -----------: | ------------------: | ----------------- | -------------------- | ---------- |
|        `+0` |       `0x40` |                `03` | Roster slot       | 3                    | confirmed  |
|    `+1..+6` | `0x41..0x46` | `13 28 2A 32 3A 35` | Display name      | `JACKSN`             | confirmed  |
|        `+7` |       `0x47` |                `01` | Bats              | Left                 | confirmed  |
|        `+8` |       `0x48` |                `7D` | Displayed average | `.275` (`125 + 150`) | confirmed  |
|        `+9` |       `0x49` |                `27` | Home runs         | 39                   | confirmed  |
|       `+10` |       `0x4A` |                `17` | Contact           | 23                   | confirmed  |
|       `+11` |       `0x4B` |                `B1` | Power low byte    | —                    | confirmed  |
|       `+12` |       `0x4C` |                `03` | Power high byte   | `0x03B1` = 945       | confirmed  |
|       `+13` |       `0x4D` |                `80` | Speed             | 128                  | confirmed  |
|  `+14..+15` | `0x4E..0x4F` |             `00 00` | Unknown           | preserved verbatim   | unknown    |

The batting-average transformation was checked across all twelve California batter records solely to validate the field formula: `stored byte + 150` reproduces every published in-game average, including Pettis `.258`. Those other records have not been added to the application data model.

The name glyph table currently includes only byte/character pairs required by `JACKSN`. Unverified glyphs decode as `?` rather than being guessed.

## Phase 2 test-ROM observation

The locally supplied `RBI Baseball (U).nes` is 98,320 bytes with no trainer. Its header declares mapper 4, 64 KB PRG, and 32 KB CHR. Its cartridge CRC32 is `C987A275`, PRG CRC32 is `24FAA2AF`, and CHR CRC32 is the known RBI value `C36B03AE`. It does not exactly match either clean supported profile and remains inspection-only. No header correction or game-data inference was made.

The additionally supplied `R.B.I. Baseball (U) [!].nes` has the published licensed-cartridge payload CRC32 `3C5C81D4`; its `JACKSN` record is byte-identical. Its legacy iNES header still declares mapper 4 rather than documented mapper 206, so it is evidence for the licensed payload and record layout but not a canonical header. The clean unlicensed payload remains untested.

### California pitcher slot 12 — `WITT`

Mike Witt's record begins at file `0x0000D0` (PRG-relative `0x0000C0`) and is 16 bytes long. It is byte-identical in both supplied ROMs.

|       Record byte |  File offset |                 Raw | Meaning               | Decoded value                  | Confidence |
| ----------------: | -----------: | ------------------: | --------------------- | ------------------------------ | ---------- |
|              `+0` |       `0xD0` |                `0C` | Roster slot           | 12                             | confirmed  |
|          `+1..+6` | `0xD1..0xD6` | `20 30 3B 3B 24 24` | Display name          | `WITT` plus two padding glyphs | confirmed  |
|  `+7` high nibble |       `0xD7` |                 `4` | Drop/sinker rating    | 4                              | confirmed  |
|   `+7` low nibble |       `0xD7` |                 `0` | Throws/delivery       | right, standard                | confirmed  |
|              `+8` |       `0xD8` |                `B8` | Displayed ERA         | `2.84` (`184 + 100`)           | confirmed  |
|              `+9` |       `0xD9` |                `90` | Slow/sinker velocity  | 144                            | confirmed  |
|             `+10` |       `0xDA` |                `A0` | Normal/curve velocity | 160                            | confirmed  |
|             `+11` |       `0xDB` |                `BA` | Fastball velocity     | 186                            | confirmed  |
| `+12` high nibble |       `0xDC` |                 `9` | Left curve            | 9                              | confirmed  |
|  `+12` low nibble |       `0xDC` |                 `7` | Right curve           | 7                              | confirmed  |
|             `+13` |       `0xDD` |                `32` | Stamina               | 50                             | confirmed  |
|             `+14` |       `0xDE` |                `73` | Unknown 1             | raw value 115                  | unknown    |
|             `+15` |       `0xDF` |                `8C` | Unknown 2             | raw value 140                  | unknown    |

The low style nibble was validated against documented examples: `0` right/standard, `1` left/standard, `2` right/sidearm, and `3` left/sidearm. The meanings of Unknown 1 and Unknown 2 are not documented or inferred; they remain raw and unchanged.
