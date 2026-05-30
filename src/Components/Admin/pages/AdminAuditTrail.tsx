import { Box, Title, Text } from '@mantine/core';

export default function AdminAuditTrail() {
  return (
    <Box p="xl">
      <Title order={2} mb={4}>Audit Trail</Title>
      <Text c="dimmed">Complete log of all system activity and changes.</Text>
    </Box>
  );
}
