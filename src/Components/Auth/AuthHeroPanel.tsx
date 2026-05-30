import { Box, Image, Stack, Text } from '@mantine/core';
import Logo from '../../assets/cognita-logo.png';
import heroBg from '../../assets/hero-bg.jpg';
import { fullyear } from './Login';

interface HeroFeature {
  text: string;
}

interface AuthHeroPanelProps {
  headline: string;
  subheadline: string;
  features: HeroFeature[];
  tagline?: string;
}

export default function AuthHeroPanel({
  headline,
  subheadline,
  features,
  tagline,
}: AuthHeroPanelProps) {
  return (
    <Box
      visibleFrom="md"
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
      }}
    >
      {/* Background image */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Brand overlay */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(160deg, rgba(30,58,138,0.88) 0%, rgba(47,74,194,0.82) 50%, rgba(12,133,153,0.78) 100%)',
        }}
      />

      {/* Glow orbs */}
      <Box
        style={{
          position: 'absolute',
          top: -80,
          left: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'rgba(147,197,253,0.15)',
          filter: 'blur(60px)',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: -80,
          right: -80,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(196,181,253,0.18)',
          filter: 'blur(60px)',
        }}
      />

      {/* Content */}
      <Box
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2.5rem',
        }}
      >
        {/* Logo top-left */}
        <Box style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Image
            src={Logo}
            alt="Cognita"
            w={40}
            h={40}
            style={{ objectFit: 'contain' }}
          />
          <Text
            fw={700}
            size="xl"
            c="white"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Cognita
          </Text>
        </Box>

        {/* Centre headline */}
        <Box>
          <Text
            c="white"
            fw={800}
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              fontFamily: 'Playfair Display, serif',
              lineHeight: 1.15,
              marginBottom: '0.75rem',
            }}
          >
            {headline}
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.7,
              maxWidth: 380,
              fontSize: '1rem',
              marginBottom: '2rem',
            }}
          >
            {subheadline}
          </Text>

          {/* Feature highlights */}
          <Stack gap="xs">
            {features.map((f) => (
              <Box
                key={f.text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  color: 'rgba(255,255,255,0.82)',
                  fontSize: '0.9rem',
                }}
              >
                <Box
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#93c5fd',
                    flexShrink: 0,
                  }}
                />
                {f.text}
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Bottom tagline */}
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
          {tagline ?? `© ${fullyear()} Cognita · Academic Research Platform`}
        </Text>
      </Box>
    </Box>
  );
}
