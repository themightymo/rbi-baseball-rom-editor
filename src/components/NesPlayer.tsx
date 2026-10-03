import { useEffect, useRef, useState } from "react";
import { Controller, NES, type ButtonKey } from "jsnes";
import { Button } from "@/components/ui/button";
import type { NesPlaySnapshot } from "@/core/nes/play";
import { ArrowLeft, Maximize, Pause, Play, RotateCcw, Volume2 } from "lucide-react";

const WIDTH = 256;
const HEIGHT = 240;
const FRAME_RATE = 60;

const KEYS: Readonly<Record<string, ButtonKey>> = {
  ArrowUp: Controller.BUTTON_UP,
  ArrowDown: Controller.BUTTON_DOWN,
  ArrowLeft: Controller.BUTTON_LEFT,
  ArrowRight: Controller.BUTTON_RIGHT,
  KeyA: Controller.BUTTON_A,
  KeyQ: Controller.BUTTON_A,
  KeyS: Controller.BUTTON_B,
  KeyO: Controller.BUTTON_B,
  Enter: Controller.BUTTON_START,
  Tab: Controller.BUTTON_SELECT,
};

export function NesPlayer({
  snapshot,
  onClose,
}: {
  snapshot: NesPlaySnapshot;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const nesRef = useRef<NES | null>(null);
  const playingRef = useRef(true);
  const audioRef = useRef<AudioContext | null>(null);
  const [paused, setPaused] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [status, setStatus] = useState(`Loading ${snapshot.name}…`);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    playingRef.current = true;
    setPaused(false);
    setAudioReady(false);
    setStatus(`Loading ${snapshot.name}…`);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      setStatus("Canvas rendering is unavailable in this browser.");
      return;
    }

    const image = context.createImageData(WIDTH, HEIGHT);
    const framebuffer = new Uint32Array(image.data.buffer);
    const AudioContextClass = window.AudioContext;
    const audio = new AudioContextClass();
    audioRef.current = audio;
    const queueSize = 16384;
    const queueMask = queueSize - 1;
    const left = new Float32Array(queueSize);
    const right = new Float32Array(queueSize);
    let read = 0;
    let write = 0;
    const audioNode = audio.createScriptProcessor(1024, 0, 2);
    audioNode.onaudioprocess = (event) => {
      const outputLeft = event.outputBuffer.getChannelData(0);
      const outputRight = event.outputBuffer.getChannelData(1);
      for (let index = 0; index < outputLeft.length; index++) {
        if (read === write) {
          outputLeft[index] = 0;
          outputRight[index] = 0;
        } else {
          outputLeft[index] = left[read];
          outputRight[index] = right[read];
          read = (read + 1) & queueMask;
        }
      }
    };
    audioNode.connect(audio.destination);

    const nes = new NES({
      sampleRate: audio.sampleRate,
      onFrame: (frame) => {
        for (let index = 0; index < frame.length; index++) {
          framebuffer[index] = 0xff000000 | frame[index];
        }
        context.putImageData(image, 0, 0);
      },
      onAudioSample: (sampleLeft, sampleRight) => {
        const next = (write + 1) & queueMask;
        if (next === read) read = (read + 1) & queueMask;
        left[write] = sampleLeft;
        right[write] = sampleRight;
        write = next;
      },
    });
    nesRef.current = nes;

    try {
      nes.loadROM(snapshot.bytes);
      setStatus(`Now playing · ${snapshot.name}`);
      canvas.focus({ preventScroll: true });
    } catch (error) {
      playingRef.current = false;
      setPaused(true);
      setStatus(playError(error));
    }

    let animationFrame = 0;
    let previous: number | null = null;
    let budget = 0;
    const draw = (timestamp: number) => {
      animationFrame = requestAnimationFrame(draw);
      if (!playingRef.current || document.hidden) {
        previous = null;
        budget = 0;
        return;
      }
      if (previous !== null) {
        const elapsed = timestamp - previous;
        if (elapsed >= 0 && elapsed <= 100) {
          budget += (elapsed * FRAME_RATE) / 1000;
          try {
            while (budget >= 1) {
              nes.frame();
              budget--;
            }
          } catch (error) {
            playingRef.current = false;
            setPaused(true);
            setStatus(playError(error));
          }
        } else {
          budget = 0;
        }
      }
      previous = timestamp;
    };
    animationFrame = requestAnimationFrame(draw);

    const held = new Set<ButtonKey>();
    const release = () => {
      for (const button of held) nes.buttonUp(1, button);
      held.clear();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (document.activeElement !== canvas || event.repeat) return;
      if (event.key === "Escape") {
        canvas.blur();
        release();
        return;
      }
      const button = KEYS[event.code];
      if (button === undefined) return;
      event.preventDefault();
      held.add(button);
      nes.buttonDown(1, button);
    };
    const keyUp = (event: KeyboardEvent) => {
      const button = KEYS[event.code];
      if (button === undefined || !held.has(button)) return;
      event.preventDefault();
      held.delete(button);
      nes.buttonUp(1, button);
    };
    const visibility = () => {
      release();
      previous = null;
      budget = 0;
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("blur", release);

    return () => {
      playingRef.current = false;
      cancelAnimationFrame(animationFrame);
      release();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("blur", release);
      audioNode.disconnect();
      void audio.close();
      audioRef.current = null;
      nesRef.current = null;
    };
  }, [snapshot]);

  const enableAudio = async () => {
    try {
      await audioRef.current?.resume();
      setAudioReady(audioRef.current?.state === "running");
      canvasRef.current?.focus({ preventScroll: true });
    } catch {
      setStatus("The browser did not allow audio. Gameplay can continue silently.");
    }
  };

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    playingRef.current = !next;
    if (!next) canvasRef.current?.focus({ preventScroll: true });
  };

  return (
    <section className="nes-window overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#fc74b4] p-3">
        <div>
          <h2 className="text-sm">Now playing · {snapshot.name}</h2>
          <p className="mt-1 text-[8px] text-muted-foreground">
            In-memory snapshot · no ROM file was downloaded or uploaded
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          <ArrowLeft className="size-4" /> Back to editor
        </Button>
      </div>

      <div ref={playerRef} className="bg-black p-3 sm:p-5">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          tabIndex={0}
          aria-label="NES game screen"
          className="mx-auto block aspect-[256/240] w-full max-w-3xl border-2 border-white/30 bg-black outline-none [image-rendering:pixelated] focus:border-[#fcd800]"
          onPointerDown={() => void enableAudio()}
        />
        <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-white" aria-live="polite">
          {status}
        </p>
        <div className="mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={togglePause}>
            {paused ? <Play /> : <Pause />} {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              nesRef.current?.reset();
              playingRef.current = true;
              setPaused(false);
              canvasRef.current?.focus({ preventScroll: true });
            }}
          >
            <RotateCcw /> Reset
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => void enableAudio()}>
            <Volume2 /> {audioReady ? "Audio enabled" : "Enable audio"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await playerRef.current?.requestFullscreen();
              } catch {
                setStatus("Fullscreen could not be opened in this browser.");
              }
            }}
          >
            <Maximize /> Fullscreen
          </Button>
        </div>
      </div>

      <div className="grid gap-3 p-4 text-xs sm:grid-cols-2">
        <div>
          <h3 className="font-semibold">Keyboard controls</h3>
          <p className="mt-2 text-muted-foreground">
            Move: arrow keys · A: A/Q · B: S/O · Start: Enter · Select: Tab
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Focus</h3>
          <p className="mt-2 text-muted-foreground">
            Click the game screen to play and enable audio. Press Escape to release keyboard focus.
          </p>
        </div>
      </div>
    </section>
  );
}

function playError(error: unknown): string {
  if (error instanceof Error) {
    const mapper = /^Unsupported mapper: (\d+)/.exec(error.message);
    if (mapper) return `This browser player does not support cartridge mapper ${mapper[1]}.`;
    return `Unable to start this ROM: ${error.message}`;
  }
  return "Unable to start this ROM in the browser player.";
}
