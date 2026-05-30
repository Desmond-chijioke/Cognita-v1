import { Box, SimpleGrid, Text, Title, ThemeIcon, Paper } from '@mantine/core';
import { FiBarChart2, FiTrendingUp, FiPieChart, FiGrid } from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

const capabilities = [
  { icon: FiBarChart2, title: 'Descriptive Statistics', desc: 'Mean, median, standard deviation, and frequency tables — generated instantly.' },
  { icon: FiTrendingUp, title: 'Inferential Tests', desc: 't-tests, ANOVA, chi-square, and more — no syntax required.' },
  { icon: FiPieChart, title: 'Regression & Correlation', desc: 'Linear and logistic regression with visual output and interpretation.' },
  { icon: FiGrid, title: 'Charts & Tables', desc: 'Publication-ready visuals that embed directly into your chapters.' },
  { icon: RiRobot2Line, title: 'AI Interpretation', desc: 'Plain-language explanations of your results, linked to your research questions.' },
];

export default function StatsAnalysisSection() {
  return (
    <Box
      component="section"
      style={{
        background: 'var(--mantine-color-brand-0)',
        borderTop: '1px solid var(--mantine-color-gray-2)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Box style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: '7rem 1.5rem' }}>
        <Box ta="center" mb="4rem">
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
            Built-In Statistical Analysis
            <span style={{ display: 'inline-block', height: 1, width: 32, background: 'var(--mantine-color-brand-4)', verticalAlign: 'middle' }} />
          </Text>
          <Title
            order={2}
            style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '1.25rem' }}
          >
            No Exporting. No SPSS.{' '}
            <Text
              component="span"
              style={{
                background: 'linear-gradient(135deg, var(--mantine-color-brand-6), var(--mantine-color-accent-5))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              No R Scripts.
            </Text>
          </Title>
          <Text c="dimmed" size="lg" maw={640} mx="auto" style={{ lineHeight: 1.7 }}>
            Run analyses inside Cognita and connect results directly to your writing and conclusions — without ever leaving the platform.
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {capabilities.map((c) => (
            <Paper
              key={c.title}
              withBorder
              radius="xl"
              p="xl"
              style={{
                overflow: 'hidden',
                position: 'relative',
                transition: 'box-shadow 0.2s, transform 0.2s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(59,91,219,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '';
              }}
            >
              <ThemeIcon
                size={48}
                radius="lg"
                mb="md"
                variant="gradient"
                gradient={{ from: 'accent.3', to: 'accent.1' }}
                style={{ color: 'var(--mantine-color-brand-7)' }}
              >
                <c.icon size={20} />
              </ThemeIcon>
              <Text fw={600} size="lg" mb={6} style={{ fontFamily: 'Playfair Display, serif' }}>
                {c.title}
              </Text>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                {c.desc}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
}
