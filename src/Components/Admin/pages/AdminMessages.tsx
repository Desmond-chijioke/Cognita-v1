import { Box, Title, Text } from '@mantine/core';
import MessagingPanel from '../../shared/MessagingPanel';
import type { MsgContact } from '../../shared/MessagingPanel';

const CONTACTS: MsgContact[] = [
  { id: '1', name: 'Dr. Emeka Nwosu',   role: 'Head of Department', color: 'blue',   online: true,  lastMessage: 'The department report is ready.', lastTime: '10:32', unread: 2 },
  { id: '2', name: 'Dr. Halima Bello',  role: 'Head of Department', color: 'grape',  online: false, lastMessage: 'I will send the updated list.', lastTime: 'Yesterday' },
  { id: '3', name: 'Prof. Chukwu Dike', role: 'Head of Department', color: 'teal',   online: true,  lastMessage: 'Please review the new intake.', lastTime: '09:15', unread: 1 },
  { id: '4', name: 'Prof. Elena Vasquez', role: 'Supervisor',       color: 'violet', online: false, lastMessage: 'Student feedback attached.', lastTime: 'Mon' },
  { id: '5', name: 'Dr. Kwame Asante',  role: 'PhD Student',        color: 'orange', online: true,  lastMessage: 'Thank you for the approval.', lastTime: '08:50' },
];

export default function AdminMessages() {
  return (
    <Box p="xl" style={{ height: '100%' }}>
      <Box mb="lg">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Messages</Title>
        <Text size="sm" c="dimmed">Communicate with HoDs, supervisors, and students.</Text>
      </Box>
      <MessagingPanel contacts={CONTACTS} currentUserName="Director of Research" />
    </Box>
  );
}
