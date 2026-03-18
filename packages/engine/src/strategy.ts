import type {
  ComponentRegistry,
  DesignSystem,
  Intent,
  IntentContext,
  NexarTree,
} from '@nexar/core';

/**
 * A composition strategy decides how to turn an intent into a component tree.
 *
 * Strategies are pluggable:
 * - RulesStrategy: deterministic, no AI, maps intents to trees via rules
 * - AIStrategy: uses an LLM to compose the tree dynamically
 * - HybridStrategy: rules first, AI fills gaps
 */
export interface CompositionStrategy {
  /** Strategy name for logging */
  readonly name: string;

  /** Compose a tree from an intent */
  compose(params: CompositionParams): Promise<NexarTree>;
}

export interface CompositionParams {
  /** The intent to resolve */
  readonly intent: Intent;

  /** Runtime context */
  readonly context: IntentContext;

  /** Available components */
  readonly registry: ComponentRegistry;

  /** Active design system */
  readonly designSystem?: DesignSystem | undefined;
}
