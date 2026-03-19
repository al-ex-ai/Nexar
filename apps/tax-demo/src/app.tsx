import { useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Intent, IntentContext, NexarTree, NexarNode, SerializableValue } from '@nexar/core';
import type { NexarAction } from '@nexar/engine';
import { NexarRenderer } from '@nexar/react';
import { createStateStore } from '@nexar/state';
import { componentMap } from './components.js';
import { setupEngine } from './setup.js';
import { classifyFiler, generateInsights, type UserProfile } from './ai-insights.js';
import { computeTax, formatCurrency, formatPercent, type TaxInput } from './tax-engine.js';

const engine = setupEngine();
const stateStore = createStateStore();

const PROFILES: { label: string; description: string; profile: Partial<UserProfile> }[] = [
  {
    label: 'Simple Filer',
    description: 'W-2 employee, single, no dependents',
    profile: { incomeTypes: ['w2'], hasDeductions: false, multiState: false, hasDependents: false, hasCrypto: false },
  },
  {
    label: 'Family Filer',
    description: 'W-2 employee, married, 2 dependents',
    profile: { incomeTypes: ['w2'], hasDeductions: false, multiState: false, hasDependents: true, hasCrypto: false },
  },
  {
    label: 'Advanced Filer',
    description: 'W-2 + investments, itemized deductions, multi-state',
    profile: { incomeTypes: ['w2', 'investments'], hasDeductions: true, multiState: true, hasDependents: true, hasCrypto: false },
  },
  {
    label: 'Crypto Trader',
    description: 'W-2 + investments + crypto, itemized',
    profile: { incomeTypes: ['w2', 'investments'], hasDeductions: true, multiState: false, hasDependents: false, hasCrypto: true },
  },
];

export function App(): ReactNode {
  const [selectedProfile, setSelectedProfile] = useState<number>(0);
  const [tree, setTree] = useState<NexarTree | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stateSnapshot, setStateSnapshot] = useState<Readonly<Record<string, SerializableValue>>>({});
  const [compositionTime, setCompositionTime] = useState(0);

  const userProfile = classifyFiler(PROFILES[selectedProfile]?.profile ?? {});
  const totalSteps = tree?.root.children?.length ?? 1;

  // Subscribe to state changes
  useEffect(() => {
    const unsub = stateStore.subscribeAll(() => {
      setStateSnapshot({ ...stateStore.snapshot() });
    });
    return unsub;
  }, []);

  // Compose tree when profile changes
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
    });
  }, [selectedProfile]);

  // Compute tax whenever state changes
  const taxInput: TaxInput = {
    wages: Number(String(stateSnapshot['income.wages'] ?? '0').replace(/,/g, '')) || 0,
    fedWithheld: Number(String(stateSnapshot['income.fedWithheld'] ?? '0').replace(/,/g, '')) || 0,
    stateWithheld: Number(String(stateSnapshot['income.stateWithheld'] ?? '0').replace(/,/g, '')) || 0,
    investmentIncome:
      (Number(String(stateSnapshot['investments.dividends'] ?? '0').replace(/,/g, '')) || 0) +
      (Number(String(stateSnapshot['investments.interest'] ?? '0').replace(/,/g, '')) || 0) +
      (Number(String(stateSnapshot['investments.capitalGains'] ?? '0').replace(/,/g, '')) || 0),
    cryptoIncome: Number(String(stateSnapshot['investments.crypto'] ?? '0').replace(/,/g, '')) || 0,
    mortgageInterest: Number(String(stateSnapshot['deductions.mortgage'] ?? '0').replace(/,/g, '')) || 0,
    saltPaid: Number(String(stateSnapshot['deductions.salt'] ?? '0').replace(/,/g, '')) || 0,
    charitableGiving: Number(String(stateSnapshot['deductions.charitable'] ?? '0').replace(/,/g, '')) || 0,
    medicalExpenses: Number(String(stateSnapshot['deductions.medical'] ?? '0').replace(/,/g, '')) || 0,
    useItemized: stateSnapshot['deductions.useItemized'] === true,
    dependentCount: Number(stateSnapshot['taxpayer.dependentCount'] ?? '0') || 0,
  };

  const taxResult = taxInput.wages > 0 ? computeTax(taxInput) : null;

  // Update summary state for the tree
  useEffect(() => {
    if (taxResult) {
      stateStore.set('summary.grossIncome', formatCurrency(taxResult.grossIncome));
      stateStore.set('summary.deductions', formatCurrency(taxResult.totalDeductions));
      stateStore.set('summary.taxableIncome', formatCurrency(taxResult.taxableIncome));
      stateStore.set('summary.federalTax', formatCurrency(taxResult.federalTax));
      stateStore.set('summary.withheld', formatCurrency(taxInput.fedWithheld));
      stateStore.set('summary.credits', formatCurrency(taxResult.dependentCredit));
      stateStore.set('summary.refund', formatCurrency(Math.abs(taxResult.refund)));
      stateStore.set('summary.rateInfo', `Effective rate: ${formatPercent(taxResult.effectiveRate)} | Marginal bracket: ${formatPercent(taxResult.marginalRate)}`);
    }
  }, [taxResult?.grossIncome, taxResult?.federalTax, taxResult?.refund]);

  // Generate AI insights
  const insights = generateInsights(userProfile, stateSnapshot as Record<string, unknown>, taxResult);
  const stepName = getStepName(currentStep, userProfile);
  const activeInsights = insights.filter((i) => i.step === stepName || i.step === 'summary');

  // Build the visible tree (only current step)
  const visibleTree = tree ? buildVisibleTree(tree, currentStep, stateSnapshot) : null;

  const handleAction = useCallback((action: NexarAction) => {
    if (action.type === 'setState' && action.key === '_action') {
      if (action.value === 'next' && currentStep < totalSteps - 1) {
        setCurrentStep((s) => s + 1);
        stateStore.set('wizard.step', currentStep + 1);
      } else if (action.value === 'prev' && currentStep > 0) {
        setCurrentStep((s) => s - 1);
        stateStore.set('wizard.step', currentStep - 1);
      }
    }
  }, [currentStep, totalSteps]);

  const handleStateChange = useCallback((key: string, value: SerializableValue) => {
    stateStore.set(key, value);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{
        width: '300px',
        background: '#0d0d1a',
        borderRight: '1px solid #1a1a2e',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        flexShrink: 0,
        overflowY: 'auto',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>
            <span style={{ color: '#6366f1' }}>{'>'}</span> Nexar Tax Demo
          </h1>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Intent-Driven Dynamic Workflows
          </p>
        </div>

        {/* Profile selector */}
        <div>
          <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            User Profile
          </p>
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
                background: selectedProfile === i ? '#1a1a3a' : 'transparent',
                border: selectedProfile === i ? '1px solid #2a2a5a' : '1px solid transparent',
                borderRadius: '8px',
                color: selectedProfile === i ? '#8b8bff' : '#888',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600 }}>{p.label}</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{p.description}</div>
            </button>
          ))}
        </div>

        {/* Architecture info */}
        <div style={{
          background: '#0a0a15',
          border: '1px solid #1a1a2e',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '11px',
        }}>
          <p style={{ color: '#6366f1', fontWeight: 600, marginBottom: '8px' }}>How Nexar Works</p>
          <p style={{ color: '#555', marginBottom: '4px' }}>
            <span style={{ color: '#888' }}>Intent:</span> file-tax-return (always the same)
          </p>
          <p style={{ color: '#555', marginBottom: '4px' }}>
            <span style={{ color: '#888' }}>Profile:</span> {userProfile.filerType} filer
          </p>
          <p style={{ color: '#555', marginBottom: '4px' }}>
            <span style={{ color: '#888' }}>Steps:</span> {totalSteps} (composed from context)
          </p>
          <p style={{ color: '#555', marginBottom: '4px' }}>
            <span style={{ color: '#888' }}>Components:</span> {engine.registry.all().length} registered
          </p>
          <p style={{ color: '#555' }}>
            <span style={{ color: '#888' }}>Composed:</span> {compositionTime}ms
          </p>
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1a1a2e' }}>
            <p style={{ color: '#4ade80', fontSize: '10px' }}>
              0 flow files. 1 intent. {PROFILES.length} user types. Context drives the tree.
            </p>
          </div>
        </div>

        {/* AI Insights */}
        {activeInsights.length > 0 && (
          <div>
            <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              AI Insights ({activeInsights.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeInsights.map((insight) => (
                <div key={insight.id} style={{
                  padding: '10px 12px',
                  background: insight.type === 'tip' ? '#0a1a2a' : insight.type === 'savings' ? '#0a2a1a' : '#2a2000',
                  border: `1px solid ${insight.type === 'tip' ? '#1a3a5a' : insight.type === 'savings' ? '#1a5a3a' : '#5a4a00'}`,
                  borderRadius: '8px',
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: insight.type === 'tip' ? '#60a5fa' : insight.type === 'savings' ? '#4ade80' : '#fbbf24',
                    marginBottom: '4px',
                  }}>
                    {insight.type === 'tip' ? '💡' : insight.type === 'savings' ? '💰' : '⚠️'} {insight.headline}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.4' }}>{insight.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}>
        <div style={{ width: '100%', maxWidth: '680px' }}>
          {visibleTree && (
            <NexarRenderer
              tree={visibleTree}
              components={componentMap}
              state={stateSnapshot as Record<string, SerializableValue>}
              onAction={handleAction}
              onStateChange={handleStateChange}
            />
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => { setCurrentStep((s) => s - 1); stateStore.set('wizard.step', currentStep - 1); }}
              disabled={currentStep === 0}
              style={{
                padding: '12px 24px',
                background: currentStep === 0 ? '#222' : 'transparent',
                border: `1px solid ${currentStep === 0 ? '#333' : '#2a2a4a'}`,
                borderRadius: '8px',
                color: currentStep === 0 ? '#555' : '#ccc',
                fontSize: '14px',
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '14px', color: '#555', alignSelf: 'center' }}>
              Step {currentStep + 1} of {totalSteps}
            </span>
            <button
              type="button"
              onClick={() => { setCurrentStep((s) => s + 1); stateStore.set('wizard.step', currentStep + 1); }}
              disabled={currentStep >= totalSteps - 1}
              style={{
                padding: '12px 24px',
                background: currentStep >= totalSteps - 1 ? '#333' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: '8px',
                color: currentStep >= totalSteps - 1 ? '#666' : '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: currentStep >= totalSteps - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              {currentStep >= totalSteps - 1 ? 'File Return' : 'Next'}
            </button>
          </div>
        </div>

        {/* Tree JSON viewer */}
        {tree && (
          <details style={{ width: '100%', maxWidth: '680px' }}>
            <summary style={{ fontSize: '12px', color: '#555', cursor: 'pointer', padding: '8px 0' }}>
              View composed NexarTree ({totalSteps} steps, {countNodes(tree.root)} nodes)
            </summary>
            <pre style={{
              background: '#0d0d1a',
              border: '1px solid #1a1a2e',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '11px',
              color: '#888',
              overflow: 'auto',
              maxHeight: '400px',
            }}>
              {JSON.stringify(tree, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/** Build a tree showing only the current step */
function buildVisibleTree(tree: NexarTree, step: number, _state: Readonly<Record<string, SerializableValue>>): NexarTree {
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
