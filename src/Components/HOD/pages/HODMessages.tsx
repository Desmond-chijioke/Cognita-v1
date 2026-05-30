import { Box, Title, Text } from '@mantine/core';
import MessagingPanel from '../../shared/MessagingPanel';
import type { MsgContact } from '../../shared/MessagingPanel';

const CONTACTS: MsgContact[] = [
  { id: '1', name: 'Prof. Elena Vasquez', role: 'Supervisor', color: 'violet', online: true,  lastMessage: 'Student progress looks good.', lastTime: '11:05', unread: 1 },
  { id: '2', name: 'Dr. Sarah Chen',      role: 'Supervisor', color: 'teal',   online: false, lastMessage: 'I have updated the review.', lastTime: 'Yesterday' },
  { id: '3', name: 'Dr. Kwame Asante',   role: 'PhD Student', color: 'orange', online: true,  lastMessage: 'Can I get an extension?', lastTime: '09:40', unread: 3 },
  { id: '4', name: 'Dr. Ibrahim Musa',   role: 'PhD Student', color: 'blue',   online: false, lastMessage: 'Thank you for the feedback.', lastTime: 'Mon' },
];

export default function HODMessages() {
  return (
    <Box p="xl" style={{ height: '100%' }}>
      <Box mb="lg">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Messages</Title>
        <Text size="sm" c="dimmed">Communicate with supervisors and students in your department.</Text>
      </Box>
      <MessagingPanel contacts={CONTACTS} currentUserName="Head of Department" />
    </Box>
  );
}
