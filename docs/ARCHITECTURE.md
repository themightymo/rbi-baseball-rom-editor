# Architecture

## Runtime data flow

1. `RomUploader` reads a local file into a `Uint8Array`.
2. `RomProvider` stores an immutable original copy and a separate working copy.
3. `parseINES` extracts container metadata without game assumptions.
4. `detectRbiRom` compares only the declared PRG+CHR region with verified RBI profiles.
5. Research tools read the working copy; writes go through `setBytes`, which tracks byte differences from the original.
6. Export tools save the working ROM or construct an IPS patch from original-versus-working bytes.

Exact RBI detection resolves typed profile offsets relative to the iNES PRG/CHR regions. Roster UI,
annotations, CSV, and generators reuse that resolved team base; expanded-family facts with no
verified payload checksum remain manual, unsupported profile entries.

ROM bytes never leave the browser.

“Save and Play Game” makes a fresh `Uint8Array` snapshot of the working ROM in React state. The
JSNES player consumes that copy directly; it does not invoke file download, browser persistence, or
network APIs. Closing the player discards the running emulator, while editor state remains intact.

## Separation boundary

Generic NES/container logic belongs under `src/core`. Game identity, verified offsets, record formats, and write rules belong under `src/games/rbi`. UI components consume those APIs and must not invent offsets.

Pure research utilities now live in `core/nes/addressing.ts`, `core/rom/search.ts`, and `core/rom/annotations.ts`. The game-specific annotation registry is `games/rbi/annotations.ts`; an empty registry means no regions have been confirmed.

Generic NES palette and 2-bit planar CHR codecs live in `core/nes`. The raw CHR editor is bounded by
the iNES-declared CHR region and assigns no RBI-specific tile meaning.

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
- RBI field writers return new byte arrays and never mutate their input ROM.
- CSV import validates a complete 160-row roster and returns no ROM when any row fails.
- Unknown record bytes are exported visibly but remain read-only in cards and CSV.
- IPS export refuses length-changing input rather than silently emitting an incomplete patch.
- IPS records are split at the format's 65,535-byte record limit; offsets above its 24-bit range are rejected.

## Round-trip guarantees

Phase 7 exercises the complete 98,320-byte image rather than comparing only player records. Automated tests prove that an unchanged working copy exports identically, known batter and pitcher edits affect only their mapped bytes, restoring original values restores the whole image, and an independent IPS reader reproduces the same modified image as direct export.

RBI project files are versioned data, not arbitrary write lists. They bind edits to the full source-file CRC32 and detected profile, retain each expected original byte, validate every range and byte before returning a new ROM, and never mutate the supplied source.

## Recommendation boundary

`games/rbi/ratings.ts` converts user-entered baseball statistics into documented heuristic
suggestions without importing ROM parsing or writing code. The Ratings Lab requires manual review,
then applies selected values through the same confirmed record writers used by the roster editors.
Suggested ratings are never represented as decoded or canonical ROM facts.
