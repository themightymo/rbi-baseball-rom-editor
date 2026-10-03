# RBI roster CSV format

The editor exports one header row followed by exactly 160 player rows in ROM order: ten teams,
twelve batters and four pitchers per team. Import requires the complete set, with every team/slot
pair exactly once. CSV uses RFC-style comma separation, CRLF rows, double-quoted fields when needed,
and doubled quotes inside quoted fields.

## Columns

| Column            | Batter     | Pitcher    | Format                                   |
| ----------------- | ---------- | ---------- | ---------------------------------------- |
| `team`            | required   | required   | Exact editor team name                   |
| `type`            | `batter`   | `pitcher`  | Must agree with slot                     |
| `slot`            | `0`–`11`   | `12`–`15`  | Integer, unique within team              |
| `name`            | editable   | editable   | Up to six supported RBI glyphs           |
| `bats`            | `L` or `R` | blank      | Confirmed handedness                     |
| `avg`             | editable   | blank      | `.NNN`, from `.150` through `.405`       |
| `hr`              | editable   | blank      | Integer `0`–`255`                        |
| `contact`         | editable   | blank      | Integer `0`–`255`                        |
| `power`           | editable   | blank      | Integer `0`–`65535`                      |
| `speed`           | editable   | blank      | Integer `0`–`255`                        |
| `throws`          | blank      | `L` or `R` | Confirmed handedness                     |
| `delivery`        | blank      | editable   | `standard` or `sidearm`                  |
| `era`             | blank      | editable   | `N.NN`, from `1.00` through `3.55`       |
| `drop`            | blank      | editable   | Integer `0`–`15`                         |
| `left_curve`      | blank      | editable   | Integer `0`–`15`                         |
| `right_curve`     | blank      | editable   | Integer `0`–`15`                         |
| `slow_velocity`   | blank      | editable   | Integer `0`–`255`                        |
| `normal_velocity` | blank      | editable   | Integer `0`–`255`                        |
| `fast_velocity`   | blank      | editable   | Integer `0`–`255`                        |
| `stamina`         | blank      | editable   | Integer `0`–`255`                        |
| `unknown_1`       | read-only  | read-only  | Exported raw byte; must remain unchanged |
| `unknown_2`       | read-only  | read-only  | Exported raw byte; must remain unchanged |

The header must match the exported header exactly. Type-inapplicable fields must be blank. Unknown
bytes are deliberately explicit, but their purpose is unresolved and CSV import will not write
them.

## Atomic import

The importer parses the current supported ROM profile, validates the header, every row, all field
ranges, every name glyph, all team/slot identities, completeness, uniqueness, and the read-only
unknown bytes. It returns a replacement ROM only when there are no errors. If one or more rows fail,
the UI lists errors by CSV row and applies zero changes.
