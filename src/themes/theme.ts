import { createTheme } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';

// Brand primary: deep navy/indigo
const brand: MantineColorsTuple = [
  '#eef2ff', // 0 - lightest
  '#dbe4ff', // 1
  '#bac8ff', // 2
  '#91a7ff', // 3
  '#748ffc', // 4
  '#5c7cfa', // 5
  '#4c6ef5', // 6
  '#3b5bdb', // 7 - primary default
  '#2f4ac2', // 8
  '#1e3a8a', // 9 - darkest
];

// Accent: teal/cyan for AI features
const accent: MantineColorsTuple = [
  '#e3fafc', // 0
  '#c5f6fa', // 1
  '#99e9f2', // 2
  '#66d9e8', // 3
  '#3bc9db', // 4
  '#22b8cf', // 5
  '#15aabf', // 6
  '#1098ad', // 7
  '#0c8599', // 8
  '#0b7285', // 9
];

export const cognitaTheme = createTheme({
  primaryColor: 'brand',
  primaryShade: 7,

  colors: {
    brand,
    accent,
  },

  fontFamily: 'DM Sans, Inter, system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, Fira Code, monospace',
  headings: {
    fontFamily: 'Playfair Display, Georgia, serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.25rem', lineHeight: '1.2' },
      h2: { fontSize: '1.75rem', lineHeight: '1.3' },
      h3: { fontSize: '1.375rem', lineHeight: '1.4' },
      h4: { fontSize: '1.125rem', lineHeight: '1.5' },
    },
  },

  defaultRadius: 'md',
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },

  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },

  shadows: {
    xs: '0 1px 3px rgba(0,0,0,0.05)',
    sm: '0 1px 5px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
    md: '0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
    lg: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
    xl: '0 16px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
  },

  breakpoints: {
    xs: '30em',
    sm: '48em',
    md: '64em',
    lg: '80em',
    xl: '96em',
  },

  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 600,
          letterSpacing: '0.01em',
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
        padding: 'lg',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Input: {
      styles: {
        input: {
          borderRadius: '8px',
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
        centered: true,
        overlayProps: {
          blur: 3,
          opacity: 0.4,
        },
      },
    },
    Notification: {
      defaultProps: {
        radius: 'md',
      },
    },
    NavLink: {
      styles: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
        },
      },
    },
    AppShell: {
      styles: {
        navbar: {
          borderRight: '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
        },
        header: {
          borderBottom: '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
        },
      },
    },
    Table: {
      defaultProps: {
        striped: true,
        highlightOnHover: true,
        withTableBorder: false,
        withColumnBorders: false,
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
      },
    },
    Tabs: {
      defaultProps: {
        radius: 'md',
      },
    },
    Tooltip: {
      defaultProps: {
        radius: 'sm',
        withArrow: true,
        arrowSize: 6,
      },
    },
  },
});
