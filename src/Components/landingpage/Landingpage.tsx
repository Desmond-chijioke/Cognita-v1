import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Group, Text, Title, Image, Modal,
  Center, ThemeIcon, Stack,
} from '@mantine/core';
import { FiArrowRight, FiPlay } from 'react-icons/fi';
import { BsStars } from 'react-icons/bs';

import ProblemSection from './problemscetion';
import SolutionSection from './solutionsection';
import ToolsReplacedSection from './toolsreplacedsection';
import StatsAnalysisSection from './StatsAnalysisSection';
import PlagiarismSection from './plagiarismsection';
import ComparisonQuotesSection from './comparisonqoutesection';
import AudienceSection from './audienceSection';
import PricingSection from './pricingsection';
import Footer from './footer';

import cognitaLogo from '../../assets/cognita-logo.png';
import heroBg from '../../assets/hero-bg.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <Box style={{ minHeight: '100vh', background: 'white' }}>

      {/* ── Navbar ── */}
      <Box
        component="nav"
        style={{
          height: 56,
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
        }}
      >
        <Group gap="xs">
          <Image src={cognitaLogo} alt="Cognita" w={36} h={36} style={{ objectFit: 'contain' }} />
          <Text fw={700} size="lg" style={{ fontFamily: 'Playfair Display, serif' }}>Cognita</Text>
        </Group>
        <Group gap="xs">
          <Button variant="subtle" color="brand" size="sm" onClick={() => navigate('/login')}>
            Log in
          </Button>
          <Button color="brand" size="sm" onClick={() => navigate('/signup')}>
            Get Started
          </Button>
        </Group>
      </Box>

      {/* ── Hero ── */}
      <Box
        component="section"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2f4ac2 45%, #0c8599 100%)',
        }}
      >
        {/* Hero image overlay */}
        <Box
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.12,
          }}
        />
        {/* Glow orbs */}
        <Box style={{ position: 'absolute', top: 80, left: -128, height: 384, width: 384, borderRadius: '50%', background: 'rgba(100,200,255,0.18)', filter: 'blur(80px)' }} />
        <Box style={{ position: 'absolute', bottom: 40, right: -128, height: 480, width: 480, borderRadius: '50%', background: 'rgba(140,80,220,0.22)', filter: 'blur(80px)' }} />
        <Box style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(30,58,138,0.4) 100%)' }} />

        <Box style={{ position: 'relative', maxWidth: 860, margin: '0 auto', textAlign: 'center', padding: '8rem 1.5rem 9rem' }}>

          {/* Badge */}
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 1rem',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '1.5rem',
            }}
          >
            <BsStars size={16} color="#93c5fd" />
            The Research Operating System
          </Box>

          <Title
            order={1}
            c="white"
            style={{
              fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              marginBottom: '1.5rem',
            }}
          >
            The Complete Research{' '}
            <Text
              component="span"
              style={{
                display: 'block',
                marginTop: '0.5rem',
                background: 'linear-gradient(135deg, #93c5fd, #c4b5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Operating System
            </Text>
          </Title>

          <Text
            size="xl"
            style={{ color: 'rgba(255,255,255,0.8)', maxWidth: 620, margin: '0 auto 2.5rem', lineHeight: 1.7 }}
          >
            Cognita unifies research intelligence, statistical analysis, and plagiarism checking into one academic-grade system — from idea to publication.
          </Text>

          <Group justify="center" gap="md">
            <Button
              size="lg"
              radius="md"
              style={{
                background: 'white',
                color: 'var(--mantine-color-brand-8)',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '0 2rem',
                height: 48,
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
              }}
              rightSection={<FiArrowRight />}
              onClick={() => navigate('/signup')}
            >
              Get Started
            </Button>
            <Button
              size="lg"
              radius="md"
              variant="outline"
              style={{
                borderColor: 'rgba(255,255,255,0.4)',
                color: 'white',
                fontWeight: 600,
                fontSize: '1rem',
                padding: '0 2rem',
                height: 48,
              }}
              leftSection={<FiPlay />}
              onClick={() => setDemoOpen(true)}
            >
              See How It Works
            </Button>
          </Group>

          {/* Trust row */}
          <Box style={{ marginTop: '3.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Text size="xs" tt="uppercase" style={{ letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)', marginBottom: '1rem' }}>
              Trusted by researchers across
            </Text>
            <Group justify="center" gap="lg" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', fontWeight: 500 }}>
              <span>Universities</span>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
              <span>Research Institutes</span>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
              <span>Postgraduate Programs</span>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
              <span>Academic Journals</span>
            </Group>
          </Box>
        </Box>
      </Box>

      {/* ── Demo Modal ── */}
      <Modal
        opened={demoOpen}
        onClose={() => setDemoOpen(false)}
        title="See Cognita in Action"
        size="lg"
        radius="lg"
      >
        <Box
          style={{
            aspectRatio: '16/9',
            background: 'var(--mantine-color-gray-1)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Center>
            <Stack align="center" gap="xs">
              <ThemeIcon size={56} radius="xl" variant="light" color="brand">
                <FiPlay size={24} />
              </ThemeIcon>
              <Text fw={500} c="dimmed">Demo Video Placeholder</Text>
            </Stack>
          </Center>
        </Box>
      </Modal>

      {/* ── Sections ── */}
      <ProblemSection />
      <SolutionSection />
      <ToolsReplacedSection />
      <StatsAnalysisSection />
      <PlagiarismSection />
      <ComparisonQuotesSection />
      <AudienceSection />
      <PricingSection />

      {/* ── Final CTA ── */}
      <Box
        component="section"
        style={{ maxWidth: 760, margin: '0 auto', padding: '6rem 1.5rem', textAlign: 'center' }}
      >
        <Title order={2} style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
          Stop Switching Tools. Start Finishing Research.
        </Title>
        <Text c="dimmed" maw={480} mx="auto" mb="xl">
          Join thousands of researchers using Cognita to write better, faster.
        </Text>
        <Button
          size="lg"
          color="brand"
          radius="md"
          rightSection={<FiArrowRight />}
          style={{ padding: '0 2.5rem', height: 48, fontSize: '1rem' }}
          onClick={() => navigate('/signup')}
        >
          Build Your Research in Cognita
        </Button>
      </Box>

      <Footer />
    </Box>
  );
}
