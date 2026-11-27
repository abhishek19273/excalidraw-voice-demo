/** One fetch for the connect parameters, then stock pipecat. */

const API = import.meta.env.VITE_VOQALIZE_API;
const PK = import.meta.env.VITE_VOQALIZE_PK;
const AGENT_ID = import.meta.env.VITE_VOQALIZE_AGENT_ID;

export async function connectParams() {
  const res = await fetch(`${API}/sessions.connect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PK}`, "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id: AGENT_ID, config: { record: false } }),
  });
  if (!res.ok) throw new Error(`sessions.connect ${res.status}: ${await res.text()}`);

  const params = await res.json();
  return {
    ...params,
    webrtc_request_params: {
      ...params.webrtc_request_params,
      // Pipecat builds its offer with `Object.fromEntries(headers.entries())`,
      // so it needs a real Headers, not the plain object JSON gave us.
      headers: new Headers(params.webrtc_request_params.headers),
    },
  };
}
