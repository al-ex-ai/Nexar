import type { PlatformTraits } from './platform.js';
import type { Validator } from './validation.js';

/**
 * A registered component that the AI engine can use when composing UI.
 * Components are the building blocks -- the engine picks and arranges them.
 */
export interface NexarComponent {
  /** Unique component type identifier (e.g., "text-input", "data-table") */
  readonly type: string;

  /** Human-readable label for tooling and AI context */
  readonly label: string;

  /** What this component does -- fed to the AI for composition decisions */
  readonly description: string;

  /** Component category for organization */
  readonly category: ComponentCategory;

  /** Accepted props schema (JSON Schema) */
  readonly propsSchema: Readonly<Record<string, unknown>>;

  /** Which platforms support this component */
  readonly platforms: PlatformTraits;

  /** Constraints on where/how this component can be used */
  readonly constraints?: ComponentConstraints | undefined;

  /** Validators that run on the component's output */
  readonly validators?: readonly Validator[] | undefined;
}

export type ComponentCategory =
  | 'input'
  | 'display'
  | 'navigation'
  | 'layout'
  | 'feedback'
  | 'media'
  | 'data'
  | 'action'
  | 'custom';

export interface ComponentConstraints {
  /** Components this can be nested inside */
  readonly allowedParents?: readonly string[] | undefined;

  /** Components that can be nested inside this */
  readonly allowedChildren?: readonly string[] | undefined;

  /** Maximum instances per screen */
  readonly maxInstances?: number | undefined;

  /** Whether this component requires user interaction */
  readonly interactive?: boolean | undefined;

  /** Minimum accessibility requirements */
  readonly a11y?: {
    readonly requiresLabel: boolean;
    readonly requiresRole?: string | undefined;
    readonly minContrastRatio?: number | undefined;
  } | undefined;
}

/**
 * Registry of all available components.
 * The AI engine queries this to know what building blocks are available.
 */
export interface ComponentRegistry {
  /** Register a new component */
  register(component: NexarComponent): void;

  /** Get a component by type */
  get(type: string): NexarComponent | undefined;

  /** List all components */
  all(): readonly NexarComponent[];

  /** List components by category */
  byCategory(category: ComponentCategory): readonly NexarComponent[];

  /** List components available on a platform */
  byPlatform(platform: string): readonly NexarComponent[];

  /** Check if a component type is registered */
  has(type: string): boolean;
}
