/**
 * Model adapter — unified interface for any LLM provider.
 * Swap Gemini, OpenAI, Azure, Anthropic, or local Ollama without changing code.
 */

export interface ModelConfig {
  /** Provider name */
  readonly provider: 'gemini' | 'openai' | 'azure-openai' | 'anthropic' | 'ollama';

  /** Model ID (e.g., "gemini-2.5-flash", "gpt-4o") */
  readonly model: string;

  /** API key (not needed for Ollama) */
  readonly apiKey?: string | undefined;

  /** Base URL override (for Azure, Ollama, or proxies) */
  readonly baseUrl?: string | undefined;

  /** Embedding model ID (defaults to provider's default) */
  readonly embeddingModel?: string | undefined;
}

export interface EmbeddingResult {
  /** The embedding vector */
  readonly vector: readonly number[];

  /** Dimensions */
  readonly dimensions: number;
}

export interface GenerationResult {
  /** Generated text */
  readonly text: string;

  /** Token usage */
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
  } | undefined;
}

export interface ModelAdapter {
  /** Get embeddings for text */
  embed(text: string): Promise<EmbeddingResult>;

  /** Generate text from a prompt */
  generate(prompt: string, options?: GenerateOptions | undefined): Promise<GenerationResult>;

  /** Provider info */
  readonly provider: string;
  readonly model: string;
}

export interface GenerateOptions {
  /** Temperature (0-1). Lower = more deterministic */
  readonly temperature?: number | undefined;

  /** Max output tokens */
  readonly maxTokens?: number | undefined;

  /** System prompt */
  readonly systemPrompt?: string | undefined;
}

/** Create a model adapter for the given provider */
export function createModelAdapter(config: ModelConfig): ModelAdapter {
  switch (config.provider) {
    case 'gemini':
      return createGeminiAdapter(config);
    case 'openai':
    case 'azure-openai':
      return createOpenAIAdapter(config);
    case 'anthropic':
      return createAnthropicAdapter(config);
    case 'ollama':
      return createOllamaAdapter(config);
    default:
      throw new NexarAIError(`Unknown provider: ${config.provider as string}`);
  }
}

function createGeminiAdapter(config: ModelConfig): ModelAdapter {
  const baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
  const embeddingModel = config.embeddingModel ?? 'gemini-embedding-001';

  return {
    provider: 'gemini',
    model: config.model,

    async embed(text: string): Promise<EmbeddingResult> {
      const url = `${baseUrl}/models/${embeddingModel}:embedContent?key=${config.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      });

      if (!res.ok) {
        throw new NexarAIError(`Gemini embedding failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json() as { embedding: { values: number[] } };
      return {
        vector: data.embedding.values,
        dimensions: data.embedding.values.length,
      };
    },

    async generate(prompt: string, options?: GenerateOptions | undefined): Promise<GenerationResult> {
      const url = `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.3,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
      };

      if (options?.systemPrompt) {
        body['systemInstruction'] = { parts: [{ text: options.systemPrompt }] };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new NexarAIError(`Gemini generation failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json() as {
        candidates: { content: { parts: { text: string }[] } }[];
        usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
      };

      const text = data.candidates[0]?.content.parts[0]?.text ?? '';
      return {
        text,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
        } : undefined,
      };
    },
  };
}

function createOpenAIAdapter(config: ModelConfig): ModelAdapter {
  const baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  const embeddingModel = config.embeddingModel ?? 'text-embedding-3-large';

  return {
    provider: config.provider,
    model: config.model,

    async embed(text: string): Promise<EmbeddingResult> {
      const res = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ model: embeddingModel, input: text }),
      });

      if (!res.ok) {
        throw new NexarAIError(`OpenAI embedding failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json() as { data: { embedding: number[] }[] };
      const vector = data.data[0]?.embedding ?? [];
      return { vector, dimensions: vector.length };
    },

    async generate(prompt: string, options?: GenerateOptions | undefined): Promise<GenerationResult> {
      const messages: { role: string; content: string }[] = [];
      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 2048,
        }),
      });

      if (!res.ok) {
        throw new NexarAIError(`OpenAI generation failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json() as {
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
      };

      return {
        text: data.choices[0]?.message.content ?? '',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
        } : undefined,
      };
    },
  };
}

function createAnthropicAdapter(config: ModelConfig): ModelAdapter {
  const baseUrl = config.baseUrl ?? 'https://api.anthropic.com/v1';

  return {
    provider: 'anthropic',
    model: config.model,

    async embed(_text: string): Promise<EmbeddingResult> {
      throw new NexarAIError('Anthropic does not provide an embedding API. Use a separate embedding provider.');
    },

    async generate(prompt: string, options?: GenerateOptions | undefined): Promise<GenerationResult> {
      const res = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: options?.maxTokens ?? 2048,
          system: options?.systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        throw new NexarAIError(`Anthropic generation failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json() as {
        content: { text: string }[];
        usage?: { input_tokens: number; output_tokens: number };
      };

      return {
        text: data.content[0]?.text ?? '',
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
        } : undefined,
      };
    },
  };
}

function createOllamaAdapter(config: ModelConfig): ModelAdapter {
  const baseUrl = config.baseUrl ?? 'http://127.0.0.1:11434';
  const embeddingModel = config.embeddingModel ?? config.model;

  return {
    provider: 'ollama',
    model: config.model,

    async embed(text: string): Promise<EmbeddingResult> {
      const res = await fetch(`${baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: embeddingModel, input: text }),
      });

      if (!res.ok) {
        throw new NexarAIError(`Ollama embedding failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json() as { embeddings: number[][] };
      const vector = data.embeddings[0] ?? [];
      return { vector, dimensions: vector.length };
    },

    async generate(prompt: string, options?: GenerateOptions | undefined): Promise<GenerationResult> {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.3,
            num_predict: options?.maxTokens ?? 2048,
          },
        }),
      });

      if (!res.ok) {
        throw new NexarAIError(`Ollama generation failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json() as {
        message: { content: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };

      return {
        text: data.message.content,
        usage: (data.prompt_eval_count !== undefined && data.eval_count !== undefined) ? {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
        } : undefined,
      };
    },
  };
}

export class NexarAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NexarAIError';
  }
}
