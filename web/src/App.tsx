import { useCallback, useRef, useState } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { PipecatClient } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";
import {
  PipecatClientAudio,
  PipecatClientProvider,
  useUICommandHandler,
} from "@pipecat-ai/client-react";

import { VoiceBar } from "./VoiceBar";
import { Transcript } from "./Transcript";
import type { DrawEvent } from "./Transcript";
import { arrowSkeleton, shapeSkeleton, textSkeleton } from "./drawing";
import type { DrawArrow, DrawShape, DrawText } from "./drawing";
import "@excalidraw/excalidraw/index.css";
import "./App.css";

type Skeleton = Parameters<typeof convertToExcalidrawElements>[0][number];

function Board({ onDraw }: { onDraw: (label: string) => void }) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  // Undo is a stack of whole scenes. A labelled rectangle is two elements, an
  // arrow with a label is two more, and snapshots get that right for free.
  const history = useRef<readonly unknown[][]>([]);

  const add = useCallback(
    (skeleton: Skeleton, label: string) => {
      if (!api) return;
      const current = api.getSceneElements();
      history.current.push(current);
      api.updateScene({
        elements: [...current, ...convertToExcalidrawElements([skeleton])],
      });
      api.scrollToContent(undefined, { fitToContent: true, animate: true });
      onDraw(label);
    },
    [api, onDraw],
  );

  useUICommandHandler<DrawShape>("draw_shape", (p) =>
    add(shapeSkeleton(p), `${p.stroke_color} ${p.shape}${p.label ? ` “${p.label}”` : ""}`),
  );
  useUICommandHandler<DrawArrow>("draw_arrow", (p) =>
    add(arrowSkeleton(p), p.arrowhead ? "arrow" : "line"),
  );
  useUICommandHandler<DrawText>("draw_text", (p) => add(textSkeleton(p), `text “${p.text}”`));

  useUICommandHandler("clear_canvas", () => {
    if (!api) return;
    history.current.push(api.getSceneElements());
    api.updateScene({ elements: [] });
    onDraw("cleared the canvas");
  });

  useUICommandHandler("undo_last", () => {
    const previous = history.current.pop();
    if (!api || !previous) return;
    api.updateScene({ elements: previous as never });
    onDraw("undid the last element");
  });

  return (
    <div className="board">
      <Excalidraw excalidrawAPI={setApi} />
    </div>
  );
}

export default function App() {
  const [client] = useState(
    () => new PipecatClient({ transport: new SmallWebRTCTransport(), enableMic: true }),
  );
  const [draws, setDraws] = useState<DrawEvent[]>([]);

  const onDraw = useCallback((label: string) => {
    setDraws((prev) => [...prev, { id: prev.length, createdAt: new Date().toISOString(), label }]);
  }, []);

  return (
    <PipecatClientProvider client={client}>
      <header>
        <h1>Excalidraw, out loud</h1>
        <VoiceBar />
      </header>
      <main>
        <Board onDraw={onDraw} />
        <Transcript draws={draws} />
      </main>
      <PipecatClientAudio />
    </PipecatClientProvider>
  );
}
