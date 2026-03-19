/**
 * An intent describes what the user needs to accomplish,
 * not what the screen looks like.
 */
export interface Intent {
  /** Unique intent identifier (e.g., "process-refund", "onboard-user") */
  readonly id: string;

  /** Human-readable label for tooling */
  readonly label: string;

  /** What this intent accomplishes */
  readonly description: string;

  /** Required data fields the intent needs to fulfill */
  readonly requires: readonly string[];

  /** Optional constraints on how the intent is rendered */
  readonly constraints?: IntentConstraints | undefined;

  /** Child intents for multi-step flows */
  readonly steps?: readonly Intent[] | undefined;
}

export interface IntentConstraints {
  /** Maximum number of components in the composed UI */
  readonly maxComponents?: number | undefined;

  /** Required component types (e.g., ["input", "submit"]) */
  readonly requiredTypes?: readonly string[] | undefined;

  /** Forbidden component types */
  readonly forbiddenTypes?: readonly string[] | undefined;

  /** Layout preference */
  readonly layout?: 'single-column' | 'two-column' | 'wizard' | 'auto' | undefined;

  /** Accessibility level */
  readonly accessibilityLevel?: 'AA' | 'AAA' | undefined;
}

/**
 * Runtime context provided when resolving an intent.
 * The AI engine uses this to adapt the composed UI.
 */
export interface IntentContext {
  /** User information */
  readonly user?:
    | {
        readonly id: string;
        readonly role?: string | undefined;
        readonly locale?: string | undefined;
        readonly preferences?: Readonly<Record<string, unknown>> | undefined;
      }
    | undefined;

  /** Device and platform */
  readonly platform: {
    readonly type: 'web' | 'mobile' | 'tablet' | 'tv' | 'terminal';
    readonly os?: string | undefined;
    readonly screenSize?: { readonly width: number; readonly height: number } | undefined;
  };

  /** Business-specific context passed to the AI engine */
  readonly data?: Readonly<Record<string, unknown>> | undefined;

  /** Active A/B test variants */
  readonly experiments?: Readonly<Record<string, string>> | undefined;
}

/**
 * The engine's response after composing UI from an intent.
 */
export interface IntentResponse {
  /** The intent that was resolved */
  readonly intentId: string;

  /** Composed component tree */
  readonly tree: import('./tree.js').NexarTree;

  /** Metadata about the composition */
  readonly meta: {
    /** Time taken to compose (ms) */
    readonly compositionTime: number;

    /** Model used for composition */
    readonly model?: string | undefined;

    /** Confidence score (0-1) */
    readonly confidence: number;

    /** Sources consulted (RAG) */
    readonly sources?: readonly string[] | undefined;
  };
}
