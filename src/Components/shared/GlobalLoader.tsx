import { Box, Text } from '@mantine/core';
import cognitaLogo from '../../assets/cognita-logo.png';

const SPIN_STYLE = `
@keyframes _cognita_spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

interface Props {
  message?: string;
}

export default function GlobalLoader({ message = 'Loading your workspace…' }: Props) {
  return (
    <>
      <style>{SPIN_STYLE}</style>
      <Box
        style={{
          position:       'fixed',
          inset:          0,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          background:     '#ffffff',
          zIndex:         9999,
        }}
      >
        {/* Brand logo */}
        <img
          src={cognitaLogo}
          alt="Cognita AI"
          style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 36 }}
        />

        {/* Spinning ring */}
        <div
          style={{
            width:        48,
            height:       48,
            borderRadius: '50%',
            border:       '4px solid #e9ecef',
            borderTop:    '4px solid var(--mantine-color-brand-6, #3b5bdb)',
            animation:    '_cognita_spin 0.85s linear infinite',
          }}
        />

        {/* Status message */}
        <Text size="sm" c="dimmed" mt={28} fw={500} style={{ letterSpacing: '0.01em' }}>
          {message}
        </Text>
      </Box>
    </>
  );
}
