import { createContext, useContext, type ReactNode } from 'react';
import type { NexarEngine } from '@nexar/engine';
import type { ComponentMap } from './renderer.js';

interface NexarContextValue {
  readonly engine: NexarEngine;
  readonly components: ComponentMap;
}

const NexarContext = createContext<NexarContextValue | null>(null);

export interface NexarProviderProps {
  /** The Nexar engine instance */
  readonly engine: NexarEngine;

  /** Map of component types to React components */
  readonly components: ComponentMap;

  /** Children */
  readonly children: ReactNode;
}

/** Provides the Nexar engine and component map to the tree */
export function NexarProvider({ engine, components, children }: NexarProviderProps): ReactNode {
  return (
    <NexarContext value={{ engine, components }}>
      {children}
    </NexarContext>
  );
}

/** Access the Nexar engine and component map from context */
export function useNexar(): NexarContextValue {
  const ctx = useContext(NexarContext);
  if (!ctx) {
    throw new Error('useNexar must be used within a <NexarProvider>');
  }
  return ctx;
}
