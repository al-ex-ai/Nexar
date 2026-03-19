import type { Intent, IntentContext, NexarTree, SerializableValue } from '@nexar/core';
import type { NexarAction } from '@nexar/engine';
import { ActionExecutor } from '@nexar/engine';
import { NexarRenderer } from '@nexar/react';
import { createStateStore } from '@nexar/state';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { componentMap } from './components.js';
import { intents, setupEngine } from './setup.js';

const engine = setupEngine();
const stateStore = createStateStore();

const context: IntentContext = {
  platform: { type: 'web' },
  user: { id: 'Alex Husniddinov', role: 'Principal Engineer' },
};

export function App(): ReactNode {
  const [activeIntent, setActiveIntent] = useState<string>('dashboard');
  const [tree, setTree] = useState<NexarTree | null>(null);
  const [compositionTime, setCompositionTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [stateSnapshot, setStateSnapshot] = useState<Readonly<Record<string, SerializableValue>>>(
    {},
  );

  const executor = new ActionExecutor({
    state: stateStore,
    onNavigate: (intentId: string) => setActiveIntent(intentId),
  });

  // Subscribe to state changes
  useEffect(() => {
    const unsub = stateStore.subscribeAll(() => {
      setStateSnapshot({ ...stateStore.snapshot() });
    });
    return unsub;
  }, []);

  // Compose tree when intent changes
  useEffect(() => {
    const intent = intents.find((i) => i.id === activeIntent);
    if (!intent) return;

    // Reset state for new intent
    stateStore.clear();
    setStateSnapshot({});
    setError(null);

    engine
      .compose(intent as Intent, context)
      .then((result) => {
        setTree(result.response.tree);
        setCompositionTime(result.response.meta.compositionTime);

        // Hydrate initial state from tree
        if (result.response.tree.state) {
          stateStore.hydrate(result.response.tree.state as Record<string, SerializableValue>);
          setStateSnapshot({ ...stateStore.snapshot() });
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
      });
  }, [activeIntent]);

  const handleAction = useCallback(
    (action: NexarAction) => {
      executor.execute(action);
    },
    [executor],
  );

  const handleStateChange = useCallback((key: string, value: SerializableValue) => {
    stateStore.set(key, value);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* CSS for spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Sidebar */}
      <div
        style={{
          width: '280px',
          background: '#0d0d1a',
          borderRight: '1px solid #1a1a2e',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>
            <span style={{ color: '#6366f1' }}>{'>'}</span> Nexar
          </h1>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Intent-Driven UI Framework
          </p>
        </div>

        <p
          style={{
            fontSize: '11px',
            color: '#555',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px',
          }}
        >
          Intents
        </p>

        {intents.map((intent) => (
          <button
            key={intent.id}
            type="button"
            onClick={() => setActiveIntent(intent.id)}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 14px',
              background: activeIntent === intent.id ? '#1a1a3a' : 'transparent',
              border: activeIntent === intent.id ? '1px solid #2a2a5a' : '1px solid transparent',
              borderRadius: '8px',
              color: activeIntent === intent.id ? '#8b8bff' : '#888',
              fontSize: '14px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 600 }}>{intent.label}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
              {intent.description}
            </div>
          </button>
        ))}

        {/* State inspector */}
        {Object.keys(stateSnapshot).length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <p
              style={{
                fontSize: '11px',
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
              }}
            >
              Live State
            </p>
            <div
              style={{
                background: '#0a0a15',
                border: '1px solid #1a1a2e',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#6366f1',
                maxHeight: '200px',
                overflow: 'auto',
              }}
            >
              {Object.entries(stateSnapshot).map(([key, val]) => (
                <div key={key} style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#888' }}>{key}:</span>{' '}
                  <span style={{ color: val ? '#4ade80' : '#ff6b6b' }}>
                    {val === null ? 'null' : val === '' ? '""' : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 'auto', padding: '16px 0', borderTop: '1px solid #1a1a2e' }}>
          <p style={{ fontSize: '11px', color: '#444' }}>
            {engine.registry.all().length} components registered
          </p>
          <p style={{ fontSize: '11px', color: '#444' }}>{intents.length} intents defined</p>
          {compositionTime > 0 && (
            <p style={{ fontSize: '11px', color: '#6366f1' }}>Composed in {compositionTime}ms</p>
          )}
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '640px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Active Intent
            </span>
            <h2 style={{ fontSize: '16px', color: '#fff', margin: '2px 0 0' }}>
              {intents.find((i) => i.id === activeIntent)?.label}
            </h2>
          </div>
          <div
            style={{
              padding: '4px 12px',
              background: '#1a1a2e',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#6366f1',
            }}
          >
            id: &quot;{activeIntent}&quot;
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '640px' }}>
          {error && (
            <div
              style={{
                padding: '16px',
                background: '#2a0a0a',
                border: '1px solid #5a1a1a',
                borderRadius: '8px',
                color: '#ff6b6b',
              }}
            >
              {error}
            </div>
          )}
          {tree && !error && (
            <NexarRenderer
              tree={tree}
              components={componentMap}
              state={stateSnapshot}
              onAction={handleAction}
              onStateChange={handleStateChange}
            />
          )}
        </div>

        {tree && (
          <details style={{ width: '100%', maxWidth: '640px' }}>
            <summary
              style={{ fontSize: '12px', color: '#555', cursor: 'pointer', padding: '8px 0' }}
            >
              View NexarTree JSON
            </summary>
            <pre
              style={{
                background: '#0d0d1a',
                border: '1px solid #1a1a2e',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '11px',
                color: '#888',
                overflow: 'auto',
                maxHeight: '400px',
              }}
            >
              {JSON.stringify(tree, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
