import type { SerializableValue } from '@nexar/core';

/**
 * An action defines what happens in response to an event.
 * Actions are declarative -- the engine executes them.
 */
export type NexarAction =
  | SetStateAction
  | ToggleAction
  | ApiCallAction
  | NavigateAction
  | ValidateAction
  | SequenceAction;

export interface SetStateAction {
  readonly type: 'setState';
  readonly key: string;
  readonly value: SerializableValue;
}

export interface ToggleAction {
  readonly type: 'toggle';
  readonly key: string;
}

export interface ApiCallAction {
  readonly type: 'api';
  readonly url: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: Readonly<Record<string, SerializableValue>> | undefined;
  /** State key to store the response */
  readonly resultKey?: string | undefined;
  /** State key to store loading state */
  readonly loadingKey?: string | undefined;
  /** State key to store error */
  readonly errorKey?: string | undefined;
  /** Actions to run on success */
  readonly onSuccess?: readonly NexarAction[] | undefined;
  /** Actions to run on failure */
  readonly onError?: readonly NexarAction[] | undefined;
}

export interface NavigateAction {
  readonly type: 'navigate';
  readonly intentId: string;
}

export interface ValidateAction {
  readonly type: 'validate';
  readonly rules: readonly ValidationRule[];
  /** Actions to run if validation passes */
  readonly onValid?: readonly NexarAction[] | undefined;
  /** Actions to run if validation fails */
  readonly onInvalid?: readonly NexarAction[] | undefined;
}

export interface ValidationRule {
  readonly stateKey: string;
  readonly check: 'required' | 'email' | 'minLength' | 'pattern';
  readonly value?: string | number | undefined;
  readonly errorKey: string;
  readonly errorMessage: string;
}

export interface SequenceAction {
  readonly type: 'sequence';
  readonly actions: readonly NexarAction[];
}

export type ActionHandler = (action: NexarAction) => void | Promise<void>;
