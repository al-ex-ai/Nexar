import { describe, it, expect } from 'vitest';
import type { Intent, IntentContext, NexarComponent } from '@nexar/core';
import { createEngine } from './engine.js';
import { RulesStrategy } from './strategies/rules-strategy.js';

const webPlatform = { web: { supported: true } } as const;

function makeComponent(type: string, category: NexarComponent['category'] = 'display'): NexarComponent {
  return {
    type,
    label: type,
    description: `A ${type} component`,
    category,
    propsSchema: {},
    platforms: webPlatform,
  };
}

const testContext: IntentContext = {
  platform: { type: 'web' },
};

describe('NexarEngine', () => {
  it('composes a tree from a rule-based intent', async () => {
    const strategy = new RulesStrategy();
    strategy.addRule('greet-user', (_intent, context) => ({
      type: 'text',
      id: 'greeting',
      props: {
        content: `Hello${context.user ? `, ${context.user.id}` : ''}!`,
        variant: 'heading',
      },
    }));

    const engine = createEngine({ strategy });
    engine.registry.register(makeComponent('text'));

    const intent: Intent = {
      id: 'greet-user',
      label: 'Greet User',
      description: 'Show a greeting message',
      requires: [],
    };

    const result = await engine.compose(intent, testContext);

    expect(result.response.intentId).toBe('greet-user');
    expect(result.response.tree.version).toBe('1.0');
    expect(result.response.tree.root.type).toBe('text');
    expect(result.response.tree.root.props['content']).toBe('Hello!');
    expect(result.response.meta.confidence).toBe(1.0);
    expect(result.validation?.valid).toBe(true);
  });

  it('adapts based on user context', async () => {
    const strategy = new RulesStrategy();
    strategy.addRule('greet-user', (_intent, context) => ({
      type: 'text',
      id: 'greeting',
      props: {
        content: context.user ? `Welcome back, ${context.user.id}` : 'Welcome, guest',
      },
    }));

    const engine = createEngine({ strategy });
    engine.registry.register(makeComponent('text'));

    const intent: Intent = {
      id: 'greet-user',
      label: 'Greet User',
      description: 'Greet the user',
      requires: [],
    };

    const guestResult = await engine.compose(intent, testContext);
    expect(guestResult.response.tree.root.props['content']).toBe('Welcome, guest');

    const userResult = await engine.compose(intent, {
      ...testContext,
      user: { id: 'alex' },
    });
    expect(userResult.response.tree.root.props['content']).toBe('Welcome back, alex');
  });

  it('rejects trees with unregistered components', async () => {
    const strategy = new RulesStrategy();
    strategy.addRule('broken', () => ({
      type: 'nonexistent-widget',
      id: 'broken-node',
      props: {},
    }));

    const engine = createEngine({ strategy });

    const intent: Intent = {
      id: 'broken',
      label: 'Broken',
      description: 'Uses an unregistered component',
      requires: [],
    };

    await expect(engine.compose(intent, testContext)).rejects.toThrow(
      'Component type "nonexistent-widget" is not registered',
    );
  });

  it('composes nested component trees', async () => {
    const strategy = new RulesStrategy();
    strategy.addRule('login-form', () => ({
      type: 'stack',
      id: 'login-root',
      props: { direction: 'vertical' },
      children: [
        { type: 'text', id: 'title', props: { content: 'Sign In' } },
        { type: 'input', id: 'email', props: { label: 'Email', inputType: 'email' } },
        { type: 'input', id: 'password', props: { label: 'Password', inputType: 'password' } },
        { type: 'button', id: 'submit', props: { label: 'Sign In' } },
      ],
    }));

    const engine = createEngine({ strategy });
    engine.registry.register(makeComponent('stack', 'layout'));
    engine.registry.register(makeComponent('text'));
    engine.registry.register(makeComponent('input', 'input'));
    engine.registry.register(makeComponent('button', 'action'));

    const intent: Intent = {
      id: 'login-form',
      label: 'Login Form',
      description: 'Show a login form',
      requires: ['email', 'password'],
    };

    const result = await engine.compose(intent, testContext);

    expect(result.response.tree.root.children).toHaveLength(4);
    expect(result.response.tree.root.children?.[0]?.type).toBe('text');
    expect(result.response.tree.root.children?.[3]?.type).toBe('button');
    expect(result.validation?.valid).toBe(true);
  });

  it('throws for unknown intent with no rule', async () => {
    const strategy = new RulesStrategy();
    const engine = createEngine({ strategy });

    const intent: Intent = {
      id: 'unknown',
      label: 'Unknown',
      description: 'No rule exists',
      requires: [],
    };

    await expect(engine.compose(intent, testContext)).rejects.toThrow(
      'No rule registered for intent "unknown"',
    );
  });

  it('emits compose event', async () => {
    const strategy = new RulesStrategy();
    strategy.addRule('test', () => ({
      type: 'text',
      id: 'node',
      props: {},
    }));

    const engine = createEngine({ strategy });
    engine.registry.register(makeComponent('text'));

    const events: unknown[] = [];
    engine.events.on('compose', (e) => {
      events.push(e);
    });

    const intent: Intent = {
      id: 'test',
      label: 'Test',
      description: 'Test intent',
      requires: [],
    };

    await engine.compose(intent, testContext);

    expect(events).toHaveLength(1);
  });

  it('loads plugins and registers their components', async () => {
    const strategy = new RulesStrategy();
    strategy.addRule('use-custom', () => ({
      type: 'custom-widget',
      id: 'custom',
      props: {},
    }));

    const engine = createEngine({
      strategy,
      plugins: [
        {
          name: 'test-plugin',
          version: '1.0.0',
          components: [makeComponent('custom-widget', 'custom')],
        },
      ],
    });

    const intent: Intent = {
      id: 'use-custom',
      label: 'Use Custom',
      description: 'Uses a plugin component',
      requires: [],
    };

    const result = await engine.compose(intent, testContext);
    expect(result.response.tree.root.type).toBe('custom-widget');
  });
});
