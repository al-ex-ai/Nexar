import type {
  ComponentRegistry,
  DesignSystem,
  EventBus,
  Intent,
  IntentContext,
  IntentResponse,
  NexarPlugin,
  NexarTree,
  ValidationResult,
} from '@nexar/core';
import { createEventBus } from './event-bus.js';
import { createComponentRegistry } from './registry.js';
import type { CompositionStrategy } from './strategy.js';
import { validateTree } from './validate-tree.js';

export interface EngineConfig {
  /** Composition strategy (rules, AI, or hybrid) */
  readonly strategy: CompositionStrategy;

  /** Design system to enforce */
  readonly designSystem?: DesignSystem | undefined;

  /** Plugins to load */
  readonly plugins?: readonly NexarPlugin[] | undefined;
}

export interface ComposeOptions {
  /** Skip tree validation (not recommended) */
  readonly skipValidation?: boolean | undefined;
}

export interface ComposeResult {
  /** The composed response */
  readonly response: IntentResponse;

  /** Validation result (if validation was run) */
  readonly validation?: ValidationResult | undefined;
}

/**
 * The Nexar engine. Takes intents, composes UI trees.
 */
export class NexarEngine {
  private readonly strategy: CompositionStrategy;
  private readonly designSystem: DesignSystem | undefined;
  readonly registry: ComponentRegistry;
  readonly events: EventBus;

  constructor(config: EngineConfig) {
    this.strategy = config.strategy;
    this.designSystem = config.designSystem;
    this.registry = createComponentRegistry();
    this.events = createEventBus();

    if (config.plugins) {
      for (const plugin of config.plugins) {
        this.loadPlugin(plugin);
      }
    }
  }

  /** Compose a UI tree from an intent */
  async compose(
    intent: Intent,
    context: IntentContext,
    options?: ComposeOptions | undefined,
  ): Promise<ComposeResult> {
    const start = Date.now();

    const tree = await this.strategy.compose({
      intent,
      context,
      registry: this.registry,
      designSystem: this.designSystem,
    });

    const compositionTime = Date.now() - start;

    let validation: ValidationResult | undefined;
    if (options?.skipValidation !== true) {
      validation = this.validate(tree);
      if (!validation.valid) {
        throw new NexarEngineError(
          `Composition produced invalid tree: ${validation.errors?.map((e) => e.message).join(', ')}`,
        );
      }
    }

    const response: IntentResponse = {
      intentId: intent.id,
      tree,
      meta: {
        compositionTime,
        model: this.strategy.name,
        confidence: 1.0,
      },
    };

    this.events.emit({
      type: 'compose',
      nodeId: 'engine',
      payload: { intentId: intent.id, compositionTime },
      timestamp: Date.now(),
    });

    return { response, validation };
  }

  /** Validate a tree against the registry */
  validate(tree: NexarTree): ValidationResult {
    return validateTree(tree, this.registry);
  }

  /** Load a plugin */
  private loadPlugin(plugin: NexarPlugin): void {
    if (plugin.components) {
      for (const component of plugin.components) {
        this.registry.register(component);
      }
    }

    if (plugin.onLoad) {
      plugin.onLoad({
        registerComponent: (c) => this.registry.register(c),
        registerIntent: () => {
          // Intent registration will be handled by the intent store
        },
        events: this.events,
      });
    }
  }
}

/** Convenience factory */
export function createEngine(config: EngineConfig): NexarEngine {
  return new NexarEngine(config);
}

export class NexarEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NexarEngineError';
  }
}
