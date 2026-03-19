import type { Intent, IntentContext, NexarComponent } from '@nexar/core';
import { createEngine, RulesStrategy } from '@nexar/engine';

const webPlatform = { web: { supported: true } } as const;

function c(type: string, category: NexarComponent['category'], description: string): NexarComponent {
  return { type, label: type, description, category, propsSchema: {}, platforms: webPlatform };
}

/** Create the Nexar engine with rules and components */
export function setupEngine() {
  const strategy = new RulesStrategy();

  // --- Intent: Login Form ---
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
          { type: 'text', id: 'login-sub', props: { content: 'Welcome back. Enter your credentials to continue.', variant: 'body' } },
          { type: 'divider', id: 'login-div', props: {} },
          { type: 'input', id: 'email', props: { label: 'Email', inputType: 'email', placeholder: 'you@example.com' } },
          { type: 'input', id: 'password', props: { label: 'Password', inputType: 'password', placeholder: 'Enter password' } },
          {
            type: 'stack',
            id: 'login-actions',
            props: { direction: 'horizontal', justify: 'flex-end', gap: 12 },
            children: [
              { type: 'button', id: 'cancel', props: { label: 'Cancel', variant: 'secondary' } },
              { type: 'button', id: 'submit', props: { label: 'Sign In', variant: 'primary' } },
            ],
          },
        ],
      },
    ],
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
              { type: 'image', id: 'avatar', props: { src: 'https://api.dicebear.com/7.x/initials/svg?seed=AH&backgroundColor=6366f1', alt: 'Avatar', height: 64 } },
              {
                type: 'stack',
                id: 'profile-info',
                props: { direction: 'vertical', gap: 4 },
                children: [
                  { type: 'text', id: 'name', props: { content: context.user?.id ?? 'Guest', variant: 'heading' } },
                  { type: 'text', id: 'role', props: { content: context.user?.role ?? 'User', variant: 'body' } },
                ],
              },
            ],
          },
          { type: 'divider', id: 'profile-div', props: {} },
          {
            type: 'stack',
            id: 'badges',
            props: { direction: 'horizontal', gap: 8 },
            children: [
              { type: 'badge', id: 'b1', props: { content: 'TypeScript' } },
              { type: 'badge', id: 'b2', props: { content: 'React' } },
              { type: 'badge', id: 'b3', props: { content: 'Node.js' } },
              { type: 'badge', id: 'b4', props: { content: 'Azure' } },
            ],
          },
          { type: 'text', id: 'bio', props: { content: '17+ years of full-stack engineering across healthcare, fintech, and marketing platforms. Building the future of intent-driven UI.', variant: 'body' } },
          {
            type: 'stack',
            id: 'profile-actions',
            props: { direction: 'horizontal', gap: 12 },
            children: [
              { type: 'button', id: 'edit', props: { label: 'Edit Profile', variant: 'primary' } },
              { type: 'button', id: 'settings', props: { label: 'Settings', variant: 'secondary' } },
            ],
          },
        ],
      },
    ],
  }));

  // --- Intent: Contact Form ---
  strategy.addRule('contact', () => ({
    type: 'card',
    id: 'contact-card',
    props: { elevated: true },
    children: [
      {
        type: 'stack',
        id: 'contact-stack',
        props: { direction: 'vertical', gap: 20 },
        children: [
          { type: 'text', id: 'contact-title', props: { content: 'Get In Touch', variant: 'heading' } },
          { type: 'text', id: 'contact-sub', props: { content: 'Have a question or want to collaborate? Send a message.', variant: 'body' } },
          { type: 'divider', id: 'contact-div', props: {} },
          {
            type: 'stack',
            id: 'contact-row',
            props: { direction: 'horizontal', gap: 16 },
            children: [
              { type: 'input', id: 'first-name', props: { label: 'First Name', placeholder: 'Alex' } },
              { type: 'input', id: 'last-name', props: { label: 'Last Name', placeholder: 'Husniddinov' } },
            ],
          },
          { type: 'input', id: 'email', props: { label: 'Email', inputType: 'email', placeholder: 'you@example.com' } },
          { type: 'input', id: 'message', props: { label: 'Message', placeholder: 'Your message...' } },
          {
            type: 'stack',
            id: 'contact-actions',
            props: { direction: 'horizontal', justify: 'flex-end' },
            children: [
              { type: 'button', id: 'send', props: { label: 'Send Message', variant: 'primary' } },
            ],
          },
        ],
      },
    ],
  }));

  // --- Intent: Dashboard ---
  strategy.addRule('dashboard', (_intent: Intent, context: IntentContext) => ({
    type: 'stack',
    id: 'dashboard-root',
    props: { direction: 'vertical', gap: 24 },
    children: [
      { type: 'text', id: 'dash-title', props: { content: `Welcome, ${context.user?.id ?? 'Guest'}`, variant: 'heading' } },
      {
        type: 'stack',
        id: 'stats-row',
        props: { direction: 'horizontal', gap: 16 },
        children: [
          {
            type: 'card', id: 'stat-1', props: {},
            children: [
              {
                type: 'stack', id: 'stat-1-stack', props: { direction: 'vertical', gap: 4 },
                children: [
                  { type: 'text', id: 'stat-1-label', props: { content: 'Total Intents', variant: 'label' } },
                  { type: 'text', id: 'stat-1-value', props: { content: '4', variant: 'heading' } },
                ],
              },
            ],
          },
          {
            type: 'card', id: 'stat-2', props: {},
            children: [
              {
                type: 'stack', id: 'stat-2-stack', props: { direction: 'vertical', gap: 4 },
                children: [
                  { type: 'text', id: 'stat-2-label', props: { content: 'Components', variant: 'label' } },
                  { type: 'text', id: 'stat-2-value', props: { content: '8', variant: 'heading' } },
                ],
              },
            ],
          },
          {
            type: 'card', id: 'stat-3', props: {},
            children: [
              {
                type: 'stack', id: 'stat-3-stack', props: { direction: 'vertical', gap: 4 },
                children: [
                  { type: 'text', id: 'stat-3-label', props: { content: 'Packages', variant: 'label' } },
                  { type: 'text', id: 'stat-3-value', props: { content: '8', variant: 'heading' } },
                ],
              },
            ],
          },
          {
            type: 'card', id: 'stat-4', props: {},
            children: [
              {
                type: 'stack', id: 'stat-4-stack', props: { direction: 'vertical', gap: 4 },
                children: [
                  { type: 'text', id: 'stat-4-label', props: { content: 'Tests', variant: 'label' } },
                  { type: 'text', id: 'stat-4-value', props: { content: '24', variant: 'heading' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  }));

  const engine = createEngine({ strategy });

  // Register all components
  engine.registry.register(c('stack', 'layout', 'Flex container for arranging children'));
  engine.registry.register(c('card', 'layout', 'Elevated container with border and padding'));
  engine.registry.register(c('text', 'display', 'Text display with variants: heading, subheading, body, label'));
  engine.registry.register(c('input', 'input', 'Text input with label and placeholder'));
  engine.registry.register(c('button', 'action', 'Clickable button with primary/secondary variants'));
  engine.registry.register(c('badge', 'display', 'Small colored tag for labels and categories'));
  engine.registry.register(c('divider', 'display', 'Horizontal separator line'));
  engine.registry.register(c('image', 'media', 'Image display with src and alt'));

  return engine;
}

/** Available intents for the demo */
export const intents = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview with stats', requires: [] },
  { id: 'login', label: 'Login Form', description: 'Authentication form', requires: ['email', 'password'] },
  { id: 'user-profile', label: 'User Profile', description: 'Show user profile card', requires: [] },
  { id: 'contact', label: 'Contact Form', description: 'Contact message form', requires: ['name', 'email', 'message'] },
] as const;
