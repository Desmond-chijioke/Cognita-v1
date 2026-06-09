// ── Thin client for Google's Gemini API (Generative Language REST endpoint) ───
// Used to power the AI-driven academic-integrity / quality features (plagiarism
// style analysis, AI-writing detection, reviewer feedback, reference checks,
// statistical-method advice). No SDK dependency — plain fetch, JSON-mode output.

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL   = 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiError extends Error {}

// Strips ```json ... ``` fences some models still wrap responses in even with
// responseMimeType: 'application/json'.
function stripFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

// Sends a prompt and parses the response as JSON of shape T.
// `schemaHint` is appended to the prompt to steer the model toward a concrete
// JSON shape — Gemini's JSON mode guarantees valid JSON, not a specific shape.
export async function generateJSON<T>(prompt: string): Promise<T> {
  if (!API_KEY) {
    throw new GeminiError('Gemini API key is not configured (VITE_GEMINI_API_KEY).');
  }

  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GeminiError(`Gemini request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError('Gemini returned an empty response.');

  try {
    return JSON.parse(stripFence(text)) as T;
  } catch {
    throw new GeminiError('Gemini returned a response that could not be parsed as JSON.');
  }
}

export function isGeminiConfigured(): boolean {
  return !!API_KEY;
}
