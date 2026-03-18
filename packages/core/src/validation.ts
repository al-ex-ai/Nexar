/**
 * Validators check composed UI trees before they reach the renderer.
 */
export interface Validator {
  /** Validator name */
  readonly name: string;

  /** What this validator checks */
  readonly description: string;

  /** Run validation */
  validate(input: unknown): ValidationResult;
}

export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;

  /** Errors (validation failed) */
  readonly errors?: readonly ValidationError[];

  /** Warnings (non-blocking) */
  readonly warnings?: readonly ValidationWarning[];
}

export interface ValidationError {
  /** Error code */
  readonly code: string;

  /** Human-readable message */
  readonly message: string;

  /** Path to the invalid node (e.g., "root.children[2].props.label") */
  readonly path?: string;
}

export interface ValidationWarning {
  /** Warning code */
  readonly code: string;

  /** Human-readable message */
  readonly message: string;

  /** Path to the node */
  readonly path?: string;
}
