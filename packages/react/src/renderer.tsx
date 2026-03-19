import type { NexarNode, NexarTree, NodeProps, SerializableValue } from '@nexar/core';
import type { NexarAction } from '@nexar/engine';
import { type ComponentType, createElement, type ReactNode } from 'react';

/** Map component type strings to React components */
export type ComponentMap = Readonly<Record<string, ComponentType<NexarComponentProps>>>;

/** Props passed to every Nexar React component */
export interface NexarComponentProps {
  /** The original node props (with $state refs resolved) */
  readonly nodeProps: NodeProps;

  /** The node ID */
  readonly nodeId: string;

  /** Rendered children */
  readonly children?: ReactNode | undefined;

  /** Fire an action (from on: handlers) */
  readonly onAction?: ((action: NexarAction) => void) | undefined;

  /** Update a bound state key (from bind: prop) */
  readonly onStateChange?: ((key: string, value: SerializableValue) => void) | undefined;

  /** The bound state key, if any */
  readonly bindKey?: string | undefined;
}

export interface RendererProps {
  /** The composed tree to render */
  readonly tree: NexarTree;

  /** Map of component types to React components */
  readonly components: ComponentMap;

  /** Current state for resolving expressions */
  readonly state?: Readonly<Record<string, SerializableValue>> | undefined;

  /** Handler for actions triggered by events */
  readonly onAction?: ((action: NexarAction) => void) | undefined;

  /** Handler for state changes from bound inputs */
  readonly onStateChange?: ((key: string, value: SerializableValue) => void) | undefined;

  /** Fallback for unknown component types */
  readonly fallback?: ComponentType<NexarComponentProps> | undefined;
}

/** Renders a NexarTree into React components */
export function NexarRenderer({
  tree,
  components,
  state,
  onAction,
  onStateChange,
  fallback,
}: RendererProps): ReactNode {
  return renderNode(tree.root, components, state ?? {}, onAction, onStateChange, fallback);
}

function renderNode(
  node: NexarNode,
  components: ComponentMap,
  state: Readonly<Record<string, SerializableValue>>,
  onAction: ((action: NexarAction) => void) | undefined,
  onStateChange: ((key: string, value: SerializableValue) => void) | undefined,
  fallback: ComponentType<NexarComponentProps> | undefined,
): ReactNode {
  // Conditional rendering: skip node if `when` evaluates to false
  if (node.when !== undefined) {
    if (!evaluateSimpleCondition(node.when, state)) {
      return null;
    }
  }

  const Component = components[node.type] ?? fallback;
  if (!Component) {
    return null;
  }

  // Resolve $state references in props
  const resolvedProps = resolveNodeProps(node.props, state);

  // Get bind key if present
  const bindKey = typeof node.props.bind === 'string' ? node.props.bind : undefined;

  // If bound to state, inject current value
  if (bindKey) {
    const stateKey = bindKey.startsWith('$') ? bindKey.slice(1) : bindKey;
    resolvedProps.value = state[stateKey] ?? '';
  }

  // Parse action references from `on` handlers
  const actionHandler = node.on ? createActionDispatcher(node.on, onAction) : onAction;

  const children = node.children?.map((child) =>
    renderNode(child, components, state, onAction, onStateChange, fallback),
  );

  return createElement(
    Component,
    {
      key: node.id,
      nodeId: node.id,
      nodeProps: resolvedProps,
      onAction: actionHandler,
      onStateChange,
      bindKey: bindKey ? (bindKey.startsWith('$') ? bindKey.slice(1) : bindKey) : undefined,
    },
    children && children.length > 0 ? children : undefined,
  );
}

function resolveNodeProps(
  props: NodeProps,
  state: Readonly<Record<string, SerializableValue>>,
): Record<string, SerializableValue> {
  const resolved: Record<string, SerializableValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      const stateKey = value.slice(1);
      resolved[key] = state[stateKey] ?? '';
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function evaluateSimpleCondition(
  expr: string,
  state: Readonly<Record<string, SerializableValue>>,
): boolean {
  const trimmed = expr.trim();

  // Negation: "!$loading"
  if (trimmed.startsWith('!')) {
    return !evaluateSimpleCondition(trimmed.slice(1), state);
  }

  // Comparison: "$error != null"
  const ops = ['!=', '=='] as const;
  for (const op of ops) {
    const idx = trimmed.indexOf(op);
    if (idx !== -1) {
      const leftRaw = trimmed.slice(0, idx).trim();
      const rightRaw = trimmed.slice(idx + op.length).trim();
      const left = leftRaw.startsWith('$') ? state[leftRaw.slice(1)] : leftRaw;
      const right =
        rightRaw === 'null'
          ? null
          : rightRaw === 'true'
            ? true
            : rightRaw === 'false'
              ? false
              : rightRaw;
      return op === '==' ? left === right : left !== right;
    }
  }

  // Simple truthy: "$loading"
  if (trimmed.startsWith('$')) {
    const value = state[trimmed.slice(1)];
    return value !== null && value !== undefined && value !== false && value !== '' && value !== 0;
  }

  return true;
}

function createActionDispatcher(
  _handlers: Readonly<Record<string, string>>,
  onAction: ((action: NexarAction) => void) | undefined,
): ((action: NexarAction) => void) | undefined {
  if (!onAction) return undefined;
  return onAction;
}
