import type { Intent, IntentContext, NexarNode, NexarTree, SerializableValue } from '@nexar/core';
import type { NexarAction } from '@nexar/engine';
import { NexarRenderer } from '@nexar/react';
import { createStateStore } from '@nexar/state';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { classifyFiler, generateInsights, type UserProfile } from './ai-insights.js';
import { componentMap } from './components.js';
import { setupEngine } from './setup.js';
import { computeTax, formatCurrency, formatPercent, type TaxInput } from './tax-engine.js';

const engine = setupEngine();
const stateStore = createStateStore();

const PRIMARY = '#355EBE';

function useIsMobile(breakpoint = 768): boolean {
  const query = `(max-width: ${breakpoint}px)`;
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const PROFILES: {
  label: string;
  description: string;
  profile: Partial<UserProfile>;
  prefill: Record<string, SerializableValue>;
}[] = [
  {
    label: 'Simple Filer',
    description: 'W-2 employee, single, no dependents',
    profile: {
      incomeTypes: ['w2'],
      hasDeductions: false,
      multiState: false,
      hasDependents: false,
      hasCrypto: false,
    },
    prefill: {
      'taxpayer.filingStatus': 'single',
      'income.employer': 'Intuit Inc.',
      'income.wages': '95000',
      'income.fedWithheld': '18000',
    },
  },
  {
    label: 'Family Filer',
    description: 'W-2 employee, married, 2 dependents',
    profile: {
      incomeTypes: ['w2'],
      hasDeductions: false,
      multiState: false,
      hasDependents: true,
      hasCrypto: false,
    },
    prefill: {
      'taxpayer.filingStatus': 'married-joint',
      'taxpayer.dependentCount': '2',
      'income.employer': 'Google LLC',
      'income.wages': '145000',
      'income.fedWithheld': '28000',
    },
  },
  {
    label: 'Advanced Filer',
    description: 'W-2 + investments, itemized deductions, multi-state',
    profile: {
      incomeTypes: ['w2', 'investments'],
      hasDeductions: true,
      multiState: true,
      hasDependents: true,
      hasCrypto: false,
    },
    prefill: {
      'taxpayer.filingStatus': 'married-joint',
      'taxpayer.dependentCount': '2',
      'income.employer': 'Amazon.com',
      'income.wages': '185000',
      'income.fedWithheld': '38000',
      'income.stateWithheld': '9200',
      'investments.dividends': '3200',
      'investments.interest': '1800',
      'investments.capitalGains': '12500',
      'deductions.useItemized': true,
      'deductions.mortgage': '18000',
      'deductions.salt': '14500',
      'deductions.charitable': '5000',
      'deductions.medical': '2000',
      'states.primary': 'California',
      'states.primaryPercent': '70',
      'states.secondary': 'Washington',
      'states.secondaryPercent': '30',
    },
  },
  {
    label: 'Crypto Trader',
    description: 'W-2 + investments + crypto, itemized',
    profile: {
      incomeTypes: ['w2', 'investments'],
      hasDeductions: true,
      multiState: false,
      hasDependents: false,
      hasCrypto: true,
    },
    prefill: {
      'taxpayer.filingStatus': 'single',
      'income.employer': 'Coinbase Global',
      'income.wages': '120000',
      'income.fedWithheld': '24000',
      'investments.dividends': '500',
      'investments.interest': '200',
      'investments.capitalGains': '8500',
      'investments.crypto': '22000',
      'deductions.useItemized': true,
      'deductions.mortgage': '15000',
      'deductions.salt': '11000',
      'deductions.charitable': '3000',
    },
  },
];

export function App(): ReactNode {
  const [selectedProfile, setSelectedProfile] = useState<number>(0);
  const [tree, setTree] = useState<NexarTree | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stateSnapshot, setStateSnapshot] = useState<Readonly<Record<string, SerializableValue>>>(
    {},
  );
  const [compositionTime, setCompositionTime] = useState(0);
  const [showTree, setShowTree] = useState(false);

  const userProfile = useMemo(
    () => classifyFiler(PROFILES[selectedProfile]?.profile ?? {}),
    [selectedProfile],
  );
  const totalSteps = tree?.root.children?.length ?? 1;

  useEffect(() => {
    const unsub = stateStore.subscribeAll(() => {
      setStateSnapshot({ ...stateStore.snapshot() });
    });
    return unsub;
  }, []);

  useEffect(() => {
    stateStore.clear();
    setCurrentStep(0);

    const context: IntentContext = {
      platform: { type: 'web' },
      user: { id: 'taxpayer' },
      data: userProfile as unknown as Record<string, unknown>,
    };

    const intent: Intent = {
      id: 'file-tax-return',
      label: 'File Tax Return',
      description: 'Dynamic tax filing workflow',
      requires: ['filing-status', 'income'],
    };

    engine.compose(intent, context).then((result) => {
      setTree(result.response.tree);
      setCompositionTime(result.response.meta.compositionTime);
      stateStore.set('wizard.step', 0);

      const prefill = PROFILES[selectedProfile]?.prefill;
      if (prefill) {
        for (const [key, value] of Object.entries(prefill)) {
          stateStore.set(key, value);
        }
      }
    });
  }, [selectedProfile, userProfile]);

  const taxInput = buildTaxInput(stateSnapshot);
  const taxResult = taxInput.wages > 0 ? computeTax(taxInput) : null;

  // Compute summary values inline (not via state store to avoid infinite loop)
  const summaryState = useMemo(() => {
    if (!taxResult) return {};
    return {
      'summary.grossIncome': formatCurrency(taxResult.grossIncome),
      'summary.deductions': formatCurrency(taxResult.totalDeductions),
      'summary.taxableIncome': formatCurrency(taxResult.taxableIncome),
      'summary.federalTax': formatCurrency(taxResult.federalTax),
      'summary.withheld': formatCurrency(taxInput.fedWithheld),
      'summary.credits': formatCurrency(taxResult.dependentCredit),
      'summary.refund': formatCurrency(Math.abs(taxResult.refund)),
      'summary.rateInfo': `Effective rate: ${formatPercent(taxResult.effectiveRate)} | Marginal bracket: ${formatPercent(taxResult.marginalRate)}`,
    };
  }, [taxResult, taxInput.fedWithheld]);

  // Merge state snapshot with computed summary for rendering
  const renderState = useMemo(
    () => ({ ...stateSnapshot, ...summaryState }),
    [stateSnapshot, summaryState],
  );

  const insights = generateInsights(
    userProfile,
    stateSnapshot as Record<string, unknown>,
    taxResult,
  );
  const stepName = getStepName(currentStep, userProfile);
  const activeInsights = insights.filter(
    (i) => i.step === stepName || i.step === 'summary' || i.step === 'filing-status',
  );

  const visibleTree = tree ? buildVisibleTree(tree, currentStep) : null;

  const handleAction = useCallback(
    (action: NexarAction) => {
      if (action.type === 'setState' && action.key === '_action') {
        if (action.value === 'next' && currentStep < totalSteps - 1) {
          setCurrentStep((s) => s + 1);
          stateStore.set('wizard.step', currentStep + 1);
        } else if (action.value === 'prev' && currentStep > 0) {
          setCurrentStep((s) => s - 1);
          stateStore.set('wizard.step', currentStep - 1);
        }
      }
    },
    [currentStep, totalSteps],
  );

  const handleStateChange = useCallback((key: string, value: SerializableValue) => {
    stateStore.set(key, value);
  }, []);

  const [showSidebar, setShowSidebar] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        background: '#0f1117',
      }}
    >
      {/* Mobile Top Bar */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#0a0c14',
            borderBottom: '1px solid #1e2030',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
            <span style={{ color: PRIMARY }}>N</span>exar
            <span
              style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px', fontWeight: 400 }}
            >
              Tax Demo
            </span>
          </h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowTree(!showTree)}
              style={{
                padding: '6px 10px',
                background: showTree ? `${PRIMARY}22` : 'transparent',
                border: `1px solid ${showTree ? PRIMARY : '#2a2d3a'}`,
                borderRadius: '6px',
                color: showTree ? PRIMARY : '#6b7280',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {'{ }'}
            </button>
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              style={{
                padding: '6px 10px',
                background: showSidebar ? `${PRIMARY}22` : 'transparent',
                border: `1px solid ${showSidebar ? PRIMARY : '#2a2d3a'}`,
                borderRadius: '6px',
                color: showSidebar ? PRIMARY : '#6b7280',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {showSidebar ? 'Close' : 'Profiles'}
            </button>
          </div>
        </div>
      )}

      {/* Left Sidebar */}
      <div
        style={{
          width: isMobile ? '100%' : '300px',
          background: '#0a0c14',
          borderRight: isMobile ? 'none' : '1px solid #1e2030',
          borderBottom: isMobile ? '1px solid #1e2030' : 'none',
          padding: isMobile ? '16px' : '24px',
          display: isMobile && !showSidebar ? 'none' : 'flex',
          flexDirection: 'column',
          gap: '16px',
          flexShrink: 0,
          overflowY: 'auto',
          ...(isMobile ? { maxHeight: '60vh' } : {}),
        }}
      >
        {!isMobile && (
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>
              <span style={{ color: PRIMARY }}>N</span>exar
              <span
                style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 400 }}
              >
                Tax Demo
              </span>
            </h1>
            <p style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>
              Intent-Driven Dynamic Workflows
            </p>
          </div>
        )}

        {/* Profile selector */}
        <div>
          <SectionLabel text="Taxpayer Profile" />
          {PROFILES.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setSelectedProfile(i)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 14px',
                marginBottom: '6px',
                background: selectedProfile === i ? `${PRIMARY}15` : 'transparent',
                border: selectedProfile === i ? `1px solid ${PRIMARY}44` : '1px solid transparent',
                borderRadius: '8px',
                color: selectedProfile === i ? PRIMARY : '#9ca3af',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600 }}>{p.label}</div>
              <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                {p.description}
              </div>
            </button>
          ))}
        </div>

        {/* Architecture info */}
        <div
          style={{
            background: '#111320',
            border: '1px solid #1e2030',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '11px',
          }}
        >
          <p style={{ color: PRIMARY, fontWeight: 600, marginBottom: '8px' }}>Composition Engine</p>
          <InfoRow label="Intent" value="file-tax-return" />
          <InfoRow label="Profile" value={`${userProfile.filerType} filer`} />
          <InfoRow label="Steps" value={`${totalSteps} (composed from context)`} />
          <InfoRow label="Components" value={`${engine.registry.all().length} registered`} />
          <InfoRow label="Composed in" value={`${compositionTime}ms`} />
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1e2030' }}>
            <p style={{ color: '#34d399', fontSize: '10px' }}>
              0 flow files. 1 intent. {PROFILES.length} profiles. Context drives composition.
            </p>
          </div>
        </div>

        {/* AI Insights */}
        {activeInsights.length > 0 && (
          <div>
            <SectionLabel text={`AI Insights (${activeInsights.length})`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          padding: isMobile ? '16px' : '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? '16px' : '24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '680px' }}>
          {visibleTree && (
            <NexarRenderer
              tree={visibleTree}
              components={componentMap}
              state={renderState as Record<string, SerializableValue>}
              onAction={handleAction}
              onStateChange={handleStateChange}
            />
          )}

          {/* Navigation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: isMobile ? '16px' : '24px',
              gap: isMobile ? '8px' : '0',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setCurrentStep((s) => s - 1);
                stateStore.set('wizard.step', currentStep - 1);
              }}
              disabled={currentStep === 0}
              style={{
                padding: isMobile ? '10px 16px' : '12px 24px',
                background: currentStep === 0 ? '#1a1d28' : 'transparent',
                border: `1px solid ${currentStep === 0 ? '#2a2d3a' : '#2a2d3a'}`,
                borderRadius: '8px',
                color: currentStep === 0 ? '#4b5563' : '#9ca3af',
                fontSize: isMobile ? '13px' : '14px',
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {isMobile ? 'Prev' : 'Previous'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
              <span style={{ fontSize: isMobile ? '12px' : '13px', color: '#6b7280' }}>
                {currentStep + 1}/{totalSteps}
              </span>
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => setShowTree(!showTree)}
                  style={{
                    padding: '6px 12px',
                    background: showTree ? `${PRIMARY}22` : 'transparent',
                    border: `1px solid ${showTree ? PRIMARY : '#2a2d3a'}`,
                    borderRadius: '6px',
                    color: showTree ? PRIMARY : '#6b7280',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {'{ }'} Tree
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setCurrentStep((s) => s + 1);
                stateStore.set('wizard.step', currentStep + 1);
              }}
              disabled={currentStep >= totalSteps - 1}
              style={{
                padding: isMobile ? '10px 16px' : '12px 24px',
                background: currentStep >= totalSteps - 1 ? '#1a1d28' : PRIMARY,
                border: 'none',
                borderRadius: '8px',
                color: currentStep >= totalSteps - 1 ? '#4b5563' : '#fff',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 600,
                cursor: currentStep >= totalSteps - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              {currentStep >= totalSteps - 1 ? 'File Return' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Drawer / Bottom Panel - NexarTree viewer */}
      {showTree && tree && (
        <div
          style={{
            width: isMobile ? '100%' : '380px',
            background: '#0a0c14',
            borderLeft: isMobile ? 'none' : '1px solid #1e2030',
            borderTop: isMobile ? '1px solid #1e2030' : 'none',
            padding: isMobile ? '16px' : '24px',
            flexShrink: 0,
            overflowY: 'auto',
            ...(isMobile ? { maxHeight: '50vh' } : {}),
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>NexarTree</p>
              <p style={{ fontSize: '11px', color: '#4b5563' }}>
                {totalSteps} steps, {countNodes(tree.root)} nodes
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTree(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              x
            </button>
          </div>
          <pre
            style={{
              background: '#111320',
              border: '1px solid #1e2030',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#9ca3af',
              overflow: 'auto',
              maxHeight: 'calc(100vh - 120px)',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(tree, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// --- Helper Components ---

function SectionLabel({ text }: { readonly text: string }): ReactNode {
  return (
    <p
      style={{
        fontSize: '11px',
        color: '#4b5563',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '8px',
      }}
    >
      {text}
    </p>
  );
}

function InfoRow({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  return (
    <p style={{ color: '#4b5563', marginBottom: '4px' }}>
      <span style={{ color: '#9ca3af' }}>{label}:</span> {value}
    </p>
  );
}

function InsightCard({
  insight,
}: {
  readonly insight: { readonly type: string; readonly headline: string; readonly detail: string };
}): ReactNode {
  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    tip: { bg: '#111827', border: '#1e3a5f', text: '#60a5fa', icon: '>' },
    savings: { bg: '#0a2a1a', border: '#1a5a3a', text: '#34d399', icon: '$' },
    warning: { bg: '#2a2000', border: '#5a4a00', text: '#fbbf24', icon: '!' },
  };
  const c = colorMap[insight.type] ??
    colorMap.tip ?? { bg: '#111827', border: '#1e3a5f', text: '#60a5fa', icon: '>' };

  return (
    <div
      style={{
        padding: '10px 12px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '8px',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 600, color: c.text, marginBottom: '4px' }}>
        <span style={{ fontFamily: 'monospace', marginRight: '6px' }}>[{c.icon}]</span>
        {insight.headline}
      </div>
      <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.4' }}>{insight.detail}</div>
    </div>
  );
}

// --- Helper Functions ---

function buildVisibleTree(tree: NexarTree, step: number): NexarTree {
  const currentStepNode = tree.root.children?.[step];
  if (!currentStepNode) return tree;

  return {
    version: '1.0',
    root: {
      ...tree.root,
      props: { ...tree.root.props, currentStep: step, totalSteps: tree.root.children?.length ?? 1 },
      children: [currentStepNode],
    },
  };
}

function countNodes(node: NexarNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

function getStepName(step: number, profile: UserProfile): string {
  const steps = ['filing-status', 'income'];
  if (profile.incomeTypes.includes('investments') || profile.incomeTypes.includes('1099')) {
    steps.push('investments');
  }
  if (profile.hasDeductions) steps.push('deductions');
  if (profile.multiState) steps.push('states');
  steps.push('summary');
  return steps[step] ?? 'summary';
}

function parseNum(val: SerializableValue | undefined): number {
  return Number(String(val ?? '0').replace(/,/g, '')) || 0;
}

function buildTaxInput(state: Readonly<Record<string, SerializableValue>>): TaxInput {
  return {
    wages: parseNum(state['income.wages']),
    fedWithheld: parseNum(state['income.fedWithheld']),
    stateWithheld: parseNum(state['income.stateWithheld']),
    investmentIncome:
      parseNum(state['investments.dividends']) +
      parseNum(state['investments.interest']) +
      parseNum(state['investments.capitalGains']),
    cryptoIncome: parseNum(state['investments.crypto']),
    mortgageInterest: parseNum(state['deductions.mortgage']),
    saltPaid: parseNum(state['deductions.salt']),
    charitableGiving: parseNum(state['deductions.charitable']),
    medicalExpenses: parseNum(state['deductions.medical']),
    useItemized: state['deductions.useItemized'] === true,
    dependentCount: Number(state['taxpayer.dependentCount'] ?? '0') || 0,
  };
}
