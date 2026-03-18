import type { SerializableValue } from '@nexar/core';

export type StateListener = (key: string, value: SerializableValue | undefined) => void;

/**
 * Server-driven state store.
 * The engine controls state, the client renders it.
 * Minimal, observable, framework-agnostic.
 */
export interface StateStore {
  /** Get a value */
  get(key: string): SerializableValue | undefined;

  /** Set a value and notify listeners */
  set(key: string, value: SerializableValue): void;

  /** Delete a value */
  delete(key: string): void;

  /** Subscribe to changes on a specific key */
  subscribe(key: string, listener: StateListener): () => void;

  /** Subscribe to all changes */
  subscribeAll(listener: StateListener): () => void;

  /** Get all state as a snapshot */
  snapshot(): Readonly<Record<string, SerializableValue>>;

  /** Replace all state at once */
  hydrate(state: Readonly<Record<string, SerializableValue>>): void;

  /** Clear all state */
  clear(): void;
}

/** Create an in-memory state store */
export function createStateStore(
  initial?: Readonly<Record<string, SerializableValue>> | undefined,
): StateStore {
  const state = new Map<string, SerializableValue>();
  const keyListeners = new Map<string, Set<StateListener>>();
  const globalListeners = new Set<StateListener>();

  if (initial) {
    for (const [key, value] of Object.entries(initial)) {
      state.set(key, value);
    }
  }

  function notify(key: string, value: SerializableValue | undefined): void {
    const listeners = keyListeners.get(key);
    if (listeners) {
      for (const listener of listeners) {
        listener(key, value);
      }
    }
    for (const listener of globalListeners) {
      listener(key, value);
    }
  }

  return {
    get(key: string): SerializableValue | undefined {
      return state.get(key);
    },

    set(key: string, value: SerializableValue): void {
      state.set(key, value);
      notify(key, value);
    },

    delete(key: string): void {
      state.delete(key);
      notify(key, undefined);
    },

    subscribe(key: string, listener: StateListener): () => void {
      let listeners = keyListeners.get(key);
      if (!listeners) {
        listeners = new Set();
        keyListeners.set(key, listeners);
      }
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          keyListeners.delete(key);
        }
      };
    },

    subscribeAll(listener: StateListener): () => void {
      globalListeners.add(listener);
      return () => {
        globalListeners.delete(listener);
      };
    },

    snapshot(): Readonly<Record<string, SerializableValue>> {
      return Object.fromEntries(state);
    },

    hydrate(newState: Readonly<Record<string, SerializableValue>>): void {
      state.clear();
      for (const [key, value] of Object.entries(newState)) {
        state.set(key, value);
      }
    },

    clear(): void {
      state.clear();
    },
  };
}
