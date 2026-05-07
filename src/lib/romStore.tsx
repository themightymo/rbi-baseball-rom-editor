import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_ROM_MAP, type RomMap } from "@/types/RomMap";
import { crc32, detectINES } from "@/lib/checksum";

interface RomState {
  rom: Uint8Array | null;
  romName: string | null;
  romChecksum: string | null;
  hasINES: boolean;
  originalRom: Uint8Array | null; // baseline for diff/IPS
  setRom: (bytes: Uint8Array, name: string) => void;
  resetRom: () => void;
  // Edits: offset -> new byte
  edits: Map<number, number>;
  setBytes: (offset: number, bytes: Uint8Array) => void;
  clearEdits: () => void;
  romMap: RomMap;
  setRomMap: (m: RomMap) => void;
}

const Ctx = createContext<RomState | null>(null);

const LS_MAP = "tecmo.rommap.v1";

export function RomProvider({ children }: { children: ReactNode }) {
  const [rom, setRomBytes] = useState<Uint8Array | null>(null);
  const [originalRom, setOriginalRom] = useState<Uint8Array | null>(null);
  const [romName, setRomName] = useState<string | null>(null);
  const [romChecksum, setChecksum] = useState<string | null>(null);
  const [hasINES, setHasINES] = useState(false);
  const editsRef = useRef(new Map<number, number>());
  const [, force] = useState(0);
  const [romMap, setRomMapState] = useState<RomMap>(() => {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LS_MAP) : null;
      return raw ? (JSON.parse(raw) as RomMap) : DEFAULT_ROM_MAP;
    } catch {
      return DEFAULT_ROM_MAP;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_MAP, JSON.stringify(romMap));
    } catch {}
  }, [romMap]);

  const value: RomState = useMemo(
    () => ({
      rom,
      romName,
      romChecksum,
      hasINES,
      originalRom,
      setRom: (bytes, name) => {
        setRomBytes(bytes);
        setOriginalRom(new Uint8Array(bytes));
        setRomName(name);
        setChecksum(crc32(bytes));
        setHasINES(detectINES(bytes));
        editsRef.current.clear();
        force((n) => n + 1);
      },
      resetRom: () => {
        setRomBytes(null);
        setOriginalRom(null);
        setRomName(null);
        setChecksum(null);
        setHasINES(false);
        editsRef.current.clear();
        force((n) => n + 1);
      },
      edits: editsRef.current,
      setBytes: (offset, bytes) => {
        if (!rom) return;
        const next = new Uint8Array(rom);
        for (let i = 0; i < bytes.length; i++) {
          next[offset + i] = bytes[i];
          editsRef.current.set(offset + i, bytes[i]);
        }
        setRomBytes(next);
        force((n) => n + 1);
      },
      clearEdits: () => {
        if (!originalRom) return;
        setRomBytes(new Uint8Array(originalRom));
        editsRef.current.clear();
        force((n) => n + 1);
      },
      romMap,
      setRomMap: setRomMapState,
    }),
    [rom, romName, romChecksum, hasINES, originalRom, romMap],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRom() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRom must be used within RomProvider");
  return v;
}
