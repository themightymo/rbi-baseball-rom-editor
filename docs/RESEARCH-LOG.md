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
