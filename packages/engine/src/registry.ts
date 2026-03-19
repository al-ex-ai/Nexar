import type { ComponentCategory, ComponentRegistry, NexarComponent } from '@nexar/core';

/**
 * In-memory component registry.
 * Components register here so the engine knows what building blocks exist.
 */
export function createComponentRegistry(): ComponentRegistry {
  const components = new Map<string, NexarComponent>();

  return {
    register(component: NexarComponent): void {
      if (components.has(component.type)) {
        throw new NexarRegistryError(`Component "${component.type}" is already registered`);
      }
      components.set(component.type, component);
    },

    get(type: string): NexarComponent | undefined {
      return components.get(type);
    },

    all(): readonly NexarComponent[] {
      return [...components.values()];
    },

    byCategory(category: ComponentCategory): readonly NexarComponent[] {
      return [...components.values()].filter((c) => c.category === category);
    },

    byPlatform(platform: string): readonly NexarComponent[] {
      return [...components.values()].filter((c) => {
        const traits = c.platforms[platform as keyof typeof c.platforms];
        return traits?.supported === true;
      });
    },

    has(type: string): boolean {
      return components.has(type);
    },
  };
}

export class NexarRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NexarRegistryError';
  }
}
