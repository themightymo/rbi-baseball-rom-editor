# Architecture

## Runtime data flow

1. `RomUploader` reads a local file into a `Uint8Array`.
2. `RomProvider` stores an immutable original copy and a separate working copy.
3. `parseINES` extracts container metadata without game assumptions.
4. `detectRbiRom` compares only the declared PRG+CHR region with verified RBI profiles.
5. Research tools read the working copy; writes go through `setBytes`, which tracks byte differences from the original.
6. Export tools save the working ROM or construct an IPS patch from original-versus-working bytes.

ROM bytes never leave the browser.

## Separation boundary

Generic NES/container logic belongs under `src/core`. Game identity, verified offsets, record formats, and write rules belong under `src/games/rbi`. UI components consume those APIs and must not invent offsets.

This phase introduces `core/nes/ines.ts` and the RBI detection layer. Existing generic utilities remain under `src/lib` to avoid a broad refactor before useful RBI work. They can move incrementally without changing behavior.

## Inherited code

The repository still contains dormant Tecmo-specific modules (rosters, abilities, names, helmets, faces, and their screens). They are excluded from the RBI route rather than deleted during Phase 0. Their generic infrastructure can be extracted later; game-specific assumptions must never be called by RBI code.

## Editing safety

- `originalRom` is copied when a file loads and is never mutated.
- `rom` is copied for each edit.
- `edits` contains only offsets whose current value differs from the original.
- Undo-all restores a fresh copy of the original.
- Detection never relies on filenames.
- Detection excludes bytes after the iNES-declared PRG+CHR region, while warning about them.
