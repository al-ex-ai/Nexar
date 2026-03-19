import type { Intent, IntentContext, NexarComponent, NexarNode } from '@nexar/core';
import { createEngine, RulesStrategy } from '@nexar/engine';
import type { UserProfile } from './ai-insights.js';

const webPlatform = { web: { supported: true } } as const;

function c(type: string, category: NexarComponent['category'], desc: string): NexarComponent {
  return {
    type,
    label: type,
    description: desc,
    category,
    propsSchema: {},
    platforms: webPlatform,
  };
}

/**
 * ONE intent, dynamic composition based on context.
 * No flow files. No routing. Context drives the tree.
 */
export function setupEngine() {
  const strategy = new RulesStrategy();

  strategy.addRule('file-tax-return', (_intent: Intent, context: IntentContext) => {
    const profile = context.data as unknown as UserProfile;
    const steps: NexarNode[] = [];
    let stepIndex = 0;

    // Step 1: Filing Status (everyone)
    const filingChildren: NexarNode[] = [
      {
        type: 'choice',
        id: 'filing-status',
        props: {
          label: 'Filing Status',
          bind: '$taxpayer.filingStatus',
          options: [
            { value: 'single', label: 'Single' },
            { value: 'married-joint', label: 'Married Filing Jointly' },
            { value: 'married-separate', label: 'Married Filing Separately' },
            { value: 'head-of-household', label: 'Head of Household' },
          ],
        },
      },
    ];

    if (profile.hasDependents) {
      filingChildren.push(
        { type: 'divider', id: 'dep-div', props: {} },
        {
          type: 'input',
          id: 'dependent-count',
          props: {
            label: 'Number of Dependents',
            inputType: 'number',
            placeholder: '0',
            bind: '$taxpayer.dependentCount',
            helperText: 'Each qualifying dependent provides a $2,000 tax credit',
          },
        },
      );
    }

    steps.push({
      type: 'step',
      id: `step-${stepIndex++}`,
      props: { title: 'Filing Status', subtitle: 'Select your tax filing status for 2025' },
      children: filingChildren,
    });

    // Step 2: W-2 Income (everyone)
    const incomeChildren: NexarNode[] = [
      {
        type: 'input',
        id: 'employer',
        props: { label: 'Employer Name', placeholder: 'Intuit Inc.', bind: '$income.employer' },
      },
      {
        type: 'stack',
        id: 'wage-row',
        props: { direction: 'horizontal', gap: 16 },
        children: [
          {
            type: 'input',
            id: 'wages',
            props: {
              label: 'Total Wages (Box 1)',
              prefix: '$',
              placeholder: '95,000',
              bind: '$income.wages',
              flex: true,
            },
          },
          {
            type: 'input',
            id: 'fed-withheld',
            props: {
              label: 'Federal Tax Withheld (Box 2)',
              prefix: '$',
              placeholder: '18,000',
              bind: '$income.fedWithheld',
              flex: true,
            },
          },
        ],
      },
    ];

    if (profile.multiState) {
      incomeChildren.push({
        type: 'input',
        id: 'state-withheld',
        props: {
          label: 'State Tax Withheld (Box 17)',
          prefix: '$',
          placeholder: '5,000',
          bind: '$income.stateWithheld',
        },
      });
    }

    steps.push({
      type: 'step',
      id: `step-${stepIndex++}`,
      props: { title: 'W-2 Employment Income', subtitle: 'Enter your W-2 information' },
      children: incomeChildren,
    });

    // Step 3: Investment Income (advanced only)
    if (profile.incomeTypes.includes('investments') || profile.incomeTypes.includes('1099')) {
      const investChildren: NexarNode[] = [
        {
          type: 'stack',
          id: 'invest-row',
          props: { direction: 'horizontal', gap: 16 },
          children: [
            {
              type: 'input',
              id: 'dividends',
              props: {
                label: 'Dividends',
                prefix: '$',
                placeholder: '0',
                bind: '$investments.dividends',
                flex: true,
              },
            },
            {
              type: 'input',
              id: 'interest',
              props: {
                label: 'Interest Income',
                prefix: '$',
                placeholder: '0',
                bind: '$investments.interest',
                flex: true,
              },
            },
          ],
        },
        {
          type: 'input',
          id: 'capital-gains',
          props: {
            label: 'Capital Gains',
            prefix: '$',
            placeholder: '0',
            bind: '$investments.capitalGains',
          },
        },
      ];

      if (profile.hasCrypto) {
        investChildren.push(
          { type: 'divider', id: 'crypto-div', props: {} },
          {
            type: 'input',
            id: 'crypto',
            props: {
              label: 'Cryptocurrency Gains/Losses',
              prefix: '$',
              placeholder: '0',
              bind: '$investments.crypto',
              helperText: 'Include all crypto-to-crypto and crypto-to-fiat transactions',
            },
          },
        );
      }

      steps.push({
        type: 'step',
        id: `step-${stepIndex++}`,
        props: {
          title: 'Investment Income',
          subtitle: 'Report dividends, interest, and capital gains',
        },
        children: investChildren,
      });
    }

    // Step 4: Deductions (advanced only)
    if (profile.hasDeductions) {
      steps.push({
        type: 'step',
        id: `step-${stepIndex++}`,
        props: {
          title: 'Deductions',
          subtitle: 'Itemize your deductions or take the standard deduction',
        },
        children: [
          {
            type: 'checkbox',
            id: 'use-itemized',
            props: {
              label: 'I want to itemize my deductions',
              bind: '$deductions.useItemized',
            },
          },
          { type: 'divider', id: 'ded-div', props: {} },
          {
            type: 'input',
            id: 'mortgage',
            props: {
              label: 'Mortgage Interest',
              prefix: '$',
              placeholder: '0',
              bind: '$deductions.mortgage',
            },
          },
          {
            type: 'input',
            id: 'salt',
            props: {
              label: 'State and Local Taxes (SALT)',
              prefix: '$',
              placeholder: '0',
              bind: '$deductions.salt',
              helperText: 'Capped at $10,000',
            },
          },
          {
            type: 'input',
            id: 'charitable',
            props: {
              label: 'Charitable Contributions',
              prefix: '$',
              placeholder: '0',
              bind: '$deductions.charitable',
            },
          },
          {
            type: 'input',
            id: 'medical',
            props: {
              label: 'Medical Expenses',
              prefix: '$',
              placeholder: '0',
              bind: '$deductions.medical',
              helperText: 'Only expenses exceeding 7.5% of AGI are deductible',
            },
          },
        ],
      });
    }

    // Step 5: Multi-State (if applicable)
    if (profile.multiState) {
      steps.push({
        type: 'step',
        id: `step-${stepIndex++}`,
        props: { title: 'Multi-State Filing', subtitle: 'Allocate income across states' },
        children: [
          {
            type: 'input',
            id: 'primary-state',
            props: { label: 'Primary State', placeholder: 'California', bind: '$states.primary' },
          },
          {
            type: 'input',
            id: 'primary-pct',
            props: {
              label: 'Income Earned in Primary State (%)',
              placeholder: '70',
              bind: '$states.primaryPercent',
            },
          },
          { type: 'divider', id: 'state-div', props: {} },
          {
            type: 'input',
            id: 'secondary-state',
            props: { label: 'Secondary State', placeholder: 'New York', bind: '$states.secondary' },
          },
          {
            type: 'input',
            id: 'secondary-pct',
            props: {
              label: 'Income Earned in Secondary State (%)',
              placeholder: '30',
              bind: '$states.secondaryPercent',
            },
          },
        ],
      });
    }

    // Final Step: Tax Summary (everyone) -- composed as static, computed in app
    steps.push({
      type: 'step',
      id: `step-${stepIndex++}`,
      props: { title: 'Tax Summary', subtitle: 'Review your estimated tax calculation' },
      children: [
        {
          type: 'summary-row',
          id: 'sr-gross',
          props: { label: 'Gross Income', value: '$summary.grossIncome' },
        },
        {
          type: 'summary-row',
          id: 'sr-deductions',
          props: { label: 'Total Deductions', value: '$summary.deductions' },
        },
        {
          type: 'summary-row',
          id: 'sr-taxable',
          props: { label: 'Taxable Income', value: '$summary.taxableIncome' },
        },
        { type: 'divider', id: 'sum-div', props: {} },
        {
          type: 'summary-row',
          id: 'sr-tax',
          props: { label: 'Federal Tax', value: '$summary.federalTax' },
        },
        {
          type: 'summary-row',
          id: 'sr-withheld',
          props: { label: 'Total Withheld', value: '$summary.withheld' },
        },
        {
          type: 'summary-row',
          id: 'sr-credits',
          props: { label: 'Credits', value: '$summary.credits' },
        },
        { type: 'divider', id: 'sum-div-2', props: {} },
        {
          type: 'summary-row',
          id: 'sr-refund',
          props: { label: 'Estimated Refund', value: '$summary.refund', highlight: true },
        },
        { type: 'text', id: 'sr-rate', props: { content: '$summary.rateInfo', variant: 'body' } },
      ],
    });

    return {
      type: 'wizard',
      id: 'tax-wizard',
      props: { currentStep: '$wizard.step', totalSteps: steps.length },
      children: steps,
    };
  });

  const engine = createEngine({ strategy });

  // Register all tax components
  engine.registry.register(c('wizard', 'layout', 'Multi-step wizard with progress bar'));
  engine.registry.register(c('step', 'layout', 'Single wizard step with title and subtitle'));
  engine.registry.register(c('stack', 'layout', 'Flex container'));
  engine.registry.register(c('text', 'display', 'Text display with variants'));
  engine.registry.register(c('input', 'input', 'Text input with label, binding, validation'));
  engine.registry.register(c('choice', 'input', 'Single-select option group'));
  engine.registry.register(c('checkbox', 'input', 'Toggle checkbox'));
  engine.registry.register(c('button', 'action', 'Clickable button'));
  engine.registry.register(c('insight', 'feedback', 'AI insight card (tip/warning/savings)'));
  engine.registry.register(c('summary-row', 'display', 'Key-value row for tax summary'));
  engine.registry.register(c('divider', 'display', 'Horizontal separator'));
  engine.registry.register(c('badge', 'display', 'Colored tag'));
  engine.registry.register(c('alert', 'feedback', 'Success or error message'));

  return engine;
}
