import type { ReactNode } from 'react';
import type { NexarComponentProps, ComponentMap } from '@nexar/react';

const styles = {
  stack: {
    display: 'flex',
    gap: '12px',
  },
  card: {
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '12px',
    padding: '24px',
  },
  text: {
    heading: { fontSize: '24px', fontWeight: 700, color: '#fff' },
    subheading: { fontSize: '18px', fontWeight: 600, color: '#ccc' },
    body: { fontSize: '14px', color: '#aaa', lineHeight: '1.6' },
    label: { fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '1px' },
    error: { fontSize: '12px', color: '#ff6b6b', marginTop: '4px' },
    success: { fontSize: '14px', color: '#4ade80', lineHeight: '1.6' },
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: '#0d0d1a',
    border: '1px solid #2a2a4a',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '14px',
    outline: 'none',
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  button: {
    primary: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      border: 'none',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    secondary: {
      padding: '12px 24px',
      background: 'transparent',
      border: '1px solid #2a2a4a',
      borderRadius: '8px',
      color: '#ccc',
      fontSize: '14px',
      cursor: 'pointer',
    },
    disabled: {
      padding: '12px 24px',
      background: '#333',
      border: 'none',
      borderRadius: '8px',
      color: '#666',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'not-allowed',
    },
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    background: '#1e1e3a',
    border: '1px solid #3a3a6a',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#8b8bff',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #2a2a4a',
    margin: '8px 0',
  },
  image: {
    width: '100%',
    borderRadius: '8px',
    objectFit: 'cover' as const,
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
    marginRight: '8px',
  },
} as const;

function StackComponent({ nodeProps, children }: NexarComponentProps): ReactNode {
  const direction = nodeProps['direction'] === 'horizontal' ? 'row' : 'column';
  const align = nodeProps['align'] as string | undefined;
  const justify = nodeProps['justify'] as string | undefined;
  const wrap = nodeProps['wrap'] ? 'wrap' as const : undefined;
  return (
    <div style={{
      ...styles.stack,
      flexDirection: direction,
      flexWrap: wrap,
      alignItems: align ?? (direction === 'row' ? 'center' : 'stretch'),
      justifyContent: justify ?? 'flex-start',
      gap: `${(nodeProps['gap'] as number | undefined) ?? 12}px`,
    }}>
      {children}
    </div>
  );
}

function CardComponent({ nodeProps, children }: NexarComponentProps): ReactNode {
  return (
    <div style={{
      ...styles.card,
      ...(nodeProps['elevated'] ? { boxShadow: '0 8px 32px rgba(0,0,0,0.3)' } : {}),
    }}>
      {children}
    </div>
  );
}

function TextComponent({ nodeProps }: NexarComponentProps): ReactNode {
  const variant = (nodeProps['variant'] as keyof typeof styles.text) ?? 'body';
  const content = nodeProps['content'] as string;
  if (!content) return null;
  const style = styles.text[variant] ?? styles.text.body;
  const Tag = variant === 'heading' ? 'h1' : variant === 'subheading' ? 'h2' : 'p';
  return <Tag style={style}>{content}</Tag>;
}

function InputComponent({ nodeProps, onStateChange, bindKey }: NexarComponentProps): ReactNode {
  const error = nodeProps['error'] as string | undefined;
  const hasError = error && error !== '';
  return (
    <div>
      {nodeProps['label'] && (
        <label style={{ ...styles.text.label, display: 'block', marginBottom: '6px' }}>
          {nodeProps['label'] as string}
        </label>
      )}
      <input
        type={(nodeProps['inputType'] as string) ?? 'text'}
        placeholder={(nodeProps['placeholder'] as string) ?? ''}
        value={(nodeProps['value'] as string) ?? ''}
        onChange={(e) => {
          if (bindKey && onStateChange) {
            onStateChange(bindKey, e.target.value);
          }
        }}
        disabled={nodeProps['disabled'] === true}
        style={{
          ...styles.input,
          ...(hasError ? styles.inputError : {}),
        }}
      />
      {hasError && <p style={styles.text.error}>{error}</p>}
    </div>
  );
}

function ButtonComponent({ nodeProps, onAction }: NexarComponentProps): ReactNode {
  const variant = (nodeProps['variant'] as 'primary' | 'secondary') ?? 'primary';
  const disabled = nodeProps['disabled'] === true || nodeProps['loading'] === true;
  const loading = nodeProps['loading'] === true;
  const action = nodeProps['action'] as string | undefined;

  return (
    <button
      type="button"
      disabled={disabled}
      style={disabled ? styles.button.disabled : styles.button[variant]}
      onClick={() => {
        if (action && onAction) {
          onAction({ type: 'setState', key: '_clicked', value: action });
        }
      }}
    >
      {loading && <span style={styles.spinner} />}
      {nodeProps['label'] as string}
    </button>
  );
}

function BadgeComponent({ nodeProps }: NexarComponentProps): ReactNode {
  return <span style={styles.badge}>{nodeProps['content'] as string}</span>;
}

function DividerComponent(): ReactNode {
  return <hr style={styles.divider} />;
}

function ImageComponent({ nodeProps }: NexarComponentProps): ReactNode {
  return (
    <img
      src={nodeProps['src'] as string}
      alt={(nodeProps['alt'] as string) ?? ''}
      style={{
        ...styles.image,
        height: `${(nodeProps['height'] as number | undefined) ?? 200}px`,
      }}
    />
  );
}

function AlertComponent({ nodeProps }: NexarComponentProps): ReactNode {
  const variant = (nodeProps['variant'] as 'error' | 'success') ?? 'error';
  const content = nodeProps['content'] as string;
  if (!content) return null;
  const bg = variant === 'error' ? '#2a0a0a' : '#0a2a0a';
  const border = variant === 'error' ? '#5a1a1a' : '#1a5a1a';
  const color = variant === 'error' ? '#ff6b6b' : '#4ade80';
  return (
    <div style={{ padding: '12px 16px', background: bg, border: `1px solid ${border}`, borderRadius: '8px', color, fontSize: '14px' }}>
      {content}
    </div>
  );
}

/** All registered React components mapped to Nexar types */
export const componentMap: ComponentMap = {
  stack: StackComponent,
  card: CardComponent,
  text: TextComponent,
  input: InputComponent,
  button: ButtonComponent,
  badge: BadgeComponent,
  divider: DividerComponent,
  image: ImageComponent,
  alert: AlertComponent,
};
