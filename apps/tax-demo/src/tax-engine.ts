/**
 * Tax computation engine.
 * Progressive brackets, deductions, credits, refund calculation.
 */

const BRACKETS_2025 = [
  { min: 0, max: 11600, rate: 0.1 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
] as const;

const STANDARD_DEDUCTION = 14600;
const SALT_CAP = 10000;
const DEPENDENT_CREDIT = 2000;

export interface TaxInput {
  wages: number;
  fedWithheld: number;
  stateWithheld: number;
  investmentIncome: number;
  cryptoIncome: number;
  mortgageInterest: number;
  saltPaid: number;
  charitableGiving: number;
  medicalExpenses: number;
  useItemized: boolean;
  dependentCount: number;
}

export interface TaxResult {
  grossIncome: number;
  totalDeductions: number;
  standardDeduction: number;
  itemizedDeduction: number;
  taxableIncome: number;
  federalTax: number;
  dependentCredit: number;
  effectiveRate: number;
  marginalRate: number;
  refund: number;
  owes: boolean;
}

export function computeTax(input: TaxInput): TaxResult {
  const grossIncome = input.wages + input.investmentIncome + input.cryptoIncome;

  const saltCapped = Math.min(input.saltPaid, SALT_CAP);
  const itemizedDeduction =
    input.mortgageInterest +
    saltCapped +
    input.charitableGiving +
    Math.max(0, input.medicalExpenses - grossIncome * 0.075);

  const totalDeductions = input.useItemized
    ? Math.max(itemizedDeduction, STANDARD_DEDUCTION)
    : STANDARD_DEDUCTION;

  const taxableIncome = Math.max(0, grossIncome - totalDeductions);

  let federalTax = 0;
  let marginalRate = 0.1;
  for (const bracket of BRACKETS_2025) {
    if (taxableIncome > bracket.min) {
      const taxable = Math.min(taxableIncome, bracket.max) - bracket.min;
      federalTax += taxable * bracket.rate;
      marginalRate = bracket.rate;
    }
  }

  const dependentCredit = input.dependentCount * DEPENDENT_CREDIT;
  federalTax = Math.max(0, federalTax - dependentCredit);

  const effectiveRate = grossIncome > 0 ? federalTax / grossIncome : 0;
  const refund = input.fedWithheld - federalTax;

  return {
    grossIncome,
    totalDeductions,
    standardDeduction: STANDARD_DEDUCTION,
    itemizedDeduction,
    taxableIncome,
    federalTax,
    dependentCredit,
    effectiveRate,
    marginalRate,
    refund,
    owes: refund < 0,
  };
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
