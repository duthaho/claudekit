// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://claudekit.duthaho.dev',
  integrations: [
    starlight({
      title: 'Claude Kit',
      description: 'A verification-first engineering toolkit for Claude Code. 15 skills across a 5-phase spine (Investigate → Design → Implement → Verify → Ship), 8 specialist agents, 5 output styles. Free forever.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/duthaho/claudekit' }
      ],
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: true,
      },
      head: [
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
          },
        },
      ],
      customCss: [
        './src/styles/custom.css',
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Configuration', slug: 'getting-started/configuration' },
          ],
        },
        {
          label: 'Workflows',
          items: [
            { label: 'Planning & Building', slug: 'workflows/planning-and-building' },
            { label: 'Testing & Debugging', slug: 'workflows/testing-and-debugging' },
            { label: 'Reviewing & Shipping', slug: 'workflows/reviewing-and-shipping' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Skills', slug: 'reference/skills' },
            { label: 'Agents', slug: 'reference/agents' },
            { label: 'Output Styles', slug: 'reference/output-styles' },
            { label: 'MCP Servers', slug: 'reference/mcp-servers' },
          ],
        },
        {
          label: 'Customization',
          items: [
            { label: 'Creating Skills', slug: 'customization/creating-skills' },
            { label: 'Creating Agents & Output Styles', slug: 'customization/creating-agents-and-modes' },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
