import { Box, Title, Text } from '@mantine/core';
import MessagingPanel from '../../shared/MessagingPanel';
import type { MsgContact } from '../../shared/MessagingPanel';

const CONTACTS: MsgContact[] = [
  { id: '1', name: 'Dr. Kwame Asante', role: 'PhD Student', color: 'orange', online: true,  lastMessage: 'I have submitted chapter 3.', lastTime: '10:15', unread: 2 },
  { id: '2', name: 'Dr. Ibrahim Musa', role: 'PhD Student', color: 'blue',   online: false, lastMessage: 'Please check my methodology.', lastTime: 'Yesterday' },
  { id: '3', name: 'Dr. Fatima Hassan', role: 'PhD Student', color: 'indigo', online: true, lastMessage: 'The dataset is uploaded.', lastTime: '09:00' },
];

export default function SupervisorMessages() {
  return (
    <Box p="xl" style={{ height: '100%' }}>
      <Box mb="lg">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Messages</Title>
        <Text size="sm" c="dimmed">Communicate directly with your assigned students.</Text>
      </Box>
      <MessagingPanel contacts={CONTACTS} currentUserName="Supervisor" />
    </Box>
  );
}
