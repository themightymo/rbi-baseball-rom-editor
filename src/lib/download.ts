type SavePickerWindow = Window & {
  showSaveFilePicker?: (opts: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{ createWritable: () => Promise<{ write: (d: Blob) => Promise<void>; close: () => Promise<void> }> }>;
};

export function download(name: string, data: Uint8Array | string, mime = "application/octet-stream") {
  const part: BlobPart = typeof data === "string" ? data : (new Uint8Array(data).buffer as ArrayBuffer);
  const blob = new Blob([part], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// "Save As": uses the native save dialog where supported (Chromium), otherwise a plain download.
export async function saveFileAs(name: string, data: Uint8Array) {
  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (!picker) return download(name, data);
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : ".nes";
  try {
    const handle = await picker({
      suggestedName: name,
      types: [{ description: "NES ROM", accept: { "application/octet-stream": [ext] } }],
    });
    const w = await handle.createWritable();
    await w.write(new Blob([new Uint8Array(data).buffer as ArrayBuffer]));
    await w.close();
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return; // user cancelled
    download(name, data);
  }
}
