import axios, { AxiosError } from "axios";

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
 * Normalizes model names (e.g. strips legacy 'openai/' prefix).
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
 * Robust extractor that finds valid JSON object/array from any string response
 * (e.g. markdown code blocks, explanatory preamble, trailing notes).
 */
export function extractJsonFromText<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("extractJsonFromText: Input text is empty");
  }

  // 1. Try stripping standard markdown code fences
  const cleaned = rawText.replace(/```(?:json)?\n?([\s\S]*?)```/gi, "$1").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // 2. Try directly parsing raw text
    try {
      return JSON.parse(rawText.trim()) as T;
    } catch {
      // 3. Fallback: Search for outer object { ... } or array [ ... ]
      const firstObj = rawText.indexOf("{");
      const lastObj = rawText.lastIndexOf("}");
      if (firstObj !== -1 && lastObj > firstObj) {
        try {
          return JSON.parse(rawText.substring(firstObj, lastObj + 1)) as T;
        } catch {}
      }

      const firstArr = rawText.indexOf("[");
      const lastArr = rawText.lastIndexOf("]");
      if (firstArr !== -1 && lastArr > firstArr) {
        try {
          return JSON.parse(rawText.substring(firstArr, lastArr + 1)) as T;
        } catch {}
      }

      throw new Error(`Failed to extract valid JSON from response: "${rawText.substring(0, 100)}..."`);
    }
  }
}

/**
 * Direct call to OpenAI Chat Completions API with automatic resilience and retries.
 */
export async function callOpenAI(options: CallOpenAIOptions): Promise<string> {
  const apiKey = getOpenAIApiKey();
  const model = normalizeModelName(options.model);

  const messages: OpenAIMessage[] = options.messages ? options.messages.map((m) => ({ ...m })) : [];

  if (options.systemPrompt) {
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

  // OpenAI requires the word 'json' in messages when response_format = { type: "json_object" }
  let useJsonMode = Boolean(options.jsonMode);
  if (useJsonMode) {
    const fullText = messages.map((m) => m.content).join(" ").toLowerCase();
    if (!fullText.includes("json")) {
      // Safely append requirement to system prompt or first message
      if (messages[0]?.role === "system") {
        messages[0].content += "\nRespond in valid JSON format.";
      } else {
        messages.unshift({ role: "system", content: "You are a helpful assistant. Respond in valid JSON format." });
      }
    }
  }

  const buildPayload = (json: boolean) => {
    const payload: Record<string, any> = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
    };
    if (options.maxTokens) payload.max_tokens = options.maxTokens;
    if (json) payload.response_format = { type: "json_object" };
    return payload;
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const timeout = options.timeoutMs ?? 30000;

  try {
    const response = await axios.post("https://api.openai.com/v1/chat/completions", buildPayload(useJsonMode), {
      headers,
      timeout,
    });
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI API returned empty completion choice.");
    return content;
  } catch (err: unknown) {
    const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
    const errorMsg = axiosErr.response?.data?.error?.message || axiosErr.message;

    // If json_object was rejected, retry without response_format
    if (useJsonMode && (axiosErr.response?.status === 400 || errorMsg.includes("response_format"))) {
      console.warn("[callOpenAI] Retrying without strict json_object response_format:", errorMsg);
      const retryRes = await axios.post("https://api.openai.com/v1/chat/completions", buildPayload(false), {
        headers,
        timeout,
      });
      const content = retryRes.data?.choices?.[0]?.message?.content;
      if (content) return content;
    }

    console.error("[callOpenAI] Error calling OpenAI API:", errorMsg);
    throw new Error(`OpenAI API error: ${errorMsg}`);
  }
}

/**
 * Calls OpenAI and parses the returned JSON with multi-layered fallback extraction.
 */
export async function callOpenAIJson<T = any>(
  options: CallOpenAIOptions,
  fallback?: T
): Promise<T> {
  try {
    const raw = await callOpenAI({
      ...options,
      jsonMode: options.jsonMode !== false,
    });

    return extractJsonFromText<T>(raw);
  } catch (err) {
    if (fallback !== undefined) {
      console.warn("[callOpenAIJson] Extraction failed, safely using fallback:", (err as Error).message);
      return fallback;
    }
    throw err;
  }
}
