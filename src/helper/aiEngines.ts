// ── Unified AI engine router for JSON-mode completions ────────────────────────
// Supports Gemini, OpenAI, Groq (free), and Mistral.
// Keys are read from VITE_ env vars at build time.

export type AIEngine = 'gemini' | 'openai' | 'groq' | 'mistral' | 'claude';

export interface AIEngineOption {
  value:       AIEngine;
  label:       string;
  description: string;
  model:       string;
  free:        boolean;
}

export const AI_ENGINE_OPTIONS: AIEngineOption[] = [
  {
    value:       'gemini',
    label:       'Gemini 2.0 Flash',
    description: 'Google · Fast · Free tier',
    model:       'gemini-2.0-flash',
    free:        true,
  },
  {
    value:       'openai',
    label:       'GPT-4o Mini',
    description: 'OpenAI · High accuracy',
    model:       'gpt-4o-mini',
    free:        false,
  },
  {
    value:       'claude',
    label:       'Claude Sonnet 4',
    description: 'Anthropic · Claude API key',
    model:       'claude-sonnet-4-5',
    free:        false,
  },
  {
    value:       'groq',
    label:       'LLaMA 3.3 70B (Groq)',
    description: 'Meta / Groq · Ultra-fast · Free tier',
    model:       'llama-3.3-70b-versatile',
    free:        true,
  },
  {
    value:       'mistral',
    label:       'Mistral Large',
    description: 'Mistral AI · Strong reasoning',
    model:       'mistral-large-latest',
    free:        false,
  },
];

const KEYS: Record<AIEngine, string | undefined> = {
  gemini:  import.meta.env.VITE_GEMINI_API_KEY  as string | undefined,
  openai:  import.meta.env.VITE_OPENAI_API_KEY  as string | undefined,
  claude:  import.meta.env.VITE_CLAUDE_API_KEY as string | undefined,
  groq:    import.meta.env.VITE_GROQ_API_KEY    as string | undefined,
  mistral: import.meta.env.VITE_MISTRAL_API_KEY as string | undefined,
};

export function isEngineConfigured(engine: AIEngine): boolean {
  return !!KEYS[engine];
}

export class AIEngineError extends Error {}

function stripFence(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1] : t;
}

// ── Gemini REST API ────────────────────────────────────────────────────────────

async function callGemini<T>(apiKey: string, prompt: string): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AIEngineError(`Gemini request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AIEngineError('Gemini returned an empty response.');
  try { return JSON.parse(stripFence(text)) as T; }
  catch { throw new AIEngineError('Gemini response could not be parsed as JSON.'); }
}

// ── OpenAI-compatible (OpenAI / Groq / Mistral) ───────────────────────────────

async function callOpenAICompat<T>(
  endpoint: string,
  apiKey:   string,
  model:    string,
  prompt:   string,
): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages:        [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature:     0.3,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AIEngineError(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new AIEngineError('AI engine returned an empty response.');
  try { return JSON.parse(stripFence(text)) as T; }
  catch { throw new AIEngineError('AI response could not be parsed as JSON.'); }
}

async function callClaude<T>(apiKey: string, prompt: string): Promise<T> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AIEngineError(`Claude request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string | undefined = data?.content?.[0]?.text;
  if (!text) throw new AIEngineError('Claude returned an empty response.');
  try { return JSON.parse(stripFence(text)) as T; }
  catch { throw new AIEngineError('Claude response could not be parsed as JSON.'); }
}

// ── Public router ─────────────────────────────────────────────────────────────

export async function generateEngineJSON<T>(prompt: string, engine: AIEngine): Promise<T> {
  const key = KEYS[engine];
  if (!key) {
    const names: Record<AIEngine, string> = {
      gemini:  'VITE_GEMINI_API_KEY',
      openai:  'VITE_OPENAI_API_KEY',
      claude:  'VITE_CLAUDE_API_KEY',
      groq:    'VITE_GROQ_API_KEY',
      mistral: 'VITE_MISTRAL_API_KEY',
    };
    throw new AIEngineError(`${names[engine]} is not configured. Add it to your .env file.`);
  }

  switch (engine) {
    case 'gemini':
      return callGemini<T>(key, prompt);
    case 'claude':
      return callClaude<T>(key, prompt);
    case 'openai':
      return callOpenAICompat<T>('https://api.openai.com/v1/chat/completions', key, 'gpt-4o-mini', prompt);
    case 'groq':
      return callOpenAICompat<T>('https://api.groq.com/openai/v1/chat/completions', key, 'llama-3.3-70b-versatile', prompt);
    case 'mistral':
      return callOpenAICompat<T>('https://api.mistral.ai/v1/chat/completions', key, 'mistral-large-latest', prompt);
  }
}
