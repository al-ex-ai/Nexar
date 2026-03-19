# Tax Demo — Dynamic Workflow Engine

**Live demo: [nexar.al-ex.ai](https://nexar.al-ex.ai)**

This demo implements a **Dynamic Tax Workflow Engine** using Nexar's intent-driven architecture. It demonstrates how a single intent can produce different workflows for different taxpayers without maintaining separate flow files.

## The Problem

Tax filing platforms serve diverse users: a simple W-2 filer needs 3 steps, an advanced filer with investments, deductions, and multi-state income needs 6+. The traditional approach creates a separate flow definition for each user type. At scale, this produces tens of thousands of flow files — each maintained, tested, and deployed independently.

## The Nexar Approach

**One intent. Zero flow files. Context drives the composition.**

```
Intent: "file-tax-return" (always the same)

Simple Filer context:
  { filerType: "simple", incomeTypes: ["w2"] }
  → Engine composes: 3 steps (filing status, W-2, summary)

Advanced Filer context:
  { filerType: "advanced", incomeTypes: ["w2", "investments"], hasDeductions: true, multiState: true }
  → Engine composes: 6 steps (filing status, W-2, investments, deductions, multi-state, summary)
```

Same intent. Same components. Same renderer. Different context. Different UI.

## User Profiles

Switch between profiles to see the workflow adapt in real-time:

| Profile | Income Types | Steps | Features |
|---------|-------------|-------|----------|
| **Simple Filer** | W-2 only | 3 | Filing status, wages, refund estimate |
| **Family Filer** | W-2 + dependents | 3 | + dependent count, child tax credit |
| **Advanced Filer** | W-2 + investments | 6 | + investments, itemized deductions, multi-state |
| **Crypto Trader** | W-2 + investments + crypto | 5 | + cryptocurrency reporting |

## What's Included

### Tax Computation Engine
- 2025 progressive tax brackets (10% to 37%)
- Standard vs. itemized deductions (with SALT cap at $10,000)
- Child tax credit ($2,000 per dependent)
- Refund / amount owed calculation
- Effective and marginal rate display

### AI Insight Engine
- Profile-based insights (filer type detection)
- Income-based insights (bracket analysis, IRA suggestions)
- Deduction insights (SALT cap warning, standard vs. itemized comparison)
- Dependent credit notifications
- Refund predictions and withholding advice

Insights update in real-time as the user enters data.

### Interactive Features
- Live state binding (type in a field, state updates everywhere)
- Wizard with progress bar and step navigation
- Conditional fields (crypto form appears only for crypto traders)
- Computed summary (tax calculation runs on every input change)
- Architecture info panel shows how composition works

## Running

```bash
# From repo root
pnpm install
pnpm build
cd apps/tax-demo
pnpm dev
# Open http://127.0.0.1:4200
```

## Architecture

```
User Profile (Simple / Advanced / Crypto / Family)
    ↓
AI Profiler builds context
    ↓
Engine.compose("file-tax-return", context)
    ↓
Rules read context:
  - Always: filing-status + w2-income + summary
  - If investments: + investment step
  - If deductions: + deduction step
  - If multiState: + multi-state step
  - If hasDependents: + dependent fields in filing-status
  - If hasCrypto: + crypto fields in investments
    ↓
NexarTree (platform-agnostic JSON)
    ↓
NexarRenderer maps to React components
    ↓
User sees a personalized workflow
```

### Component Count

13 registered components produce all workflows:
`wizard`, `step`, `stack`, `text`, `input`, `choice`, `checkbox`, `button`, `insight`, `summary-row`, `divider`, `badge`, `alert`

### Flow File Count

**Zero.** No JSON flow files. No routing table. No flow database. The workflow is computed fresh from context every time.

## Comparison

| Approach | Flow files | Adding a new user type | Changing a field |
|----------|-----------|----------------------|-----------------|
| Pre-built flows | 1 per user type (scales linearly) | Create new flow, duplicate 70%+ | Update every flow that has the field |
| Nexar | 0 (always) | Add context value, maybe an `if` block | Update one component |
