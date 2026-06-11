import { Box, Text, Title } from '@mantine/core';
import MessagingPanel from '../../shared/MessagingPanel';

export default function FacultyMessages() {
  return (
    <Box p="xl" style={{ height: '100%' }}>
      <Box mb="lg">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Messages</Title>
        <Text size="sm" c="dimmed">Communicate with HODs, supervisors and students in your faculty.</Text>
      </Box>
      <MessagingPanel />
    </Box>
  );
}
