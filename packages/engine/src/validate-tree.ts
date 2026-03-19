import type {
  ComponentRegistry,
  NexarNode,
  NexarTree,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '@nexar/core';

/**
 * Validates a composed tree against the component registry and design system.
 * Catches issues before the tree reaches the renderer.
 */
export function validateTree(tree: NexarTree, registry: ComponentRegistry): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (tree.version !== '1.0') {
    errors.push({
      code: 'INVALID_VERSION',
      message: `Unsupported tree version "${tree.version}", expected "1.0"`,
    });
  }

  validateNode(tree.root, registry, 'root', errors, warnings);

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function validateNode(
  node: NexarNode,
  registry: ComponentRegistry,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  if (!node.id) {
    errors.push({
      code: 'MISSING_ID',
      message: 'Node is missing an id',
      path,
    });
  }

  if (!node.type) {
    errors.push({
      code: 'MISSING_TYPE',
      message: 'Node is missing a type',
      path,
    });
    return;
  }

  const component = registry.get(node.type);
  if (!component) {
    errors.push({
      code: 'UNKNOWN_COMPONENT',
      message: `Component type "${node.type}" is not registered`,
      path,
    });
    return;
  }

  if (component.constraints?.maxInstances !== undefined) {
    warnings.push({
      code: 'CHECK_MAX_INSTANCES',
      message: `Component "${node.type}" has a max instances constraint of ${component.constraints.maxInstances}`,
      path,
    });
  }

  if (
    component.constraints?.a11y?.requiresLabel &&
    !node.props.label &&
    !node.props['aria-label']
  ) {
    errors.push({
      code: 'MISSING_A11Y_LABEL',
      message: `Component "${node.type}" requires a label for accessibility`,
      path,
    });
  }

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child) {
        validateNode(child, registry, `${path}.children[${i}]`, errors, warnings);
      }
    }
  }
}
