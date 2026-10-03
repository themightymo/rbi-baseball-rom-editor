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

All ten complete team player blocks are confirmed below. Non-player game data and any lineup data outside the record order remain **unknown**.

## Address conventions

- **File offset** is zero-based from the first byte of the `.nes` file.
- **PRG-relative offset** is `file offset - PRG start` and exists only inside the header-declared PRG range.
- With no trainer, PRG begins at file `0x000010`; with a trainer it begins at `0x000210`.
- End offsets in the research panel are inclusive; internal range calculations use exclusive ends.
- CPU addresses are shown only where mapper state is unnecessary. Mapper 206 fixes its final two 8 KB PRG banks at CPU `$C000–$FFFF`; earlier PRG banks are switchable and therefore reported as bank-dependent. This behavior is documented by [NESdev's mapper 206 reference](https://www.nesdev.org/wiki/INES_Mapper_206).

## Confirmed annotated RBI regions

### Complete team table

The player table is ten consecutive 256-byte blocks at file `0x000010–0x000A0F` (PRG-relative `0x000000–0x0009FF`). Every team contains twelve 16-byte batter records followed by four 16-byte pitcher records. The block order is established by decoding the ROM and matching every roster to the original manual; it is not inferred from the UI order.

|  ID | Team                      | Abbr. | File range      | PRG-relative range |
| --: | ------------------------- | ----- | --------------- | ------------------ |
|   0 | California                | `Ca`  | `0x0010–0x010F` | `0x0000–0x00FF`    |
|   1 | Boston                    | `Bo`  | `0x0110–0x020F` | `0x0100–0x01FF`    |
|   2 | Detroit                   | `De`  | `0x0210–0x030F` | `0x0200–0x02FF`    |
|   3 | Minnesota                 | `Mn`  | `0x0310–0x040F` | `0x0300–0x03FF`    |
|   4 | Houston                   | `Ho`  | `0x0410–0x050F` | `0x0400–0x04FF`    |
|   5 | New York                  | `NY`  | `0x0510–0x060F` | `0x0500–0x05FF`    |
|   6 | St. Louis                 | `SL`  | `0x0610–0x070F` | `0x0600–0x06FF`    |
|   7 | San Francisco             | `SF`  | `0x0710–0x080F` | `0x0700–0x07FF`    |
|   8 | American League All-Stars | `Am`  | `0x0810–0x090F` | `0x0800–0x08FF`    |
|   9 | National League All-Stars | `Na`  | `0x0910–0x0A0F` | `0x0900–0x09FF`    |

The first eight records in each team are the starting batting order, the next four are bench batters, and the final four are pitchers. All 160 slot bytes increment from `0` through `15` within their team, and all names decode without substitution. The two supplied ROMs contain byte-identical data throughout this complete range.

### All-Star storage

The All-Star teams do not reference the eight regular-team blocks. IDs 8 and 9 contain the same complete, inline record structures as every other team: twelve batters and four pitchers apiece. None of their 32 names or complete 16-byte records duplicates a player in IDs 0–7. They are standalone rosters, largely representing players from clubs that do not have their own selectable team, rather than copies or pointers to the eight regular rosters.

The manual confirms every displayed abbreviation, handedness, batting average, home-run total, ERA, and roster identity. The detailed community rating table confirms the hidden contact, power, speed, pitch, curve, stamina, and still-unknown raw values. ROM spelling is preserved verbatim, including `Righti` for the American League pitcher displayed as Dave Righetti in the manual.

### California team player block

California occupies file offsets `0x000010–0x00010F` (PRG-relative `0x000000–0x0000FF`): sixteen consecutive 16-byte records. Slots `0–11` are batters and slots `12–15` are pitchers. Every record begins with its expected slot byte in both supplied ROMs; no record deviated from either proven structure.

| Slot | Type    | Name     | File offset |
| ---: | ------- | -------- | ----------: |
|    0 | Batter  | `Pettis` |      `0x10` |
|    1 | Batter  | `DCincs` |      `0x20` |
|    2 | Batter  | `Joyner` |      `0x30` |
|    3 | Batter  | `Jacksn` |      `0x40` |
|    4 | Batter  | `Dwning` |      `0x50` |
|    5 | Batter  | `Grich`  |      `0x60` |
|    6 | Batter  | `Schfld` |      `0x70` |
|    7 | Batter  | `Boone`  |      `0x80` |
|    8 | Batter  | `Burlsn` |      `0x90` |
|    9 | Batter  | `Hendrk` |      `0xA0` |
|   10 | Batter  | `Wilfng` |      `0xB0` |
|   11 | Batter  | `Jones`  |      `0xC0` |
|   12 | Pitcher | `Witt`   |      `0xD0` |
|   13 | Pitcher | `Sutton` |      `0xE0` |
|   14 | Pitcher | `Corbet` |      `0xF0` |
|   15 | Pitcher | `Moore`  |     `0x100` |

Slots `0–7` are the documented starting batters and `8–11` are bench batters. The player records are inline in this block; no separate California-to-player pointer was found or inferred. Phase 6 confirmed that the two All-Star teams likewise store independent inline records rather than references to California or another selectable team.

The name encoding uses uppercase `A–Z` at `0x0A–0x23`, space at `0x24`, period at `0x25`, and lowercase `a–z` at `0x28–0x41`. All glyphs needed by all ten rosters decode without substitution.

### California batter slot 3 — `Jacksn`

Both supplied ROMs store California's batter records immediately after the 16-byte iNES header. The selected record begins at file `0x000040` (PRG-relative `0x000030`) and is 16 bytes long.

| Record byte |  File offset |                 Raw | Meaning           | Decoded value        | Confidence |
| ----------: | -----------: | ------------------: | ----------------- | -------------------- | ---------- |
|        `+0` |       `0x40` |                `03` | Roster slot       | 3                    | confirmed  |
|    `+1..+6` | `0x41..0x46` | `13 28 2A 32 3A 35` | Display name      | `Jacksn`             | confirmed  |
|        `+7` |       `0x47` |                `01` | Bats              | Left                 | confirmed  |
|        `+8` |       `0x48` |                `7D` | Displayed average | `.275` (`125 + 150`) | confirmed  |
|        `+9` |       `0x49` |                `27` | Home runs         | 39                   | confirmed  |
|       `+10` |       `0x4A` |                `17` | Contact           | 23                   | confirmed  |
|       `+11` |       `0x4B` |                `B1` | Power low byte    | —                    | confirmed  |
|       `+12` |       `0x4C` |                `03` | Power high byte   | `0x03B1` = 945       | confirmed  |
|       `+13` |       `0x4D` |                `80` | Speed             | 128                  | confirmed  |
|  `+14..+15` | `0x4E..0x4F` |             `00 00` | Unknown           | preserved verbatim   | unknown    |

The batting-average transformation was checked across all twelve California batter records: `stored byte + 150` reproduces every published in-game average, including Pettis `.258`. All twelve batters now use this same parsed model. Batter bytes `+14..+15` remain unknown and are preserved verbatim for every record.

Confirmed batter fields `+1..+13` are writable with field-specific validation. Names are fixed at six encoded glyph bytes and padded with the confirmed space glyph. Average accepts displayed values 150–405 and stores `value - 150`; one-byte ratings accept 0–255; Power accepts 0–65,535 and remains little-endian. Slot `+0` and unknown bytes `+14..+15` are deliberately excluded from the writer API.

## Phase 2 test-ROM observation

The locally supplied `RBI Baseball (U).nes` is 98,320 bytes with no trainer. Its header declares mapper 4, 64 KB PRG, and 32 KB CHR. Its cartridge CRC32 is `C987A275`, PRG CRC32 is `24FAA2AF`, and CHR CRC32 is the known RBI value `C36B03AE`. It does not exactly match either clean supported profile and remains inspection-only. No header correction or game-data inference was made.

The additionally supplied `R.B.I. Baseball (U) [!].nes` has the published licensed-cartridge payload CRC32 `3C5C81D4`; its complete California block is byte-identical. Its legacy iNES header still declares mapper 4 rather than documented mapper 206, so it is evidence for the licensed payload and record layout but not a canonical header. The clean unlicensed payload remains untested.

### California pitcher slot 12 — `Witt`

Mike Witt's record begins at file `0x0000D0` (PRG-relative `0x0000C0`) and is 16 bytes long. It is byte-identical in both supplied ROMs.

|       Record byte |  File offset |                 Raw | Meaning               | Decoded value                  | Confidence |
| ----------------: | -----------: | ------------------: | --------------------- | ------------------------------ | ---------- |
|              `+0` |       `0xD0` |                `0C` | Roster slot           | 12                             | confirmed  |
|          `+1..+6` | `0xD1..0xD6` | `20 30 3B 3B 24 24` | Display name          | `Witt` plus two padding glyphs | confirmed  |
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

The low style nibble was validated against documented examples: `0` right/standard, `1` left/standard, `2` right/sidearm, and `3` left/sidearm. All four California pitchers use the same parsed structure. The meanings of Unknown 1 and Unknown 2 are not documented or inferred; each pitcher's raw values remain visible and unchanged.

Confirmed pitcher fields `+1..+13` are writable with field-specific validation. Style changes repack handedness and delivery into the low nibble while preserving Drop in the high nibble; curve changes repack both confirmed curve nibbles. ERA accepts displayed values 100–355 and stores `value - 100`; Drop and curves accept 0–15; velocities and Stamina accept 0–255. Slot `+0` and unknown bytes `+14..+15` are deliberately excluded from the writer API.

## Team and screen text

The ten selectable team labels are verified by roster identity and the original manual, but are not stored as ordinary strings beside the team records. Their exact rendering mechanism on the team-selection, roster, and game screens remains unresolved; the application metadata must not be mistaken for decoded writable ROM text.

Published technical research identifies three separate end-paper name fields. Its offsets are PRG-relative, so their headered file ranges are:

| Field            | PRG-relative | File range      | Length | Status                         |
| ---------------- | ------------ | --------------- | -----: | ------------------------------ |
| End paper name 1 | `0x1456`     | `0x1466–0x146B` |      6 | region confirmed; encoding TBD |
| End paper name 2 | `0x145D`     | `0x146D–0x1473` |      7 | region confirmed; encoding TBD |
| End paper name 3 | `0x1464`     | `0x1474–0x1477` |      4 | region confirmed; encoding TBD |

These bytes are identical in both supplied ROMs. They do not use the player-name glyph mapping directly and may include screen-specific tile/control semantics. Editing is intentionally withheld. Opening-screen lines are likewise documented at PRG-relative `0x2F37–0x2F8D`, but contain interleaved control data and are not yet modeled.
