import { useEffect, useRef, useState } from 'react';
import {
  ActionIcon, Avatar, Badge, Box, Group, Paper,
  ScrollArea, Stack, Text, TextInput,
} from '@mantine/core';
import { LuSearch, LuSend, LuCircle } from 'react-icons/lu';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MsgContact {
  id: string;
  name: string;
  role: string;
  color?: string;
  online?: boolean;
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isOwn: boolean;
}

interface Props {
  contacts: MsgContact[];
  currentUserName: string;
}

// ── Seed mock conversation per contact ────────────────────────────────────────

function seedMessages(contactId: string, contactName: string): Message[] {
  return [
    { id: '1', senderId: contactId, text: `Hi! How are you progressing with your work?`, time: '09:10', isOwn: false },
    { id: '2', senderId: 'me', text: 'Going well, thank you! I just finished the literature review section.', time: '09:12', isOwn: true },
    { id: '3', senderId: contactId, text: `Great to hear. Please send it over when you are ready for review.`, time: '09:15', isOwn: false },
    { id: '4', senderId: 'me', text: 'Will do. Should have it ready by end of today.', time: '09:16', isOwn: true },
  ];
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function MessagingPanel({ contacts, currentUserName }: Props) {
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(contacts[0]?.id ?? null);
  const [threads, setThreads] = useState<Record<string, Message[]>>(() => {
    const map: Record<string, Message[]> = {};
    contacts.forEach(c => { map[c.id] = seedMessages(c.id, c.name); });
    return map;
  });
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeContact = contacts.find(c => c.id === activeId) ?? null;
  const messages = activeId ? (threads[activeId] ?? []) : [];

  const filtered = search
    ? contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, messages.length]);

  const sendMessage = () => {
    if (!draft.trim() || !activeId) return;
    const msg: Message = {
      id: crypto.randomUUID(),
      senderId: 'me',
      text: draft.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };
    setThreads(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), msg] }));
    setDraft('');
  };

  return (
    <Box style={{ display: 'flex', height: 'calc(100vh - 96px)', gap: 0 }}>

      {/* ── Left: contact list ── */}
      <Paper
        withBorder
        radius="md"
        style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <Box p="sm" style={{ borderBottom: '1px solid #f1f3f5' }}>
          <Text fw={700} size="sm" mb="xs">Messages</Text>
          <TextInput
            placeholder="Search contacts..."
            leftSection={<LuSearch size={14} />}
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            size="sm"
          />
        </Box>

        <ScrollArea style={{ flex: 1 }}>
          {filtered.map(contact => (
            <Box
              key={contact.id}
              onClick={() => setActiveId(contact.id)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                background: activeId === contact.id ? 'var(--mantine-color-brand-0)' : 'transparent',
                borderLeft: activeId === contact.id ? '3px solid var(--mantine-color-brand-6)' : '3px solid transparent',
                transition: 'background 0.15s',
              }}
            >
              <Group gap="sm" wrap="nowrap">
                <Box style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar color={contact.color ?? 'brand'} radius="xl" size={38}>
                    {getInitials(contact.name)}
                  </Avatar>
                  {contact.online && (
                    <Box
                      style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 10, height: 10, borderRadius: '50%',
                        background: '#2f9e44', border: '2px solid white',
                      }}
                    />
                  )}
                </Box>

                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" fw={600} truncate>{contact.name}</Text>
                    {contact.lastTime && (
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>{contact.lastTime}</Text>
                    )}
                  </Group>
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
                      {contact.lastMessage ?? 'No messages yet'}
                    </Text>
                    {(contact.unread ?? 0) > 0 && (
                      <Badge size="xs" circle color="brand">{contact.unread}</Badge>
                    )}
                  </Group>
                </Box>
              </Group>
            </Box>
          ))}

          {filtered.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" p="xl">No contacts found</Text>
          )}
        </ScrollArea>
      </Paper>

      {/* ── Right: chat thread ── */}
      {activeContact ? (
        <Paper
          withBorder
          radius="md"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginLeft: 12 }}
        >
          {/* Chat header */}
          <Box
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid #f1f3f5',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Box style={{ position: 'relative' }}>
              <Avatar color={activeContact.color ?? 'brand'} radius="xl" size={40}>
                {getInitials(activeContact.name)}
              </Avatar>
              {activeContact.online && (
                <Box
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#2f9e44', border: '2px solid white',
                  }}
                />
              )}
            </Box>
            <Box>
              <Text fw={700} size="sm">{activeContact.name}</Text>
              <Group gap={4}>
                <LuCircle
                  size={8}
                  fill={activeContact.online ? '#2f9e44' : '#adb5bd'}
                  color={activeContact.online ? '#2f9e44' : '#adb5bd'}
                />
                <Text size="xs" c="dimmed">
                  {activeContact.online ? 'Online' : 'Offline'} · {activeContact.role}
                </Text>
              </Group>
            </Box>
          </Box>

          {/* Messages */}
          <ScrollArea style={{ flex: 1, padding: '16px 20px' }}>
            <Stack gap="xs" p="md">
              {messages.map(msg => (
                <Box
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.isOwn ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box style={{ maxWidth: '72%' }}>
                    <Box
                      style={{
                        padding: '10px 14px',
                        borderRadius: msg.isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: msg.isOwn
                          ? 'var(--mantine-color-brand-6)'
                          : 'var(--mantine-color-gray-1)',
                        color: msg.isOwn ? 'white' : 'var(--mantine-color-dark-7)',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {msg.text}
                    </Box>
                    <Text
                      size="xs"
                      c="dimmed"
                      mt={2}
                      style={{ textAlign: msg.isOwn ? 'right' : 'left' }}
                    >
                      {msg.time}
                    </Text>
                  </Box>
                </Box>
              ))}
              <div ref={bottomRef} />
            </Stack>
          </ScrollArea>

          {/* Input */}
          <Box style={{ padding: '12px 16px', borderTop: '1px solid #f1f3f5' }}>
            <Group gap="sm">
              <TextInput
                style={{ flex: 1 }}
                placeholder={`Message ${activeContact.name}…`}
                value={draft}
                onChange={e => setDraft(e.currentTarget.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                radius="xl"
                size="md"
              />
              <ActionIcon
                size="lg"
                radius="xl"
                color="brand"
                variant="filled"
                onClick={sendMessage}
                disabled={!draft.trim()}
                aria-label="Send message"
              >
                <LuSend size={16} />
              </ActionIcon>
            </Group>
          </Box>
        </Paper>
      ) : (
        <Paper
          withBorder
          radius="md"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}
        >
          <Stack align="center" gap="xs">
            <LuSend size={32} color="#adb5bd" />
            <Text c="dimmed" size="sm">Select a contact to start messaging</Text>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
