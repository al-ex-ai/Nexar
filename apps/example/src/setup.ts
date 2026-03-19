import type { Intent, IntentContext, NexarComponent } from '@nexar/core';
import { createEngine, RulesStrategy } from '@nexar/engine';

const webPlatform = { web: { supported: true } } as const;

function c(
  type: string,
  category: NexarComponent['category'],
  description: string,
): NexarComponent {
  return { type, label: type, description, category, propsSchema: {}, platforms: webPlatform };
}

/** Create the Nexar engine with rules and components */
export function setupEngine() {
  const strategy = new RulesStrategy();

  // --- Intent: Login Form (fully interactive) ---
  strategy.addRule('login', (_intent: Intent, _context: IntentContext) => ({
    type: 'card',
    id: 'login-card',
    props: { elevated: true },
    children: [
      {
        type: 'stack',
        id: 'login-stack',
        props: { direction: 'vertical', gap: 20 },
        children: [
          { type: 'text', id: 'login-title', props: { content: 'Sign In', variant: 'heading' } },
          {
            type: 'text',
            id: 'login-sub',
            props: {
              content: 'Welcome back. Enter your credentials to continue.',
              variant: 'body',
            },
          },
          // Success message (conditional)
          {
            type: 'alert',
            id: 'login-success',
            props: { content: '$login.success', variant: 'success' },
            when: '$login.success != null',
          },
          // Error message (conditional)
          {
            type: 'alert',
            id: 'login-error',
            props: { content: '$login.error', variant: 'error' },
            when: '$login.error != null',
          },
          { type: 'divider', id: 'login-div', props: {} },
          // Email input bound to state
          {
            type: 'input',
            id: 'email',
            props: {
              label: 'Email',
              inputType: 'email',
              placeholder: 'you@example.com',
              bind: '$form.email',
              error: '$errors.email',
            },
          },
          // Password input bound to state
          {
            type: 'input',
            id: 'password',
            props: {
              label: 'Password',
              inputType: 'password',
              placeholder: 'Enter password',
              bind: '$form.password',
              error: '$errors.password',
            },
          },
          {
            type: 'stack',
            id: 'login-actions',
            props: { direction: 'horizontal', justify: 'flex-end', gap: 12 },
            children: [
              {
                type: 'button',
                id: 'cancel',
                props: { label: 'Cancel', variant: 'secondary', action: 'cancel' },
              },
              {
                type: 'button',
                id: 'submit',
                props: {
                  label: 'Sign In',
                  variant: 'primary',
                  action: 'submit',
                  loading: '$login.loading',
                  disabled: '$login.loading',
                },
              },
            ],
          },
        ],
      },
    ],
    state: {
      'form.email': '',
      'form.password': '',
      'errors.email': null,
      'errors.password': null,
      'login.loading': false,
      'login.error': null,
      'login.success': null,
    },
  }));

  // --- Intent: User Profile ---
  strategy.addRule('user-profile', (_intent: Intent, context: IntentContext) => ({
    type: 'card',
    id: 'profile-card',
    props: { elevated: true },
    children: [
      {
        type: 'stack',
        id: 'profile-stack',
        props: { direction: 'vertical', gap: 16 },
        children: [
          {
            type: 'stack',
            id: 'profile-header',
            props: { direction: 'horizontal', gap: 16 },
            children: [
              {
                type: 'image',
                id: 'avatar',
                props: {
                  src: 'https://api.dicebear.com/7.x/initials/svg?seed=AH&backgroundColor=6366f1',
                  alt: 'Avatar',
                  height: 64,
                },
              },
              {
                type: 'stack',
                id: 'profile-info',
                props: { direction: 'vertical', gap: 4 },
                children: [
                  {
                    type: 'text',
                    id: 'name',
                    props: { content: context.user?.id ?? 'Guest', variant: 'heading' },
                  },
                  {
                    type: 'text',
                    id: 'role',
                    props: { content: context.user?.role ?? 'User', variant: 'body' },
                  },
                ],
              },
            ],
          },
          { type: 'divider', id: 'profile-div', props: {} },
          {
            type: 'stack',
            id: 'badges',
            props: { direction: 'horizontal', gap: 8, wrap: true },
            children: [
              { type: 'badge', id: 'b1', props: { content: 'TypeScript' } },
              { type: 'badge', id: 'b2', props: { content: 'React' } },
              { type: 'badge', id: 'b3', props: { content: 'Node.js' } },
              { type: 'badge', id: 'b4', props: { content: 'Azure' } },
              { type: 'badge', id: 'b5', props: { content: '.NET' } },
              { type: 'badge', id: 'b6', props: { content: 'PostgreSQL' } },
            ],
          },
          {
            type: 'text',
            id: 'bio',
            props: {
              content:
                '17+ years of full-stack engineering across healthcare, fintech, and marketing platforms. Building the future of intent-driven UI.',
              variant: 'body',
            },
          },
          {
            type: 'stack',
            id: 'profile-actions',
            props: { direction: 'horizontal', gap: 12 },
            children: [
              {
                type: 'button',
                id: 'edit',
                props: { label: 'Edit Profile', variant: 'primary', action: 'edit' },
              },
              {
                type: 'button',
                id: 'settings',
                props: { label: 'Settings', variant: 'secondary', action: 'settings' },
              },
            ],
          },
        ],
      },
    ],
  }));

  // --- Intent: Contact Form (interactive) ---
  strategy.addRule('contact', (_intent: Intent, _context: IntentContext) => ({
    type: 'card',
    id: 'contact-card',
    props: { elevated: true },
    children: [
      {
        type: 'stack',
        id: 'contact-stack',
        props: { direction: 'vertical', gap: 20 },
        children: [
          {
            type: 'text',
            id: 'contact-title',
            props: { content: 'Get In Touch', variant: 'heading' },
          },
          {
            type: 'text',
            id: 'contact-sub',
            props: {
              content: 'Have a question or want to collaborate? Send a message.',
              variant: 'body',
            },
          },
          {
            type: 'alert',
            id: 'contact-success',
            props: { content: '$contact.success', variant: 'success' },
            when: '$contact.success != null',
          },
          { type: 'divider', id: 'contact-div', props: {} },
          {
            type: 'stack',
            id: 'contact-row',
            props: { direction: 'horizontal', gap: 16 },
            children: [
              {
                type: 'input',
                id: 'first-name',
                props: {
                  label: 'First Name',
                  placeholder: 'Alex',
                  bind: '$form.firstName',
                  error: '$errors.firstName',
                },
              },
              {
                type: 'input',
                id: 'last-name',
                props: {
                  label: 'Last Name',
                  placeholder: 'Husniddinov',
                  bind: '$form.lastName',
                  error: '$errors.lastName',
                },
              },
            ],
          },
          {
            type: 'input',
            id: 'email',
            props: {
              label: 'Email',
              inputType: 'email',
              placeholder: 'you@example.com',
              bind: '$form.email',
              error: '$errors.email',
            },
          },
          {
            type: 'input',
            id: 'message',
            props: {
              label: 'Message',
              placeholder: 'Your message...',
              bind: '$form.message',
              error: '$errors.message',
            },
          },
          {
            type: 'stack',
            id: 'contact-actions',
            props: { direction: 'horizontal', justify: 'flex-end' },
            children: [
              {
                type: 'button',
                id: 'send',
                props: { label: 'Send Message', variant: 'primary', action: 'send' },
              },
            ],
          },
        ],
      },
    ],
    state: {
      'form.firstName': '',
      'form.lastName': '',
      'form.email': '',
      'form.message': '',
      'errors.firstName': null,
      'errors.lastName': null,
      'errors.email': null,
      'errors.message': null,
      'contact.success': null,
    },
  }));

  // --- Intent: Dashboard ---
  strategy.addRule('dashboard', (_intent: Intent, context: IntentContext) => ({
    type: 'stack',
    id: 'dashboard-root',
    props: { direction: 'vertical', gap: 24 },
    children: [
      {
        type: 'text',
        id: 'dash-title',
        props: { content: `Welcome, ${context.user?.id ?? 'Guest'}`, variant: 'heading' },
      },
      {
        type: 'text',
        id: 'dash-sub',
        props: {
          content:
            'This UI is composed from intents, not hardcoded pages. Click any intent in the sidebar.',
          variant: 'body',
        },
      },
      {
        type: 'stack',
        id: 'stats-row',
        props: { direction: 'horizontal', gap: 16, wrap: true },
        children: [
          statCard('stat-1', 'Intents', '4'),
          statCard('stat-2', 'Components', '9'),
          statCard('stat-3', 'Packages', '8'),
          statCard('stat-4', 'Tests', '24'),
        ],
      },
      { type: 'divider', id: 'dash-div', props: {} },
      { type: 'text', id: 'arch-title', props: { content: 'Architecture', variant: 'subheading' } },
      {
        type: 'stack',
        id: 'arch-badges',
        props: { direction: 'horizontal', gap: 8, wrap: true },
        children: [
          { type: 'badge', id: 'a1', props: { content: 'Intent Schema' } },
          { type: 'badge', id: 'a2', props: { content: 'Component Registry' } },
          { type: 'badge', id: 'a3', props: { content: 'Tree Validation' } },
          { type: 'badge', id: 'a4', props: { content: 'State Binding' } },
          { type: 'badge', id: 'a5', props: { content: 'Action Executor' } },
          { type: 'badge', id: 'a6', props: { content: 'Expression Engine' } },
          { type: 'badge', id: 'a7', props: { content: 'React Renderer' } },
          { type: 'badge', id: 'a8', props: { content: 'Conditional Rendering' } },
        ],
      },
    ],
  }));

  const engine = createEngine({ strategy });

  // Register all components
  engine.registry.register(c('stack', 'layout', 'Flex container for arranging children'));
  engine.registry.register(c('card', 'layout', 'Elevated container with border and padding'));
  engine.registry.register(c('text', 'display', 'Text display with variants'));
  engine.registry.register(
    c('input', 'input', 'Text input with label, validation, and state binding'),
  );
  engine.registry.register(c('button', 'action', 'Clickable button with actions'));
  engine.registry.register(c('badge', 'display', 'Small colored tag'));
  engine.registry.register(c('divider', 'display', 'Horizontal separator'));
  engine.registry.register(c('image', 'media', 'Image display'));
  engine.registry.register(c('alert', 'feedback', 'Success or error message'));

  return engine;
}

function statCard(id: string, label: string, value: string) {
  return {
    type: 'card' as const,
    id,
    props: {},
    children: [
      {
        type: 'stack' as const,
        id: `${id}-stack`,
        props: { direction: 'vertical' as const, gap: 4 },
        children: [
          {
            type: 'text' as const,
            id: `${id}-label`,
            props: { content: label, variant: 'label' as const },
          },
          {
            type: 'text' as const,
            id: `${id}-value`,
            props: { content: value, variant: 'heading' as const },
          },
        ],
      },
    ],
  };
}

/** Available intents for the demo */
export const intents = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview with stats', requires: [] },
  {
    id: 'login',
    label: 'Login Form',
    description: 'Interactive auth form with validation',
    requires: ['email', 'password'],
  },
  {
    id: 'user-profile',
    label: 'User Profile',
    description: 'Context-aware profile card',
    requires: [],
  },
  {
    id: 'contact',
    label: 'Contact Form',
    description: 'Interactive contact form',
    requires: ['name', 'email', 'message'],
  },
] as const;
