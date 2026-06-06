import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionIcon, Avatar, Badge, Box, Group, Loader,
  Paper, ScrollArea, Stack, Text, TextInput,
} from '@mantine/core';
import { LuSearch, LuSend, LuCircle, LuMessageSquare } from 'react-icons/lu';
import { useAppSelector } from '../../Redux/hooks';
import { supabase } from '../../supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Contact {
  id:              string;
  name:            string;
  email:           string;
  role:            string;
  unread:          number;
  lastMessage?:    string;
  lastTime?:       string;   // formatted display string
  lastTimestamp?:  string;   // raw ISO for sorting
}

interface DBMessage {
  id:          string;
  sender_id:   string;
  receiver_id: string;
  text:        string;
  created_at:  string;
  read_at:     string | null;
}

interface Message extends DBMessage {
  isOwn: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const COLORS = ['blue', 'teal', 'violet', 'orange', 'grape', 'cyan', 'green', 'red'];
function roleColor(role: string) {
  let h = 0;
  for (const c of role) h = (h << 5) - h + c.charCodeAt(0);
  return COLORS[Math.abs(h) % COLORS.length];
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function MessagingPanel() {
  const user            = useAppSelector(s => s.auth.user);
  const myId          = user?.id           ?? '';
  const myName        = user?.name         ?? 'Me';
  const institutionId = user?.institutionId ?? '';

  const [contacts,        setContacts]        = useState<Contact[]>([]);
  const [messages,        setMessages]        = useState<Message[]>([]);
  const [activeId,        setActiveId]        = useState<string | null>(null);
  const [draft,           setDraft]           = useState('');
  const [search,          setSearch]          = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending,         setSending]         = useState(false);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const activeIdRef  = useRef<string | null>(null);

  // Keep ref in sync so realtime callback has latest activeId
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // ── 1. Load contacts — all users in same institution except self ──────────

  const loadContacts = useCallback(async () => {
    if (!myId || !institutionId) return;
    setLoadingContacts(true);

    type UserRow = { id: string; name: string; email: string; role: string };

    try {
      // Only return users that share the same institution_id — no fallbacks
      const { data } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('institution_id', institutionId)
        .neq('id', myId)
        .neq('role', 'Director of Research')
        .order('name');
      const users = (data ?? []) as unknown as UserRow[];

      if (!users.length) return;

      // For each contact: count unread + get last message (batched)
      const enriched = await Promise.all(users.map(async (u: UserRow) => {
        const [{ count: unread }, { data: last }] = await Promise.all([
          supabase.from('messages').select('*', { count: 'exact', head: true })
            .eq('sender_id', u.id).eq('receiver_id', myId).is('read_at', null),
          supabase.from('messages').select('text, created_at')
            .or(`and(sender_id.eq.${myId},receiver_id.eq.${u.id}),and(sender_id.eq.${u.id},receiver_id.eq.${myId})`)
            .order('created_at', { ascending: false }).limit(1),
        ]);
        const lastMsg = last?.[0];
        return {
          id:             u.id,
          name:           u.name,
          email:          u.email,
          role:           u.role,
          unread:         unread ?? 0,
          lastMessage:    lastMsg?.text,
          lastTime:       lastMsg ? fmtTime(lastMsg.created_at) : undefined,
          lastTimestamp:  lastMsg?.created_at,
        } as Contact;
      }));

      setContacts(enriched);
      // No auto-select — user must click a contact to open a chat
    } finally {
      setLoadingContacts(false);
    }
  }, [institutionId, myId]);

  // ── 2. Load messages for the active conversation ──────────────────────────

  const loadMessages = useCallback(async (contactId: string) => {
    if (!myId) return;
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, text, created_at, read_at')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true });

      setMessages((data ?? []).map(m => ({ ...m, isOwn: m.sender_id === myId })));

      // Mark received messages as read
      await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', contactId)
        .eq('receiver_id', myId)
        .is('read_at', null);

      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, unread: 0 } : c));
    } finally {
      setLoadingMessages(false);
    }
  }, [myId]);

  // ── 3. Send a message ─────────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !activeId || !myId || !institutionId) return;
    setDraft('');
    setSending(true);
    try {
      const { data: newMsg } = await supabase
        .from('messages')
        .insert({ institution_id: institutionId, sender_id: myId, receiver_id: activeId, text })
        .select()
        .single();

      if (newMsg) {
        setMessages(prev => [...prev, { ...newMsg, isOwn: true }]);
        setContacts(prev => prev.map(c => c.id === activeId
          ? { ...c, lastMessage: text, lastTime: fmtTime(newMsg.created_at), lastTimestamp: newMsg.created_at }
          : c));
      }
    } finally {
      setSending(false);
    }
  };

  // ── 4. Realtime — receive incoming messages instantly ─────────────────────

  useEffect(() => {
    if (!myId) return;

    const channel = supabase
      .channel(`inbox-${myId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `receiver_id=eq.${myId}`,
      }, payload => {
        const msg = payload.new as DBMessage;

        if (msg.sender_id === activeIdRef.current) {
          // Currently viewing this conversation — append and mark read
          setMessages(prev => [...prev, { ...msg, isOwn: false }]);
          supabase.from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id)
            .then(() => {});
        } else {
          // Background message — increment unread + update preview
          setContacts(prev => prev.map(c => c.id === msg.sender_id
            ? { ...c, unread: c.unread + 1, lastMessage: msg.text, lastTime: fmtTime(msg.created_at), lastTimestamp: msg.created_at }
            : c));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myId]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeContact = contacts.find(c => c.id === activeId) ?? null;

  // Sort: unread first, then by most recent message (raw ISO) descending
  const sorted = [...contacts].sort((a, b) => {
    if (b.unread !== a.unread) return b.unread - a.unread;
    const ta = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
    const tb = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
    return tb - ta;
  });

  const filtered = search
    ? sorted.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.role.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  const totalUnread = contacts.reduce((s, c) => s + c.unread, 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box style={{ display: 'flex', height: 'calc(100vh - 96px)', gap: 0 }}>

      {/* ── Left: contact list ── */}
      <Paper withBorder radius="md"
        style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <Box p="sm" style={{ borderBottom: '1px solid #f1f3f5' }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700} size="sm">Messages</Text>
            {totalUnread > 0 && (
              <Badge size="sm" color="brand" variant="filled">{totalUnread} unread</Badge>
            )}
          </Group>
          <TextInput
            placeholder="Search people…"
            leftSection={<LuSearch size={14} />}
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            size="sm"
          />
        </Box>

        <ScrollArea style={{ flex: 1 }}>
          {loadingContacts ? (
            <Box ta="center" py="xl"><Loader size="sm" color="brand" /></Box>
          ) : filtered.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" p="xl">
              {institutionId ? 'No contacts in your institution yet.' : 'Loading…'}
            </Text>
          ) : (
            filtered.map(contact => (
              <Box
                key={contact.id}
                onClick={() => setActiveId(contact.id)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  background: activeId === contact.id ? 'var(--mantine-color-brand-0)' : 'transparent',
                  borderLeft: activeId === contact.id ? '3px solid var(--mantine-color-brand-6)' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}
              >
                <Group gap="sm" wrap="nowrap">
                  <Avatar color={roleColor(contact.role)} radius="xl" size={38}>
                    {getInitials(contact.name)}
                  </Avatar>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={contact.unread > 0 ? 700 : 600} truncate>
                        {contact.name}
                      </Text>
                      {contact.lastTime && (
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>{contact.lastTime}</Text>
                      )}
                    </Group>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
                        {contact.lastMessage ?? contact.role}
                      </Text>
                      {contact.unread > 0 && (
                        <Badge size="xs" circle color="brand">{contact.unread}</Badge>
                      )}
                    </Group>
                  </Box>
                </Group>
              </Box>
            ))
          )}
        </ScrollArea>
      </Paper>

      {/* ── Right: chat thread ── */}
      {activeContact ? (
        <Paper withBorder radius="md"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginLeft: 12 }}>

          {/* Header */}
          <Box style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f5', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar color={roleColor(activeContact.role)} radius="xl" size={40}>
              {getInitials(activeContact.name)}
            </Avatar>
            <Box>
              <Text fw={700} size="sm">{activeContact.name}</Text>
              <Group gap={4}>
                <LuCircle size={8} color="#adb5bd" fill="#adb5bd" />
                <Text size="xs" c="dimmed">{activeContact.role} · {activeContact.email}</Text>
              </Group>
            </Box>
          </Box>

          {/* Messages */}
          <ScrollArea style={{ flex: 1, padding: '16px 20px' }}>
            {loadingMessages ? (
              <Box ta="center" py="xl"><Loader size="sm" color="brand" /></Box>
            ) : (
              <Stack gap="xs" p="md">
                {messages.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center" py="xl">
                    No messages yet. Say hello to {activeContact.name}!
                  </Text>
                )}
                {messages.map(msg => (
                  <Box key={msg.id} style={{ display: 'flex', justifyContent: msg.isOwn ? 'flex-end' : 'flex-start' }}>
                    {!msg.isOwn && (
                      <Avatar color={roleColor(activeContact.role)} radius="xl" size={28} mr={8} style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
                        {getInitials(activeContact.name)}
                      </Avatar>
                    )}
                    <Box style={{ maxWidth: '70%' }}>
                      <Box style={{
                        padding: '10px 14px',
                        borderRadius: msg.isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: msg.isOwn ? 'var(--mantine-color-brand-6)' : 'var(--mantine-color-gray-1)',
                        color: msg.isOwn ? 'white' : 'var(--mantine-color-dark-7)',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                      }}>
                        {msg.text}
                      </Box>
                      <Text size="xs" c="dimmed" mt={2} style={{ textAlign: msg.isOwn ? 'right' : 'left' }}>
                        {msg.isOwn ? myName : activeContact.name} · {fmtTime(msg.created_at)}
                      </Text>
                    </Box>
                  </Box>
                ))}
                <div ref={bottomRef} />
              </Stack>
            )}
          </ScrollArea>

          {/* Input */}
          <Box style={{ padding: '12px 16px', borderTop: '1px solid #f1f3f5' }}>
            <Group gap="sm">
              <TextInput
                style={{ flex: 1 }}
                placeholder={`Message ${activeContact.name}…`}
                value={draft}
                onChange={e => setDraft(e.currentTarget.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                radius="xl"
                size="md"
                disabled={sending}
              />
              <ActionIcon
                size="lg" radius="xl" color="brand" variant="filled"
                onClick={sendMessage}
                disabled={!draft.trim() || sending}
                loading={sending}
              >
                <LuSend size={16} />
              </ActionIcon>
            </Group>
          </Box>
        </Paper>
      ) : (
        <Paper withBorder radius="md"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
          <Stack align="center" gap="xs">
            <LuMessageSquare size={40} color="#adb5bd" />
            <Text c="dimmed" fw={600}>Select a contact to start messaging</Text>
            <Text size="xs" c="dimmed">Messages are end-to-end within your institution</Text>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
