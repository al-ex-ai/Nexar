import type { TaxResult } from './tax-engine.js';
import { formatCurrency, formatPercent } from './tax-engine.js';

export interface Insight {
  id: string;
  type: 'tip' | 'warning' | 'savings';
  headline: string;
  detail: string;
  step: string;
}

export interface UserProfile {
  filerType: 'simple' | 'advanced';
  incomeTypes: readonly string[];
  hasDeductions: boolean;
  multiState: boolean;
  hasDependents: boolean;
  hasCrypto: boolean;
}

/**
 * Generate AI insights based on user profile and tax computation.
 * In production this would call an LLM. Here we use rule-based logic
 * to demonstrate the architecture.
 */
export function generateInsights(
  profile: UserProfile,
  state: Readonly<Record<string, unknown>>,
  taxResult: TaxResult | null,
): readonly Insight[] {
  const insights: Insight[] = [];
  const wages = Number(state['income.wages']) || 0;

  // Profile-based insights (before any input)
  if (profile.filerType === 'simple') {
    insights.push({
      id: 'simple-filer',
      type: 'tip',
      headline: 'Simple filing detected',
      detail:
        'Based on your profile, you qualify for the streamlined 3-step workflow. Most filers like you complete in under 10 minutes.',
      step: 'filing-status',
    });
  }

  if (profile.filerType === 'advanced') {
    insights.push({
      id: 'advanced-filer',
      type: 'tip',
      headline: 'Comprehensive filing',
      detail:
        "Your income sources require additional forms. We've added investment, deduction, and multi-state sections to your workflow.",
      step: 'filing-status',
    });
  }

  // Workflow composition insight (always show)
  const stepCount = profile.filerType === 'simple' ? 3 : profile.multiState ? 6 : 5;
  insights.push({
    id: 'composition',
    type: 'tip',
    headline: `${stepCount}-step workflow composed`,
    detail: `Nexar composed a ${stepCount}-step workflow from 1 intent based on your profile. No pre-built flow file was used. The same 13 components serve all user types.`,
    step: 'filing-status',
  });

  if (profile.hasDependents) {
    insights.push({
      id: 'dependents-detected',
      type: 'tip',
      headline: 'Dependent fields added',
      detail:
        'Your profile indicates dependents. The filing status step now includes a dependent count field and child tax credit calculation.',
      step: 'filing-status',
    });
  }

  if (profile.multiState) {
    insights.push({
      id: 'multi-state-detected',
      type: 'tip',
      headline: 'Multi-state filing detected',
      detail:
        'A multi-state income allocation step has been added to your workflow. Income will be split across primary and secondary states.',
      step: 'filing-status',
    });
  }

  // Income-based insights
  if (wages > 0 && taxResult) {
    insights.push({
      id: 'bracket',
      type: 'tip',
      headline: `${formatPercent(taxResult.marginalRate)} tax bracket`,
      detail: `Your taxable income of ${formatCurrency(taxResult.taxableIncome)} places you in the ${formatPercent(taxResult.marginalRate)} marginal bracket. Effective rate: ${formatPercent(taxResult.effectiveRate)}.`,
      step: 'income',
    });
  }

  if (wages > 50000 && !profile.hasDeductions) {
    insights.push({
      id: 'itemize-hint',
      type: 'savings',
      headline: 'Consider itemizing',
      detail: `At your income level, itemizing deductions could save you money if your mortgage interest, state taxes, and charitable giving exceed ${formatCurrency(taxResult?.standardDeduction ?? 14600)}.`,
      step: 'income',
    });
  }

  // Investment insights
  if (profile.hasCrypto) {
    insights.push({
      id: 'crypto-warning',
      type: 'warning',
      headline: 'Crypto reporting required',
      detail:
        'All cryptocurrency transactions must be reported. Ensure you have records of cost basis for accurate capital gains calculation.',
      step: 'investments',
    });
  }

  // Deduction insights
  if (profile.hasDeductions && taxResult) {
    const saltPaid = Number(state['deductions.salt']) || 0;
    if (saltPaid > 10000) {
      insights.push({
        id: 'salt-cap',
        type: 'warning',
        headline: 'SALT deduction capped',
        detail: `Your state and local taxes of ${formatCurrency(saltPaid)} exceed the $10,000 SALT cap. Only $10,000 will be deducted.`,
        step: 'deductions',
      });
    }

    if (taxResult.itemizedDeduction < taxResult.standardDeduction) {
      insights.push({
        id: 'standard-better',
        type: 'savings',
        headline: 'Standard deduction is higher',
        detail: `Your itemized deductions total ${formatCurrency(taxResult.itemizedDeduction)}, which is less than the standard deduction of ${formatCurrency(taxResult.standardDeduction)}. We recommend the standard deduction.`,
        step: 'deductions',
      });
    }
  }

  // Dependent insights
  if (profile.hasDependents && taxResult && taxResult.dependentCredit > 0) {
    insights.push({
      id: 'dependent-credit',
      type: 'savings',
      headline: `${formatCurrency(taxResult.dependentCredit)} child tax credit`,
      detail: `You qualify for the child tax credit, reducing your federal tax by ${formatCurrency(taxResult.dependentCredit)}.`,
      step: 'filing-status',
    });
  }

  // Refund insights
  if (taxResult) {
    if (taxResult.refund > 0) {
      insights.push({
        id: 'refund',
        type: 'savings',
        headline: `Estimated refund: ${formatCurrency(taxResult.refund)}`,
        detail:
          'Based on your withholding and calculated tax. File early to receive your refund sooner. Direct deposit typically arrives in 10-14 days.',
        step: 'summary',
      });
    } else if (taxResult.owes) {
      insights.push({
        id: 'owed',
        type: 'warning',
        headline: `Amount owed: ${formatCurrency(Math.abs(taxResult.refund))}`,
        detail:
          'Your withholding was less than your tax liability. Consider adjusting your W-4 withholding for next year.',
        step: 'summary',
      });
    }
  }

  return insights;
}

/**
 * AI Orchestrator: determines filer type from user data.
 * In production, this would call an ML model or LLM.
 */
export function classifyFiler(userData: Partial<UserProfile>): UserProfile {
  const hasInvestments =
    userData.incomeTypes?.some((t) => t === '1099' || t === 'investments') ?? false;

  return {
    filerType:
      hasInvestments || userData.hasDeductions || userData.multiState ? 'advanced' : 'simple',
    incomeTypes: userData.incomeTypes ?? ['w2'],
    hasDeductions: userData.hasDeductions ?? false,
    multiState: userData.multiState ?? false,
    hasDependents: userData.hasDependents ?? false,
    hasCrypto: userData.hasCrypto ?? false,
  };
}
