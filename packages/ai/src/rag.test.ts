import { describe, expect, it } from 'vitest';
import type {
  EmbeddingResult,
  GenerateOptions,
  GenerationResult,
  ModelAdapter,
} from './model-adapter.js';
import { createRAG } from './rag.js';

/** Simple mock adapter that creates deterministic embeddings from text hash */
function createMockAdapter(): ModelAdapter {
  return {
    provider: 'mock',
    model: 'mock-model',

    async embed(text: string): Promise<EmbeddingResult> {
      const vector = textToVector(text, 64);
      return { vector, dimensions: 64 };
    },

    async generate(
      prompt: string,
      _options?: GenerateOptions | undefined,
    ): Promise<GenerationResult> {
      return { text: `Answer based on: ${prompt.slice(0, 50)}...` };
    },
  };
}

/** Deterministic hash-based vector for testing similarity */
function textToVector(text: string, dims: number): number[] {
  const vector: number[] = [];
  for (let i = 0; i < dims; i++) {
    let hash = 0;
    for (let j = 0; j < text.length; j++) {
      hash = ((hash << 5) - hash + text.charCodeAt(j) * (i + 1)) | 0;
    }
    vector.push(Math.sin(hash) * 0.1);
  }
  return vector;
}

describe('RAG Engine', () => {
  it('adds and retrieves chunks', async () => {
    const rag = createRAG({
      model: createMockAdapter(),
      topK: 3,
      minScore: -1,
    });

    await rag.addChunk({
      id: '1',
      source: 'docs',
      title: 'React Guide',
      content: 'React is a UI library for building components',
    });
    await rag.addChunk({
      id: '2',
      source: 'docs',
      title: 'Database Guide',
      content: 'PostgreSQL is a relational database system',
    });
    await rag.addChunk({
      id: '3',
      source: 'docs',
      title: 'Node Guide',
      content: 'Node.js is a JavaScript runtime for servers',
    });

    expect(rag.chunks()).toHaveLength(3);

    const results = await rag.retrieve('React components and UI');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.score).toBeDefined();
  });

  it('respects topK limit', async () => {
    const rag = createRAG({
      model: createMockAdapter(),
      topK: 2,
      minScore: -1, // Accept all for testing
    });

    await rag.addChunk({ id: '1', source: 'a', title: 'A', content: 'Alpha' });
    await rag.addChunk({ id: '2', source: 'b', title: 'B', content: 'Beta' });
    await rag.addChunk({ id: '3', source: 'c', title: 'C', content: 'Charlie' });
    await rag.addChunk({ id: '4', source: 'd', title: 'D', content: 'Delta' });

    const results = await rag.retrieve('some query');
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('queries with generation', async () => {
    const rag = createRAG({
      model: createMockAdapter(),
      minScore: -1,
    });

    await rag.addChunk({
      id: '1',
      source: 'docs',
      title: 'API Docs',
      content: 'The API supports REST and GraphQL',
    });

    const result = await rag.query('How does the API work?');
    expect(result.answer).toBeDefined();
    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it('returns fallback when no chunks match', async () => {
    const rag = createRAG({
      model: createMockAdapter(),
      minScore: 0.99, // Very high threshold
    });

    await rag.addChunk({
      id: '1',
      source: 'docs',
      title: 'Unrelated',
      content: 'Something completely different',
    });

    const result = await rag.query('quantum physics');
    expect(result.answer).toBe('No relevant information found.');
  });

  it('clears all chunks', async () => {
    const rag = createRAG({ model: createMockAdapter() });

    await rag.addChunk({ id: '1', source: 'a', title: 'A', content: 'Alpha' });
    expect(rag.chunks()).toHaveLength(1);

    rag.clear();
    expect(rag.chunks()).toHaveLength(0);
  });

  it('accepts pre-embedded chunks', () => {
    const rag = createRAG({ model: createMockAdapter() });

    rag.addEmbeddedChunk({
      id: 'pre',
      source: 'external',
      title: 'Pre-embedded',
      content: 'Already has vectors',
      embedding: new Array(64).fill(0.1),
    });

    expect(rag.chunks()).toHaveLength(1);
    expect(rag.chunks()[0]?.embedding).toHaveLength(64);
  });
});
