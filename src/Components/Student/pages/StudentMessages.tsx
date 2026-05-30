import { useEffect, useRef, useState } from 'react';
import {
  Avatar, Box, Button, Group, Paper, Text, Textarea,
} from '@mantine/core';
import { LuSend } from 'react-icons/lu';
import { MESSAGES, STUDENT_PROFILE } from '../studentData';
import type { Message } from '../studentData';

// ── helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function StudentMessages() {
  const [messages, setMessages]       = useState<Message[]>(MESSAGES);
  const [newMessage, setNewMessage]   = useState('');
  const messagesEndRef                = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const text = newMessage.trim();
    if (!text) return;
    const msg: Message = {
      id:         `m${Date.now()}`,
      from:       'student',
      authorName: STUDENT_PROFILE.name,
      text,
      time:       'Just now',
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Box p="xl">
      <Paper
        withBorder
        radius="md"
        bg="white"
        style={{
          height: 'calc(100vh - 160px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >

        {/* ── Header ── */}
        <Box
          px="lg"
          py="md"
          style={{
            flexShrink: 0,
            borderBottom: '1px solid #f1f3f5',
            background: 'linear-gradient(135deg, #edf2ff 0%, #f8f9fe 100%)',
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="md" wrap="nowrap">
              <Box style={{ position: 'relative' }}>
                <Avatar color="brand" radius="xl" size="md">
                  {getInitials('Adebayo Ogundimu')}
                </Avatar>
                <Box
                  style={{
                    position: 'absolute', bottom: 1, right: 1,
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#2f9e44', border: '2px solid white',
                  }}
                />
              </Box>
              <Box>
                <Text fw={700} size="sm" lh={1.2}>Dr. Adebayo Ogundimu</Text>
                <Text size="xs" c="dimmed">Supervisor · University of Lagos</Text>
              </Box>
            </Group>
            <Group gap={6}>
              <Box
                style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#2f9e44',
                }}
              />
              <Text size="xs" c="green" fw={500}>Online</Text>
            </Group>
          </Group>
        </Box>

        {/* ── Messages area ── */}
        <Box
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {messages.map(msg => {
            const isStudent = msg.from === 'student';
            return (
              <Box
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: isStudent ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  gap: 10,
                }}
              >
                <Avatar
                  color={isStudent ? 'blue' : 'brand'}
                  radius="xl"
                  size="sm"
                  style={{ flexShrink: 0 }}
                >
                  {getInitials(msg.authorName)}
                </Avatar>

                <Box style={{ maxWidth: '68%' }}>
                  <Text
                    size="xs"
                    c="dimmed"
                    mb={3}
                    style={{ textAlign: isStudent ? 'right' : 'left' }}
                  >
                    {msg.authorName}
                  </Text>
                  <Box
                    style={{
                      background: isStudent ? '#3b5bdb' : '#f1f3f5',
                      color: isStudent ? '#fff' : '#212529',
                      borderRadius: isStudent
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                      padding: '10px 14px',
                    }}
                  >
                    <Text size="sm" lh={1.55} style={{ wordBreak: 'break-word' }}>
                      {msg.text}
                    </Text>
                  </Box>
                  <Text
                    size="xs"
                    c="dimmed"
                    mt={3}
                    style={{ textAlign: isStudent ? 'right' : 'left' }}
                  >
                    {msg.time}
                  </Text>
                </Box>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Box>

        {/* ── Input area ── */}
        <Box
          px="lg"
          py="md"
          style={{
            flexShrink: 0,
            borderTop: '1px solid #f1f3f5',
            background: '#fafafa',
          }}
        >
          <Group gap="sm" align="flex-end" wrap="nowrap">
            <Textarea
              style={{ flex: 1 }}
              placeholder="Write a message… (Enter to send, Shift+Enter for new line)"
              value={newMessage}
              onChange={e => setNewMessage(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              autosize
              minRows={2}
              maxRows={5}
              radius="md"
              styles={{ input: { resize: 'none' } }}
            />
            <Button
              color="brand"
              radius="md"
              px="md"
              h={42}
              disabled={!newMessage.trim()}
              onClick={handleSend}
              leftSection={<LuSend size={15} />}
            >
              Send
            </Button>
          </Group>
        </Box>

      </Paper>
    </Box>
  );
}
