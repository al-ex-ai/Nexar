import { useState, useCallback } from 'react';
import type { Intent, IntentContext, NexarTree } from '@nexar/core';
import { useNexar } from './provider.js';

export interface UseIntentResult {
  /** The composed tree (null before first compose) */
  readonly tree: NexarTree | null;

  /** Whether composition is in progress */
  readonly loading: boolean;

  /** Error from last composition attempt */
  readonly error: Error | null;

  /** Trigger composition */
  readonly compose: (intent: Intent, context: IntentContext) => Promise<void>;
}

/** Hook to compose intents into trees using the Nexar engine */
export function useIntent(): UseIntentResult {
  const { engine } = useNexar();
  const [tree, setTree] = useState<NexarTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compose = useCallback(
    async (intent: Intent, context: IntentContext): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const result = await engine.compose(intent, context);
        setTree(result.response.tree);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    },
    [engine],
  );

  return { tree, loading, error, compose };
}
