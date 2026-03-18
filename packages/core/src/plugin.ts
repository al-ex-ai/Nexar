import type { NexarComponent } from './component.js';
import type { DesignToken } from './design.js';
import type { Intent } from './intent.js';
import type { Validator } from './validation.js';

/**
 * Plugins extend Nexar with custom components, intents, validators, and tools.
 */
export interface NexarPlugin {
  /** Plugin name (e.g., "my-company") */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  /** Custom components to register */
  readonly components?: readonly NexarComponent[];

  /** Custom intents to register */
  readonly intents?: readonly Intent[];

  /** Custom design tokens */
  readonly tokens?: readonly DesignToken[];

  /** Custom validators */
  readonly validators?: readonly Validator[];

  /** Lifecycle hook: called when plugin is loaded */
  onLoad?(context: PluginContext): void | Promise<void>;

  /** Lifecycle hook: called when plugin is unloaded */
  onUnload?(): void | Promise<void>;
}

export interface PluginContext {
  /** Register additional components at runtime */
  registerComponent(component: NexarComponent): void;

  /** Register additional intents at runtime */
  registerIntent(intent: Intent): void;

  /** Access the event bus */
  readonly events: import('./event.js').EventBus;
}
