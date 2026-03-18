import type { Intent, IntentContext, NexarNode, NexarTree } from '@nexar/core';
import type { CompositionParams, CompositionStrategy } from '../strategy.js';

type IntentRule = (
  intent: Intent,
  context: IntentContext,
) => NexarNode | undefined;

/**
 * Deterministic composition: maps intents to trees via registered rules.
 * No AI, no network calls, fully predictable output.
 */
export class RulesStrategy implements CompositionStrategy {
  readonly name = 'rules';
  private readonly rules = new Map<string, IntentRule>();

  /** Register a rule for an intent ID */
  addRule(intentId: string, rule: IntentRule): void {
    this.rules.set(intentId, rule);
  }

  async compose(params: CompositionParams): Promise<NexarTree> {
    const { intent, context, registry } = params;
    const rule = this.rules.get(intent.id);

    if (!rule) {
      throw new NexarCompositionError(
        `No rule registered for intent "${intent.id}"`,
      );
    }

    const root = rule(intent, context);
    if (!root) {
      throw new NexarCompositionError(
        `Rule for intent "${intent.id}" returned no result`,
      );
    }

    validateComponentTypes(root, registry);

    return {
      version: '1.0',
      root,
    };
  }
}

/** Ensure every node in the tree uses a registered component type */
function validateComponentTypes(
  node: NexarNode,
  registry: { has(type: string): boolean },
): void {
  if (!registry.has(node.type)) {
    throw new NexarCompositionError(
      `Component type "${node.type}" is not registered`,
    );
  }
  if (node.children) {
    for (const child of node.children) {
      validateComponentTypes(child, registry);
    }
  }
}

export class NexarCompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NexarCompositionError';
  }
}
