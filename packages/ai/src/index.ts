export type {
  EmbeddingResult,
  GenerationResult,
  ModelAdapter,
  ModelConfig,
} from './model-adapter.js';
export { createModelAdapter } from './model-adapter.js';
export type { RAGChunk, RAGConfig, RAGEngine, RAGQueryResult } from './rag.js';
export { createRAG } from './rag.js';
export { AIStrategy } from './strategies/ai-strategy.js';
