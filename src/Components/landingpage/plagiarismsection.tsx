import { Box, SimpleGrid, Text, Title, ThemeIcon, Paper, Center } from '@mantine/core';
import { FiSearch, FiEye, FiList } from 'react-icons/fi';
import { MdOutlineVerifiedUser } from 'react-icons/md';
import { VscGitCompare } from 'react-icons/vsc';

const features = [
  { icon: FiSearch, title: 'Similarity Checking', desc: 'Scan your work against millions of academic sources and publications.' },
  { icon: MdOutlineVerifiedUser, title: 'Citation-Aware Detection', desc: 'Distinguishes properly cited passages from uncited similarities.' },
  { icon: FiList, title: 'Section-by-Section Reports', desc: 'Granular reports per chapter and section — not just a single score.' },
  { icon: FiEye, title: 'Supervisor Visibility', desc: 'Supervisors can review integrity reports alongside the manuscript.' },
  { icon: VscGitCompare, title: 'Revision Tracking', desc: 'Track how originality improves across drafts over time.' },
];

export default function PlagiarismSection() {
  return (
    <Box
      component="section"
      style={{ maxWidth: 1100, margin: '0 auto', padding: '7rem 1.5rem' }}
    >
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
          Academic Integrity
          <span style={{ display: 'inline-block', height: 1, width: 32, background: 'var(--mantine-color-brand-4)', verticalAlign: 'middle' }} />
        </Text>

        <Center mb="lg">
          <ThemeIcon
            size={64}
            radius="xl"
            variant="gradient"
            gradient={{ from: 'brand.7', to: 'accent.6', deg: 135 }}
          >
            <MdOutlineVerifiedUser size={32} />
          </ThemeIcon>
        </Center>

        <Title
          order={2}
          style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '1.25rem' }}
        >
          Build{' '}
          <Text
            component="span"
            style={{
              background: 'linear-gradient(135deg, var(--mantine-color-brand-6), var(--mantine-color-accent-5))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Originality
          </Text>{' '}
          Into Your Writing
        </Title>
        <Text c="dimmed" size="lg" maw={640} mx="auto" style={{ lineHeight: 1.7 }}>
          Cognita doesn't just check for plagiarism after the fact — it helps you write with integrity from the start.
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {features.map((f) => (
          <Paper
            key={f.title}
            withBorder
            radius="xl"
            p="xl"
            style={{
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
              <f.icon size={20} />
            </ThemeIcon>
            <Text fw={600} size="lg" mb={6} style={{ fontFamily: 'Playfair Display, serif' }}>
              {f.title}
            </Text>
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
              {f.desc}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>
    </Box>
  );
}
