import { describe, expect, it, vi } from 'vitest';
import { createStateStore } from './store.js';

describe('StateStore', () => {
  it('gets and sets values', () => {
    const store = createStateStore();

    store.set('name', 'Alex');
    expect(store.get('name')).toBe('Alex');
  });

  it('initializes with state', () => {
    const store = createStateStore({ count: 0, active: true });

    expect(store.get('count')).toBe(0);
    expect(store.get('active')).toBe(true);
  });

  it('returns undefined for missing keys', () => {
    const store = createStateStore();
    expect(store.get('nonexistent')).toBeUndefined();
  });

  it('deletes values', () => {
    const store = createStateStore({ name: 'Alex' });

    store.delete('name');
    expect(store.get('name')).toBeUndefined();
  });

  it('notifies key listeners on set', () => {
    const store = createStateStore();
    const listener = vi.fn();

    store.subscribe('name', listener);
    store.set('name', 'Alex');

    expect(listener).toHaveBeenCalledWith('name', 'Alex');
  });

  it('notifies key listeners on delete', () => {
    const store = createStateStore({ name: 'Alex' });
    const listener = vi.fn();

    store.subscribe('name', listener);
    store.delete('name');

    expect(listener).toHaveBeenCalledWith('name', undefined);
  });

  it('notifies global listeners', () => {
    const store = createStateStore();
    const listener = vi.fn();

    store.subscribeAll(listener);
    store.set('a', 1);
    store.set('b', 2);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith('a', 1);
    expect(listener).toHaveBeenCalledWith('b', 2);
  });

  it('unsubscribes correctly', () => {
    const store = createStateStore();
    const listener = vi.fn();

    const unsub = store.subscribe('name', listener);
    store.set('name', 'Alex');
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.set('name', 'Bob');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('takes a snapshot', () => {
    const store = createStateStore({ a: 1, b: 'two' });

    const snap = store.snapshot();
    expect(snap).toEqual({ a: 1, b: 'two' });
  });

  it('hydrates state', () => {
    const store = createStateStore({ old: 'data' });

    store.hydrate({ new: 'state', count: 42 });

    expect(store.get('old')).toBeUndefined();
    expect(store.get('new')).toBe('state');
    expect(store.get('count')).toBe(42);
  });

  it('clears all state', () => {
    const store = createStateStore({ a: 1, b: 2 });

    store.clear();

    expect(store.get('a')).toBeUndefined();
    expect(store.snapshot()).toEqual({});
  });
});
