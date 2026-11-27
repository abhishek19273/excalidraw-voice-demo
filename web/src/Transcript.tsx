/** One chronological feed: what was said, and what got drawn because of it. */
import { useEffect, useRef } from "react";
import { usePipecatConversation } from "@pipecat-ai/client-react";

export type DrawEvent = { id: number; createdAt: string; label: string };

type Row =
  | { kind: "said"; at: string; role: "user" | "assistant"; text: string; final: boolean }
  | { kind: "drew"; at: string; label: string };

export function Transcript({ draws }: { draws: DrawEvent[] }) {
  const { messages } = usePipecatConversation();
  const endRef = useRef<HTMLDivElement>(null);

  const said: Row[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      kind: "said" as const,
      at: m.createdAt,
      role: m.role as "user" | "assistant",
      // A part's text is a ReactNode for user turns and a BotOutputText object
      // for the bot's, so reach for `.text` before falling back to the node.
      text: m.parts
        .map((p) => {
          const t = p.text as { text?: string } | string | null;
          return typeof t === "string" ? t : (t?.text ?? "");
        })
        .join(""),
      final: m.final ?? false,
    }))
    .filter((r) => r.text.trim() !== "");

  const drew: Row[] = draws.map((d) => ({ kind: "drew" as const, at: d.createdAt, label: d.label }));

  const rows = [...said, ...drew].sort((a, b) => a.at.localeCompare(b.at));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [rows.length]);

  return (
    <section className="transcript">
      {rows.length === 0 && (
        <p className="empty">
          Try: <em>“draw a big red circle in the middle”</em>, then{" "}
          <em>“put a blue box labelled login below it”</em>.
        </p>
      )}

      {rows.map((row, i) =>
        row.kind === "drew" ? (
          <div key={`d${i}`} className="row drew">
            <span className="who" />
            <span className="chip">✎ {row.label}</span>
          </div>
        ) : (
          <div key={`s${i}`} className={`row said ${row.role}`} data-final={row.final}>
            <span className="who">{row.role === "user" ? "You" : "Agent"}</span>
            <span className="bubble">{row.text}</span>
          </div>
        ),
      )}
      <div ref={endRef} />
    </section>
  );
}
