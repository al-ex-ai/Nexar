import type { ComponentMap, NexarComponentProps } from '@nexar/react';
import type { ReactNode } from 'react';

const colors = {
  bg: '#0f1117',
  card: '#1a1d28',
  cardBorder: '#2a2d3a',
  primary: '#355EBE',
  primaryHover: '#4a73d4',
  accent: '#D52B1D',
  text: '#e0e0e0',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
  success: '#34d399',
  successBg: '#0a2a1a',
  successBorder: '#1a5a3a',
  warning: '#fbbf24',
  warningBg: '#2a2000',
  warningBorder: '#5a4a00',
  error: '#ef4444',
  errorBg: '#2a0a0a',
  errorBorder: '#5a1a1a',
  tipBg: '#111827',
  tipBorder: '#1e3a5f',
  savingsBg: '#0a2a1a',
  savingsBorder: '#1a5a3a',
  inputBg: '#0d0d1a',
} as const;

// --- Layout Components ---

function WizardComponent({ nodeProps, children }: NexarComponentProps): ReactNode {
  const currentStep = Number(nodeProps.currentStep) || 0;
  const totalSteps = Number(nodeProps.totalSteps) || 1;

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepKey = `step-indicator-${String(i)}`;
          return (
            <div
              key={stepKey}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: i <= currentStep ? colors.primary : colors.cardBorder,
                transition: 'background 0.3s',
              }}
            />
          );
        })}
      </div>
      {children}
    </div>
  );
}

function StepComponent({ nodeProps, children }: NexarComponentProps): ReactNode {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: '12px',
        padding: '32px',
      }}
    >
      {nodeProps.title && (
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
          {nodeProps.title as string}
        </h2>
      )}
      {nodeProps.subtitle && (
        <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '24px' }}>
          {nodeProps.subtitle as string}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>{children}</div>
    </div>
  );
}

function StackComponent({ nodeProps, children }: NexarComponentProps): ReactNode {
  const direction = nodeProps.direction === 'horizontal' ? 'row' : 'column';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        flexWrap: nodeProps.wrap ? 'wrap' : undefined,
        gap: `${Number(nodeProps.gap) || 12}px`,
        alignItems: (nodeProps.align as string) ?? (direction === 'row' ? 'center' : 'stretch'),
        justifyContent: (nodeProps.justify as string) ?? 'flex-start',
      }}
    >
      {children}
    </div>
  );
}

// --- Form Components ---

function TextComponent({ nodeProps }: NexarComponentProps): ReactNode {
  const variant = (nodeProps.variant as string) ?? 'body';
  const content = nodeProps.content as string;
  if (!content) return null;

  const styleMap: Record<string, React.CSSProperties> = {
    heading: { fontSize: '24px', fontWeight: 700, color: '#fff' },
    subheading: { fontSize: '18px', fontWeight: 600, color: '#ccc' },
    body: { fontSize: '14px', color: colors.textMuted, lineHeight: '1.6' },
    label: {
      fontSize: '12px',
      fontWeight: 600,
      color: colors.textDim,
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    value: { fontSize: '20px', fontWeight: 700, color: '#fff' },
    currency: { fontSize: '28px', fontWeight: 700, color: colors.success },
    'currency-negative': { fontSize: '28px', fontWeight: 700, color: colors.error },
  };

  return <p style={styleMap[variant] ?? styleMap.body}>{content}</p>;
}

function InputComponent({
  nodeProps,
  nodeId,
  onStateChange,
  bindKey,
}: NexarComponentProps): ReactNode {
  const error = nodeProps.error as string | undefined;
  const hasError = error && error !== '' && error !== 'null';
  const prefix = nodeProps.prefix as string | undefined;

  return (
    <div style={{ flex: nodeProps.flex ? 1 : undefined }}>
      {nodeProps.label && (
        <label
          htmlFor={nodeId}
          style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: colors.textMuted,
          }}
        >
          {nodeProps.label as string}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {prefix && (
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textDim,
              fontSize: '14px',
            }}
          >
            {prefix}
          </span>
        )}
        <input
          id={nodeId}
          type={(nodeProps.inputType as string) ?? 'text'}
          placeholder={(nodeProps.placeholder as string) ?? ''}
          value={(nodeProps.value as string) ?? ''}
          onChange={(e) => {
            if (bindKey && onStateChange) onStateChange(bindKey, e.target.value);
          }}
          disabled={nodeProps.disabled === true}
          style={{
            width: '100%',
            padding: prefix ? '12px 16px 12px 28px' : '12px 16px',
            background: colors.inputBg,
            border: `1px solid ${hasError ? colors.error : colors.cardBorder}`,
            borderRadius: '8px',
            color: colors.text,
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>
      {hasError && (
        <p style={{ fontSize: '12px', color: colors.error, marginTop: '4px' }}>{error}</p>
      )}
      {nodeProps.helperText && !hasError && (
        <p style={{ fontSize: '12px', color: colors.textDim, marginTop: '4px' }}>
          {nodeProps.helperText as string}
        </p>
      )}
    </div>
  );
}

function ChoiceComponent({ nodeProps, onStateChange, bindKey }: NexarComponentProps): ReactNode {
  const options = nodeProps.options as
    | readonly { readonly value: string; readonly label: string }[]
    | undefined;
  const selected = (nodeProps.value as string) ?? '';

  return (
    <div>
      {nodeProps.label && (
        <div
          style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: colors.textMuted,
          }}
        >
          {nodeProps.label as string}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options?.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (bindKey && onStateChange) onStateChange(bindKey, opt.value);
            }}
            style={{
              padding: '12px 16px',
              background: selected === opt.value ? `${colors.primary}22` : 'transparent',
              border: `1px solid ${selected === opt.value ? colors.primary : colors.cardBorder}`,
              borderRadius: '8px',
              color: selected === opt.value ? colors.primary : colors.text,
              fontSize: '14px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckboxComponent({ nodeProps, onStateChange, bindKey }: NexarComponentProps): ReactNode {
  const checked = nodeProps.value === true || nodeProps.value === 'true';

  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        color: colors.text,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          if (bindKey && onStateChange) onStateChange(bindKey, e.target.checked);
        }}
        style={{ width: '18px', height: '18px', accentColor: colors.primary }}
      />
      {nodeProps.label as string}
    </label>
  );
}

// --- Display Components ---

function ButtonComponent({ nodeProps, onAction }: NexarComponentProps): ReactNode {
  const variant = (nodeProps.variant as string) ?? 'primary';
  const disabled = nodeProps.disabled === true;
  const action = nodeProps.action as string | undefined;

  const styleMap: Record<string, React.CSSProperties> = {
    primary: {
      padding: '12px 24px',
      background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryHover})`,
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
      border: `1px solid ${colors.cardBorder}`,
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
  };

  return (
    <button
      type="button"
      disabled={disabled}
      style={disabled ? styleMap.disabled : (styleMap[variant] ?? styleMap.primary)}
      onClick={() => {
        if (action && onAction) onAction({ type: 'setState', key: '_action', value: action });
      }}
    >
      {nodeProps.label as string}
    </button>
  );
}

function InsightComponent({ nodeProps }: NexarComponentProps): ReactNode {
  const type = (nodeProps.insightType as string) ?? 'tip';
  const headline = nodeProps.headline as string;
  const detail = nodeProps.detail as string;
  if (!headline) return null;

  const styleMap: Record<string, { bg: string; border: string; color: string; icon: string }> = {
    tip: { bg: colors.tipBg, border: colors.tipBorder, color: '#60a5fa', icon: '💡' },
    warning: {
      bg: colors.warningBg,
      border: colors.warningBorder,
      color: colors.warning,
      icon: '⚠️',
    },
    savings: {
      bg: colors.savingsBg,
      border: colors.savingsBorder,
      color: colors.success,
      icon: '💰',
    },
  };
  const s = styleMap[type] ??
    styleMap.tip ?? { bg: colors.tipBg, border: colors.tipBorder, color: '#60a5fa', icon: '💡' };

  return (
    <div
      style={{
        padding: '14px 16px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: '8px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 600, color: s.color, marginBottom: '4px' }}>
        {s.icon} {headline}
      </div>
      <div style={{ fontSize: '13px', color: colors.textMuted, lineHeight: '1.5' }}>{detail}</div>
    </div>
  );
}

function SummaryRowComponent({ nodeProps }: NexarComponentProps): ReactNode {
  const highlight = nodeProps.highlight === true;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: highlight ? '12px 16px' : '8px 0',
        background: highlight ? `${colors.primary}11` : 'transparent',
        borderRadius: highlight ? '8px' : 0,
        borderBottom: highlight ? 'none' : `1px solid ${colors.cardBorder}`,
      }}
    >
      <span style={{ fontSize: '14px', color: highlight ? '#fff' : colors.textMuted }}>
        {nodeProps.label as string}
      </span>
      <span
        style={{
          fontSize: highlight ? '18px' : '14px',
          fontWeight: highlight ? 700 : 400,
          color: highlight ? colors.success : '#fff',
        }}
      >
        {nodeProps.value as string}
      </span>
    </div>
  );
}

function DividerComponent(): ReactNode {
  return (
    <hr style={{ border: 'none', borderTop: `1px solid ${colors.cardBorder}`, margin: '4px 0' }} />
  );
}

function BadgeComponent({ nodeProps }: NexarComponentProps): ReactNode {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        background: '#1e1e3a',
        border: '1px solid #3a3a6a',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#8b8bff',
      }}
    >
      {nodeProps.content as string}
    </span>
  );
}

function AlertComponent({ nodeProps }: NexarComponentProps): ReactNode {
  const variant = (nodeProps.variant as string) ?? 'error';
  const content = nodeProps.content as string;
  if (!content || content === 'null') return null;

  const isSuccess = variant === 'success';
  return (
    <div
      style={{
        padding: '12px 16px',
        background: isSuccess ? colors.successBg : colors.errorBg,
        border: `1px solid ${isSuccess ? colors.successBorder : colors.errorBorder}`,
        borderRadius: '8px',
        color: isSuccess ? colors.success : colors.error,
        fontSize: '14px',
      }}
    >
      {content}
    </div>
  );
}

/** All registered React components mapped to Nexar types */
export const componentMap: ComponentMap = {
  wizard: WizardComponent,
  step: StepComponent,
  stack: StackComponent,
  text: TextComponent,
  input: InputComponent,
  choice: ChoiceComponent,
  checkbox: CheckboxComponent,
  button: ButtonComponent,
  insight: InsightComponent,
  'summary-row': SummaryRowComponent,
  divider: DividerComponent,
  badge: BadgeComponent,
  alert: AlertComponent,
};
