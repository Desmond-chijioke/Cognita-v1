import { Box, Group, Text, Image } from '@mantine/core';
import cognitaLogo from '../../assets/cognita-logo.png';

export default function Footer() {
  return (
    <Box
      component="footer"
      style={{
        borderTop: '1px solid var(--mantine-color-gray-2)',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <Group justify="center" gap="xs" mb="xs">
        <Image src={cognitaLogo} alt="Cognita" w={24} h={24} style={{ objectFit: 'contain' }} />
        <Text fw={600} style={{ fontFamily: 'Playfair Display, serif' }}>Cognita</Text>
      </Group>
      <Text size="sm" c="dimmed">© 2026 Cognita. The Research Operating System.</Text>
    </Box>
  );
}
