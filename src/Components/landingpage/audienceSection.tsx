import { Box, SimpleGrid, Text, Title, ThemeIcon, Paper } from '@mantine/core';
import { FiUsers } from 'react-icons/fi';
import { MdSchool, MdOutlineAccountBalance } from 'react-icons/md';
import { TbFlask } from 'react-icons/tb';

const audiences = [
  {
    icon: MdSchool,
    title: 'Undergraduate & Postgraduate Students',
    desc: 'Structure your thesis, run analysis, and check integrity — all in one workspace.',
    hoverBg: 'rgba(59,91,219,0.06)',
  },
  {
    icon: TbFlask,
    title: 'Academic Researchers',
    desc: 'Manage the full lifecycle from literature review to publication-ready manuscripts.',
    hoverBg: 'rgba(147,51,234,0.06)',
  },
  {
    icon: FiUsers,
    title: 'Supervisors & Research Groups',
    desc: 'Monitor progress, review integrity reports, and provide contextual feedback.',
    hoverBg: 'rgba(16,185,129,0.06)',
  },
  {
    icon: MdOutlineAccountBalance,
    title: 'Universities & Institutions',
    desc: 'Govern research output, track AI usage, and ensure compliance at scale.',
    hoverBg: 'rgba(245,158,11,0.06)',
  },
];

export default function AudienceSection() {
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
          Who It's For
          <span style={{ display: 'inline-block', height: 1, width: 32, background: 'var(--mantine-color-brand-4)', verticalAlign: 'middle' }} />
        </Text>
        <Title
          order={2}
          style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', letterSpacing: '-0.02em', lineHeight: 1.15 }}
        >
          Built for Every{' '}
          <Text
            component="span"
            style={{
              background: 'linear-gradient(135deg, var(--mantine-color-brand-6), var(--mantine-color-accent-5))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Research Role
          </Text>
        </Title>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {audiences.map((a) => (
          <Paper
            key={a.title}
            withBorder
            radius="xl"
            p="xl"
            style={{
              display: 'flex',
              gap: '1.25rem',
              overflow: 'hidden',
              position: 'relative',
              transition: 'box-shadow 0.2s, transform 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(59,91,219,0.12)';
              (e.currentTarget as HTMLElement).style.background = a.hoverBg;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '';
              (e.currentTarget as HTMLElement).style.background = '';
            }}
          >
            <ThemeIcon
              size={56}
              radius="xl"
              variant="gradient"
              gradient={{ from: 'accent.3', to: 'accent.1' }}
              style={{ color: 'var(--mantine-color-brand-7)', flexShrink: 0 }}
            >
              <a.icon size={24} />
            </ThemeIcon>
            <Box>
              <Text fw={600} size="lg" mb={6} style={{ fontFamily: 'Playfair Display, serif' }}>
                {a.title}
              </Text>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                {a.desc}
              </Text>
            </Box>
          </Paper>
        ))}
      </SimpleGrid>
    </Box>
  );
}
