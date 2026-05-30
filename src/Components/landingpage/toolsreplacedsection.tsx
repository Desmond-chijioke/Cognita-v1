import { Box, Text, Title, Paper, Group, ThemeIcon } from '@mantine/core';
import { FiArrowRight } from 'react-icons/fi';

const replacements = [
  { legacy: 'Notes & Workspace', cognita: 'Cognita Research Memory' },
  { legacy: 'Citation Manager', cognita: 'Native Referencing System' },
  { legacy: 'AI Research Assistant', cognita: 'Context-Aware AI' },
  { legacy: 'Writing Software', cognita: 'Research-Aware Editor' },
  { legacy: 'Plagiarism Checker (Turnitin)', cognita: 'Built-in Originality Engine' },
  { legacy: 'Statistical Software (SPSS / SAS)', cognita: 'Integrated Statistical Analysis' },
  { legacy: 'Programming Tools (R)', cognita: 'Guided Analytical Workflows' },
];

export default function ToolsReplacedSection() {
  return (
    <Box
      component="section"
      style={{ maxWidth: 1100, margin: '0 auto', padding: '7rem 1.5rem' }}
    >
      <Box ta="center" mb="3.5rem">
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          style={{
            letterSpacing: '0.12em',
            color: 'var(--mantine-color-brand-7)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          <span style={{ display: 'inline-block', height: 1, width: 32, background: 'var(--mantine-color-brand-4)', verticalAlign: 'middle' }} />
          Replace, Don't Add
          <span style={{ display: 'inline-block', height: 1, width: 32, background: 'var(--mantine-color-brand-4)', verticalAlign: 'middle' }} />
        </Text>
        <Title
          order={2}
          style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '1rem' }}
        >
          7 Tools Cognita{' '}
          <Text
            component="span"
            style={{
              background: 'linear-gradient(135deg, var(--mantine-color-brand-6), var(--mantine-color-accent-5))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Replaces
          </Text>
        </Title>
        <Text c="dimmed" size="lg" maw={540} mx="auto">
          Every capability you need — integrated natively, not bolted on.
        </Text>
      </Box>

      <Box style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {replacements.map((r, i) => (
          <Paper
            key={r.legacy}
            withBorder
            radius="lg"
            p="md"
            style={{ transition: 'box-shadow 0.2s, border-color 0.2s' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--mantine-color-brand-4)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(59,91,219,0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '';
              (e.currentTarget as HTMLElement).style.boxShadow = '';
            }}
          >
            <Group wrap="nowrap" gap="md">
              <Box
                style={{
                  height: 32, width: 32, borderRadius: 8,
                  background: 'var(--mantine-color-gray-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text size="xs" fw={700} c="dimmed">{String(i + 1).padStart(2, '0')}</Text>
              </Box>
              <Text size="sm" c="dimmed" style={{ flex: 1, textDecoration: 'line-through' }}>
                {r.legacy}
              </Text>
              <ThemeIcon
                size={32}
                radius="xl"
                variant="light"
                color="brand"
                style={{ flexShrink: 0 }}
              >
                <FiArrowRight size={14} />
              </ThemeIcon>
              <Text size="sm" fw={600} style={{ flex: 1 }}>
                {r.cognita}
              </Text>
            </Group>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
