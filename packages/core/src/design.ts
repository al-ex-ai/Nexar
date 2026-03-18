/**
 * Design tokens are the atomic values of a design system.
 * The AI engine respects these when composing UI.
 */
export interface DesignToken {
  /** Token name (e.g., "color.primary", "spacing.md") */
  readonly name: string;

  /** Token value */
  readonly value: string | number;

  /** Token category for organization */
  readonly category: TokenCategory;

  /** Human-readable description for AI context */
  readonly description?: string | undefined;
}

export type TokenCategory =
  | 'color'
  | 'spacing'
  | 'typography'
  | 'border'
  | 'shadow'
  | 'radius'
  | 'breakpoint'
  | 'motion'
  | 'opacity'
  | 'z-index';

/**
 * A complete design system definition.
 * Registered with the engine to enforce brand consistency.
 */
export interface DesignSystem {
  /** Design system name */
  readonly name: string;

  /** Version */
  readonly version: string;

  /** All tokens */
  readonly tokens: readonly DesignToken[];

  /** Available themes */
  readonly themes: readonly ThemeDefinition[];

  /** Default theme ID */
  readonly defaultTheme: string;

  /** Get a token value by name */
  resolveToken(name: string, theme?: string): string | number | undefined;
}

/**
 * A theme is a named set of token overrides.
 */
export interface ThemeDefinition {
  /** Theme identifier */
  readonly id: string;

  /** Human-readable name */
  readonly label: string;

  /** Token overrides for this theme */
  readonly overrides: Readonly<Record<string, string | number>>;
}
