import type { EventBus, EventHandler, NexarEvent } from '@nexar/core';

/**
 * Simple event bus for engine-to-renderer communication.
 */
export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<EventHandler>>();
  const anyListeners = new Set<EventHandler>();

  return {
    emit(event: NexarEvent): void {
      const typeListeners = listeners.get(event.type);
      if (typeListeners) {
        for (const handler of typeListeners) {
          handler(event);
        }
      }
      for (const handler of anyListeners) {
        handler(event);
      }
    },

    on(type: string, handler: EventHandler): () => void {
      let typeListeners = listeners.get(type);
      if (!typeListeners) {
        typeListeners = new Set();
        listeners.set(type, typeListeners);
      }
      typeListeners.add(handler);

      return () => {
        typeListeners.delete(handler);
        if (typeListeners.size === 0) {
          listeners.delete(type);
        }
      };
    },

    onAny(handler: EventHandler): () => void {
      anyListeners.add(handler);
      return () => {
        anyListeners.delete(handler);
      };
    },
  };
}
