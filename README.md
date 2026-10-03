# R.B.I. Baseball ROM Editor

A browser-only research and editing foundation for the original NES release of **R.B.I. Baseball**. This phase identifies known clean licensed and unlicensed dumps and retains the byte inspection, diff, project, ROM export, and IPS tooling from the Tecmo ROM Editor foundation.

No ROM data is included or uploaded. Supply a legally obtained ROM; all processing happens in browser memory.

**[Open the RBI Baseball ROM Editor online](https://themightymo.github.io/rbi-baseball-rom-editor/)**

The hosted app is a single self-contained HTML page. Every push to `main` builds and publishes the
current code through [GitHub Actions](.github/workflows/deploy.yml).

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run build
npm run lint
```

`npm run build` creates `dist/index.html` with the JavaScript, CSS, and image assets inlined. It can
be served by any static host or opened locally. To run the same build check automatically before
each push, enable the repository hook once:

```bash
git config core.hooksPath .githooks
```

## Current scope

- Load `.nes`/`.bin` files and preserve an immutable original byte array.
- Display filename, file size, CRC32, and iNES status.
- Parse iNES PRG/CHR sizes, mapper, and trainer state.
- Identify verified clean RBI licensed and unlicensed cartridge payloads.
- Inspect/search bytes, experiment with custom record layouts, and view diffs.
- Save a ROM, an edit project, or an IPS patch.
- Keep RBI roster editing disabled until player formats are verified.

## Architecture

```text
src/
  core/nes/ines.ts          Generic iNES parsing
  games/rbi/profiles.ts     Verified RBI cartridge profiles
  games/rbi/detect.ts       RBI-specific identification policy
  components/               Generic research/export UI plus detection panel
  lib/romStore.tsx          Original/working bytes and edit tracking
  lib/checksum.ts           Generic CRC32
  lib/diff.ts               Generic diff and IPS generation
```

The inherited Tecmo-specific parsers and artwork components remain in source temporarily for reference and possible extraction of reusable pieces, but are not imported by the normal RBI route. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the migration boundary.

## Research records

- [RBI ROM map](docs/RBI-ROM-MAP.md)
- [Research log](docs/RESEARCH-LOG.md)

## Legal

This is an unofficial fan tool and is not affiliated with or endorsed by Atari, Tengen, Namco, Nintendo, MLB, or MLBPA. It contains no ROM or copyrighted game data.
