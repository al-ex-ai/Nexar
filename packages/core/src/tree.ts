/**
 * A node in the composed UI tree.
 * Platform-agnostic -- renderers map this to native components.
 */
export interface NexarNode {
  /** Component type from the registry */
  readonly type: string;

  /** Unique node ID for reconciliation */
  readonly id: string;

  /** Props passed to the component */
  readonly props: NodeProps;

  /** Child nodes */
  readonly children?: readonly NexarNode[] | undefined;

  /** Design tokens applied to this node */
  readonly tokens?: Readonly<Record<string, string | number>> | undefined;

  /** Conditional visibility expression */
  readonly when?: string | undefined;

  /** Event handlers bound to this node */
  readonly on?: Readonly<Record<string, string>> | undefined;
}

/** Props are a flat record of serializable values */
export type NodeProps = Readonly<Record<string, SerializableValue>>;

export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | readonly SerializableValue[]
  | { readonly [key: string]: SerializableValue };

/**
 * The complete composed UI tree returned by the engine.
 */
export interface NexarTree {
  /** Schema version for forward compatibility */
  readonly version: '1.0';

  /** Root node */
  readonly root: NexarNode;

  /** Global state bindings */
  readonly state?: Readonly<Record<string, SerializableValue>> | undefined;

  /** Data sources required by this tree */
  readonly dataSources?: readonly DataSource[] | undefined;
}

export interface DataSource {
  /** Unique key to reference this data in the tree */
  readonly key: string;

  /** Source type */
  readonly type: 'api' | 'rag' | 'static' | 'context';

  /** Configuration for the data source */
  readonly config: Readonly<Record<string, unknown>>;
}
