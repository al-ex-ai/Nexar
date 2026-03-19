import type { SerializableValue } from '@nexar/core';
import type { StateStore } from '@nexar/state';
import type { ApiCallAction, NexarAction, ValidateAction } from './action.js';
import { resolveExpression } from './expression.js';

export interface ActionExecutorConfig {
  readonly state: StateStore;
  readonly onNavigate?: ((intentId: string) => void) | undefined;
  /** Base URL for API calls */
  readonly apiBaseUrl?: string | undefined;
}

/**
 * Executes actions against the state store.
 * This is the runtime that makes trees interactive.
 */
export class ActionExecutor {
  private readonly state: StateStore;
  private readonly onNavigate: ((intentId: string) => void) | undefined;
  private readonly apiBaseUrl: string;

  constructor(config: ActionExecutorConfig) {
    this.state = config.state;
    this.onNavigate = config.onNavigate;
    this.apiBaseUrl = config.apiBaseUrl ?? '';
  }

  async execute(action: NexarAction): Promise<void> {
    switch (action.type) {
      case 'setState':
        this.state.set(action.key, action.value);
        break;

      case 'toggle': {
        const current = this.state.get(action.key);
        this.state.set(action.key, !current);
        break;
      }

      case 'api':
        await this.executeApi(action);
        break;

      case 'navigate':
        this.onNavigate?.(action.intentId);
        break;

      case 'validate':
        await this.executeValidation(action);
        break;

      case 'sequence':
        for (const sub of action.actions) {
          await this.execute(sub);
        }
        break;
    }
  }

  private async executeApi(action: ApiCallAction): Promise<void> {
    if (action.loadingKey) {
      this.state.set(action.loadingKey, true);
    }
    if (action.errorKey) {
      this.state.set(action.errorKey, null);
    }

    try {
      const body = action.body ? this.resolveBody(action.body) : undefined;

      const init: RequestInit = { method: action.method };
      if (body) {
        init.headers = { 'Content-Type': 'application/json' };
        init.body = JSON.stringify(body);
      }
      const res = await fetch(`${this.apiBaseUrl}${action.url}`, init);

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = (await res.json()) as SerializableValue;

      if (action.resultKey) {
        this.state.set(action.resultKey, data);
      }

      if (action.onSuccess) {
        for (const sub of action.onSuccess) {
          await this.execute(sub);
        }
      }
    } catch (err) {
      if (action.errorKey) {
        this.state.set(action.errorKey, err instanceof Error ? err.message : 'Unknown error');
      }
      if (action.onError) {
        for (const sub of action.onError) {
          await this.execute(sub);
        }
      }
    } finally {
      if (action.loadingKey) {
        this.state.set(action.loadingKey, false);
      }
    }
  }

  private async executeValidation(action: ValidateAction): Promise<void> {
    let allValid = true;
    const snapshot = this.state.snapshot();

    for (const rule of action.rules) {
      const value = snapshot[rule.stateKey];
      let valid = true;

      switch (rule.check) {
        case 'required':
          valid = value !== null && value !== undefined && value !== '';
          break;
        case 'email':
          valid = typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          break;
        case 'minLength':
          valid = typeof value === 'string' && value.length >= (rule.value as number);
          break;
        case 'pattern':
          valid = typeof value === 'string' && new RegExp(rule.value as string).test(value);
          break;
      }

      this.state.set(rule.errorKey, valid ? null : rule.errorMessage);
      if (!valid) allValid = false;
    }

    if (allValid && action.onValid) {
      for (const sub of action.onValid) {
        await this.execute(sub);
      }
    }
    if (!allValid && action.onInvalid) {
      for (const sub of action.onInvalid) {
        await this.execute(sub);
      }
    }
  }

  private resolveBody(
    body: Readonly<Record<string, SerializableValue>>,
  ): Record<string, SerializableValue> {
    const snapshot = this.state.snapshot();
    const resolved: Record<string, SerializableValue> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        resolved[key] = resolveExpression(value, snapshot);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
}
