import type { ComponentRegistry, NexarComponent, NexarTree } from '@nexar/core';
import type { CompositionParams, CompositionStrategy } from '@nexar/engine';
import type { ModelAdapter } from '../model-adapter.js';
import type { RAGEngine } from '../rag.js';

export interface AIStrategyConfig {
  /** Model adapter for generation */
  readonly model: ModelAdapter;

  /** RAG engine for context-aware composition (optional) */
  readonly rag?: RAGEngine | undefined;

  /** Custom system prompt override */
  readonly systemPrompt?: string | undefined;
}

/**
 * AI-powered composition strategy.
 * Uses an LLM to compose UI trees from intents dynamically.
 */
export class AIStrategy implements CompositionStrategy {
  readonly name = 'ai';
  private readonly model: ModelAdapter;
  private readonly rag: RAGEngine | undefined;
  private readonly systemPrompt: string | undefined;

  constructor(config: AIStrategyConfig) {
    this.model = config.model;
    this.rag = config.rag;
    this.systemPrompt = config.systemPrompt;
  }

  async compose(params: CompositionParams): Promise<NexarTree> {
    const { intent, context, registry } = params;

    const componentCatalog = buildComponentCatalog(registry);
    let ragContext = '';

    if (this.rag) {
      const results = await this.rag.retrieve(`${intent.label}: ${intent.description}`);
      if (results.length > 0) {
        ragContext =
          '\n\nRelevant knowledge:\n' +
          results.map((r) => `[${r.chunk.title}]: ${r.chunk.content}`).join('\n---\n');
      }
    }

    const systemPrompt = this.systemPrompt ?? buildSystemPrompt(componentCatalog);

    const userPrompt = buildUserPrompt(intent, context, ragContext);

    const result = await this.model.generate(userPrompt, {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 4096,
    });

    const tree = parseTreeFromResponse(result.text);
    return tree;
  }
}

function buildComponentCatalog(registry: ComponentRegistry): string {
  const components = registry.all();
  if (components.length === 0) {
    return 'No components registered.';
  }

  return components.map((c) => formatComponent(c)).join('\n');
}

function formatComponent(c: NexarComponent): string {
  const props = Object.keys(c.propsSchema).join(', ') || 'none';
  return `- ${c.type} (${c.category}): ${c.description}. Props: ${props}`;
}

function buildSystemPrompt(componentCatalog: string): string {
  return `You are a UI composition engine. Given an intent and context, compose a component tree using ONLY the registered components.

Available components:
${componentCatalog}

Rules:
1. Output ONLY valid JSON — a NexarTree object with version "1.0" and a root node.
2. Every node must have: type (from registered components), id (unique string), props (object).
3. Nodes can have children (array of nodes).
4. Use the context to adapt the UI (platform, user role, locale).
5. Keep trees minimal — only include components needed for the intent.
6. Do not invent component types not in the list above.

Output format:
\`\`\`json
{
  "version": "1.0",
  "root": {
    "type": "component-type",
    "id": "unique-id",
    "props": {},
    "children": []
  }
}
\`\`\``;
}

function buildUserPrompt(
  intent: {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly requires: readonly string[];
  },
  context: {
    readonly platform: { readonly type: string };
    readonly user?: { readonly id: string; readonly role?: string | undefined } | undefined;
  },
  ragContext: string,
): string {
  let prompt = `Compose UI for intent: "${intent.label}"
Description: ${intent.description}
Required data: ${intent.requires.join(', ') || 'none'}
Platform: ${context.platform.type}`;

  if (context.user) {
    prompt += `\nUser: ${context.user.id}${context.user.role ? ` (${context.user.role})` : ''}`;
  }

  if (ragContext) {
    prompt += ragContext;
  }

  return prompt;
}

function parseTreeFromResponse(text: string): NexarTree {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;

  try {
    const parsed = JSON.parse(jsonStr?.trim() ?? '') as NexarTree;

    if (parsed.version !== '1.0' || !parsed.root) {
      throw new AICompositionError('Invalid tree structure: missing version or root');
    }

    return parsed;
  } catch (error) {
    if (error instanceof AICompositionError) throw error;
    throw new AICompositionError(
      `Failed to parse AI response as NexarTree: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

export class AICompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AICompositionError';
  }
}
