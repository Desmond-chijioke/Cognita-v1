import { Box, SimpleGrid, Text, Title, ThemeIcon, Paper } from '@mantine/core';
import { FiLogIn, FiDatabase } from 'react-icons/fi';
import { RiBrainLine, RiFlowChart } from 'react-icons/ri';

const pillars = [
  { icon: FiLogIn, title: 'One Login', desc: 'Access every research capability from a single account.' },
  { icon: RiBrainLine, title: 'One Research Memory', desc: 'Your notes, data, and citations share context automatically.' },
  { icon: RiFlowChart, title: 'One Workflow', desc: 'From literature review to final submission — no tab switching.' },
  { icon: FiDatabase, title: 'One Source of Truth', desc: 'Analysis, writing, and integrity checks live together.' },
];

export default function SolutionSection() {
  return (
    <Box
      component="section"
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2f4ac2 50%, #0c8599 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow orbs */}
      <Box style={{ position: 'absolute', top: -96, left: -96, height: 384, width: 384, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(60px)' }} />
      <Box style={{ position: 'absolute', bottom: -96, right: -96, height: 384, width: 384, borderRadius: '50%', background: 'rgba(100,60,200,0.25)', filter: 'blur(60px)' }} />

      <Box style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: '7rem 1.5rem' }}>
        <Box ta="center" mb="4rem">
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            style={{
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.6)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <span style={{ display: 'inline-block', height: 1, width: 32, background: 'rgba(255,255,255,0.3)', verticalAlign: 'middle' }} />
            The Solution
            <span style={{ display: 'inline-block', height: 1, width: 32, background: 'rgba(255,255,255,0.3)', verticalAlign: 'middle' }} />
          </Text>
          <Title
            order={2}
            c="white"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '1.25rem' }}
          >
            Seven Tools.{' '}
            <Text
              component="span"
              style={{
                background: 'linear-gradient(135deg, #93c5fd, #c4b5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              One Cognita.
            </Text>
          </Title>
          <Text
            maw={640}
            mx="auto"
            size="lg"
            style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}
          >
            Cognita replaces fragmented research tooling with a single, academic-grade operating system that covers the entire lifecycle — from idea to publication.
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {pillars.map((p) => (
            <Paper
              key={p.title}
              radius="xl"
              p="xl"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
                transition: 'background 0.2s, transform 0.2s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              <ThemeIcon
                size={48}
                radius="lg"
                mb="md"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <p.icon size={20} />
              </ThemeIcon>
              <Text fw={600} size="lg" c="white" mb={6} style={{ fontFamily: 'Playfair Display, serif' }}>
                {p.title}
              </Text>
              <Text size="sm" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                {p.desc}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
}
