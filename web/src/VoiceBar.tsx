/** The talking indicator: who has the floor, and how loudly, at a glance. */
import { useCallback, useState } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import {
  usePipecatClient,
  usePipecatClientTransportState,
  useRTVIClientEvent,
} from "@pipecat-ai/client-react";

import { connectParams } from "./voqalize";

const BARS = 7;
// Each bar reacts to a different slice of the level, so the row ripples from the
// centre outwards instead of moving as one block.
const WEIGHTS = [0.35, 0.6, 0.85, 1, 0.85, 0.6, 0.35];

export function VoiceBar() {
  const client = usePipecatClient();
  const state = usePipecatClientTransportState();

  const [userLevel, setUserLevel] = useState(0);
  const [botLevel, setBotLevel] = useState(0);
  const [userTalking, setUserTalking] = useState(false);
  const [botTalking, setBotTalking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useRTVIClientEvent(RTVIEvent.LocalAudioLevel, useCallback((l: number) => setUserLevel(l), []));
  useRTVIClientEvent(RTVIEvent.RemoteAudioLevel, useCallback((l: number) => setBotLevel(l), []));
  useRTVIClientEvent(RTVIEvent.UserStartedSpeaking, useCallback(() => setUserTalking(true), []));
  useRTVIClientEvent(RTVIEvent.UserStoppedSpeaking, useCallback(() => setUserTalking(false), []));
  useRTVIClientEvent(RTVIEvent.BotStartedSpeaking, useCallback(() => setBotTalking(true), []));
  useRTVIClientEvent(
    RTVIEvent.BotStoppedSpeaking,
    useCallback(() => {
      setBotTalking(false);
      setBotLevel(0);
    }, []),
  );

  const live = state === "connected" || state === "ready";
  const busy = state === "connecting" || state === "authenticating";

  // The bot wins a tie: while it is speaking, the mic is still open for a
  // barge-in, and showing the user's own level then reads as an echo.
  const who = !live ? "off" : botTalking ? "bot" : userTalking ? "user" : "idle";
  const level = who === "bot" ? botLevel : who === "user" ? userLevel : 0;

  const status = !live
    ? busy
      ? "Connecting…"
      : "Not connected"
    : who === "bot"
      ? "Agent speaking"
      : who === "user"
        ? "Listening…"
        : "Ready — say what to draw";

  const toggle = async () => {
    setError(null);
    try {
      if (live) await client?.disconnect();
      else await client?.connect(await connectParams());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="voicebar" data-who={who}>
      <button className="talk" onClick={toggle} disabled={busy} data-live={live}>
        <span className="dot" />
        {live ? "Stop" : busy ? "Connecting…" : "Start talking"}
      </button>

      <div className="meter" aria-hidden>
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            style={{
              // 12% is the resting height, so the row stays visible while silent.
              transform: `scaleY(${0.12 + Math.min(1, level * 2.2) * WEIGHTS[i] * 0.88})`,
            }}
          />
        ))}
      </div>

      <span className="status">{error ?? status}</span>
    </div>
  );
}
