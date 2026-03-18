import type { ModelAdapter } from './model-adapter.js';

export interface RAGConfig {
  /** Model adapter for embeddings and generation */
  readonly model: ModelAdapter;

  /** Maximum chunks to retrieve per query */
  readonly topK?: number | undefined;

  /** Minimum similarity score (0-1) to include a chunk */
  readonly minScore?: number | undefined;
}

export interface RAGChunk {
  /** Unique chunk ID */
  readonly id: string;

  /** Source identifier (e.g., "career", "blog", "docs") */
  readonly source: string;

  /** Human-readable title */
  readonly title: string;

  /** The text content */
  readonly content: string;

  /** Pre-computed embedding vector */
  readonly embedding: readonly number[];
}

export interface RAGQueryResult {
  /** Retrieved chunks with scores */
  readonly chunks: readonly ScoredChunk[];

  /** Generated answer (if generation was requested) */
  readonly answer?: string | undefined;
}

export interface ScoredChunk {
  /** The chunk */
  readonly chunk: RAGChunk;

  /** Cosine similarity score (0-1) */
  readonly score: number;
}

export interface RAGEngine {
  /** Add a chunk to the knowledge base */
  addChunk(chunk: Omit<RAGChunk, 'embedding'>): Promise<RAGChunk>;

  /** Add a pre-embedded chunk */
  addEmbeddedChunk(chunk: RAGChunk): void;

  /** Retrieve relevant chunks for a query */
  retrieve(query: string): Promise<readonly ScoredChunk[]>;

  /** Retrieve and generate an answer */
  query(query: string, systemPrompt?: string | undefined): Promise<RAGQueryResult>;

  /** Get all chunks */
  chunks(): readonly RAGChunk[];

  /** Clear all chunks */
  clear(): void;
}

/** Create an in-memory RAG engine */
export function createRAG(config: RAGConfig): RAGEngine {
  const store: RAGChunk[] = [];
  const topK = config.topK ?? 5;
  const minScore = config.minScore ?? 0.3;

  return {
    async addChunk(chunk: Omit<RAGChunk, 'embedding'>): Promise<RAGChunk> {
      const result = await config.model.embed(chunk.content);
      const fullChunk: RAGChunk = { ...chunk, embedding: result.vector };
      store.push(fullChunk);
      return fullChunk;
    },

    addEmbeddedChunk(chunk: RAGChunk): void {
      store.push(chunk);
    },

    async retrieve(query: string): Promise<readonly ScoredChunk[]> {
      const queryEmbedding = await config.model.embed(query);

      const scored: ScoredChunk[] = store
        .map((chunk) => ({
          chunk,
          score: cosineSimilarity(queryEmbedding.vector, chunk.embedding),
        }))
        .filter((s) => s.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      return scored;
    },

    async query(query: string, systemPrompt?: string | undefined): Promise<RAGQueryResult> {
      const chunks = await this.retrieve(query);

      if (chunks.length === 0) {
        return { chunks, answer: 'No relevant information found.' };
      }

      const context = chunks
        .map((s) => `[${s.chunk.source}: ${s.chunk.title}]\n${s.chunk.content}`)
        .join('\n---\n');

      const prompt = `Context:\n${context}\n\nQuestion: ${query}`;
      const defaultSystem = 'Answer the question using only the provided context. Be concise and cite sources.';

      const result = await config.model.generate(prompt, {
        systemPrompt: systemPrompt ?? defaultSystem,
        temperature: 0.3,
      });

      return { chunks, answer: result.text };
    },

    chunks(): readonly RAGChunk[] {
      return [...store];
    },

    clear(): void {
      store.length = 0;
    },
  };
}

function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dot / denominator;
}
