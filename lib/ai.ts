import axios from "axios";

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CallOpenAIOptions {
  messages?: OpenAIMessage[];
  systemPrompt?: string;
  userPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

/**
 * Normalizes model names (e.g. strips legacy 'openai/' prefix from Straico config).
 */
export function normalizeModelName(rawModel?: string): string {
  if (!rawModel) return process.env.OPENAI_MODEL || "gpt-4o-mini";
  return rawModel.replace(/^openai\//i, "");
}

/**
 * Resolves the active OpenAI API key.
 */
export function getOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY || process.env.STRAICO_API_KEY;
  if (!key) {
    throw new Error("OpenAI API key is missing. Please set OPENAI_API_KEY in environment.");
  }
  return key;
}

/**
 * Direct call to OpenAI Chat Completions API (https://api.openai.com/v1/chat/completions).
 */
export async function callOpenAI(options: CallOpenAIOptions): Promise<string> {
  const apiKey = getOpenAIApiKey();
  const model = normalizeModelName(options.model);

  const messages: OpenAIMessage[] = options.messages ? [...options.messages] : [];

  if (options.systemPrompt) {
    // If not already in messages, prepend system prompt
    if (!messages.some((m) => m.role === "system")) {
      messages.unshift({ role: "system", content: options.systemPrompt });
    }
  }

  if (options.userPrompt) {
    messages.push({ role: "user", content: options.userPrompt });
  }

  if (messages.length === 0) {
    throw new Error("callOpenAI: At least one prompt or message is required.");
  }

  const payload: Record<string, any> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
  };

  if (options.maxTokens) {
    payload.max_tokens = options.maxTokens;
  }

  if (options.jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const response = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: options.timeoutMs ?? 30000,
  });

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI API returned an empty completion choice.");
  }

  return content;
}

/**
 * Calls OpenAI and parses the returned JSON safely, stripping code fences if present.
 */
export async function callOpenAIJson<T = any>(
  options: CallOpenAIOptions,
  fallback?: T
): Promise<T> {
  try {
    const raw = await callOpenAI({
      ...options,
      jsonMode: options.jsonMode !== false, // default true for JSON helper
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    if (fallback !== undefined) {
      console.warn("[callOpenAIJson] Failed to parse JSON, returning fallback:", (err as Error).message);
      return fallback;
    }
    throw err;
  }
}
