# Example App

Basic demo showing the Nexar pipeline end-to-end.

## What It Demonstrates

- **4 intents**: Dashboard, Login Form, User Profile, Contact Form
- **9 registered components**: stack, card, text, input, button, badge, divider, image, alert
- **State binding**: Type in any input, watch the Live State panel update in real-time
- **Conditional rendering**: Alerts appear/disappear based on state values
- **Expression resolution**: `$form.email` in props resolves from the state store
- **Action system**: Buttons fire actions that update state

## Running

```bash
# From repo root
pnpm install
pnpm build
cd apps/example
pnpm dev
# Open http://127.0.0.1:4100
```

## Architecture

```
Click an intent in the sidebar
    ↓
Engine composes a NexarTree from rules
    ↓
NexarRenderer maps tree nodes to React components
    ↓
State store powers two-way binding on all inputs
    ↓
"View NexarTree JSON" shows the raw composed tree
```

All 4 screens are composed from the same 9 components. No page components exist.
