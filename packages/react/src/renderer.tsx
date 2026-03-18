import { type ComponentType, type ReactNode, createElement } from 'react';
import type { NexarNode, NexarTree, NodeProps } from '@nexar/core';

/** Map component type strings to React components */
export type ComponentMap = Readonly<Record<string, ComponentType<NexarComponentProps>>>;

/** Props passed to every Nexar React component */
export interface NexarComponentProps {
  /** The original node props */
  readonly nodeProps: NodeProps;

  /** The node ID */
  readonly nodeId: string;

  /** Rendered children */
  readonly children?: ReactNode | undefined;
}

export interface RendererProps {
  /** The composed tree to render */
  readonly tree: NexarTree;

  /** Map of component types to React components */
  readonly components: ComponentMap;

  /** Fallback for unknown component types */
  readonly fallback?: ComponentType<NexarComponentProps> | undefined;
}

/** Renders a NexarTree into React components */
export function NexarRenderer({ tree, components, fallback }: RendererProps): ReactNode {
  return renderNode(tree.root, components, fallback);
}

function renderNode(
  node: NexarNode,
  components: ComponentMap,
  fallback: ComponentType<NexarComponentProps> | undefined,
): ReactNode {
  const Component = components[node.type] ?? fallback;

  if (!Component) {
    return null;
  }

  const children = node.children?.map((child) =>
    renderNode(child, components, fallback),
  );

  return createElement(
    Component,
    {
      key: node.id,
      nodeId: node.id,
      nodeProps: node.props,
    },
    children && children.length > 0 ? children : undefined,
  );
}
