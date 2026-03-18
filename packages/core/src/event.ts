/**
 * Events flow from the client to the engine.
 * The engine decides what happens next -- not the client.
 */
export interface NexarEvent {
  /** Event type (e.g., "click", "submit", "change", "navigate") */
  readonly type: string;

  /** Node ID that emitted the event */
  readonly nodeId: string;

  /** Event payload */
  readonly payload?: Readonly<Record<string, unknown>>;

  /** Timestamp */
  readonly timestamp: number;
}

export type EventHandler = (event: NexarEvent) => void | Promise<void>;

export interface EventBus {
  /** Emit an event */
  emit(event: NexarEvent): void;

  /** Subscribe to events by type */
  on(type: string, handler: EventHandler): () => void;

  /** Subscribe to all events */
  onAny(handler: EventHandler): () => void;
}
