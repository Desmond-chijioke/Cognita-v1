import { Box, SimpleGrid, Text, Title, ThemeIcon, Paper } from '@mantine/core';
import { BsJournalText } from 'react-icons/bs';
import { FiBookOpen, FiBarChart2, FiFileText, FiUsers, FiAlertCircle } from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

const problems = [
  { icon: BsJournalText, label: 'Notes & workspace' },
  { icon: FiBookOpen, label: 'Citations & references' },
  { icon: RiRobot2Line, label: 'AI explanations' },
  { icon: FiBarChart2, label: 'Statistical analysis' },
  { icon: FiAlertCircle, label: 'Plagiarism checking' },
  { icon: FiFileText, label: 'Academic writing' },
  { icon: FiUsers, label: 'Supervision & feedback' },
];

export default function ProblemSection() {
  return (
    <Box
      component="section"
      style={{ maxWidth: 1100, margin: '0 auto', padding: '6rem 1.5rem' }}
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
          The Problem
          <span style={{ display: 'inline-block', height: 1, width: 32, background: 'var(--mantine-color-brand-4)', verticalAlign: 'middle' }} />
        </Text>
        <Title
          order={2}
          style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '1rem' }}
        >
          Research Shouldn't Require{' '}
          <Text
            component="span"
            style={{
              background: 'linear-gradient(135deg, var(--mantine-color-brand-6), var(--mantine-color-accent-5))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Seven Different Tools
          </Text>
        </Title>
        <Text c="dimmed" size="lg" maw={640} mx="auto" style={{ lineHeight: 1.7 }}>
          Today's researchers juggle disconnected software for every stage of their work — creating fragmentation, context switching, and cognitive overload.
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
        {problems.map((p) => (
          <Paper
            key={p.label}
            withBorder
            radius="xl"
            p="xl"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              textAlign: 'center',
              transition: 'box-shadow 0.2s, transform 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
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
              style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}
            >
              <p.icon size={20} />
            </ThemeIcon>
            <Text size="sm" fw={500}>{p.label}</Text>
          </Paper>
        ))}
        <Paper
          withBorder
          radius="xl"
          p="xl"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderStyle: 'dashed',
            background: 'transparent',
          }}
        >
          <Text size="sm" c="dimmed" fs="italic">…and more fragmentation</Text>
        </Paper>
      </SimpleGrid>
    </Box>
  );
}
