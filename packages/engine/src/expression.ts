import type { SerializableValue } from '@nexar/core';

/**
 * Resolves expressions like "$form.email", "$loading", "$count + 1"
 * against a state store.
 */
export function resolveExpression(
  expr: string,
  state: ReadonlyMap<string, SerializableValue> | Readonly<Record<string, SerializableValue>>,
): SerializableValue {
  const get = (key: string): SerializableValue | undefined => {
    if (state instanceof Map) return state.get(key);
    return (state as Record<string, SerializableValue>)[key];
  };

  // Direct state reference: "$form.email"
  if (expr.startsWith('$')) {
    const key = expr.slice(1);
    return get(key) ?? '';
  }

  return expr;
}

/**
 * Evaluates a condition expression against state.
 * Supports: "$loading", "$loading == true", "$count > 0", "$error != null"
 */
export function evaluateCondition(
  expr: string,
  state: ReadonlyMap<string, SerializableValue> | Readonly<Record<string, SerializableValue>>,
): boolean {
  const trimmed = expr.trim();

  // Check for comparison operators
  const operators = ['==', '!=', '>=', '<=', '>', '<'] as const;
  for (const op of operators) {
    const idx = trimmed.indexOf(op);
    if (idx !== -1) {
      const left = resolveExpression(trimmed.slice(0, idx).trim(), state);
      const rightRaw = trimmed.slice(idx + op.length).trim();
      const right = parseValue(rightRaw, state);
      return compare(left, op, right);
    }
  }

  // Single value: truthy check
  const value = resolveExpression(trimmed, state);
  return isTruthy(value);
}

/**
 * Resolves all "$xxx" references in a props object.
 */
export function resolveProps(
  props: Readonly<Record<string, SerializableValue>>,
  state: Readonly<Record<string, SerializableValue>>,
): Record<string, SerializableValue> {
  const resolved: Record<string, SerializableValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      resolved[key] = resolveExpression(value, state);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function parseValue(
  raw: string,
  state: ReadonlyMap<string, SerializableValue> | Readonly<Record<string, SerializableValue>>,
): SerializableValue {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
  const num = Number(raw);
  if (!Number.isNaN(num)) return num;
  if (raw.startsWith('$')) return resolveExpression(raw, state);
  return raw;
}

function compare(left: SerializableValue, op: string, right: SerializableValue): boolean {
  switch (op) {
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    case '>':
      return (left as number) > (right as number);
    case '<':
      return (left as number) < (right as number);
    case '>=':
      return (left as number) >= (right as number);
    case '<=':
      return (left as number) <= (right as number);
    default:
      return false;
  }
}

function isTruthy(value: SerializableValue): boolean {
  if (value === null || value === undefined) return false;
  if (value === false) return false;
  if (value === 0) return false;
  if (value === '') return false;
  return true;
}
