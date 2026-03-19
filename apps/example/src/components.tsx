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
} as const;

function StackComponent({ nodeProps, children }: NexarComponentProps): ReactNode {
  const direction = nodeProps['direction'] === 'horizontal' ? 'row' : 'column';
  const align = nodeProps['align'] as string | undefined;
  const justify = nodeProps['justify'] as string | undefined;
  return (
    <div style={{
      ...styles.stack,
      flexDirection: direction,
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
  const style = styles.text[variant] ?? styles.text.body;
  const Tag = variant === 'heading' ? 'h1' : variant === 'subheading' ? 'h2' : 'p';
  return <Tag style={style}>{nodeProps['content'] as string}</Tag>;
}

function InputComponent({ nodeProps }: NexarComponentProps): ReactNode {
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
        style={styles.input}
      />
    </div>
  );
}

function ButtonComponent({ nodeProps }: NexarComponentProps): ReactNode {
  const variant = (nodeProps['variant'] as 'primary' | 'secondary') ?? 'primary';
  return (
    <button
      type="button"
      style={styles.button[variant]}
    >
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
};
