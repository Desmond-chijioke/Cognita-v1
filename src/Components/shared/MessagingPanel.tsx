import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ActionIcon, Avatar, Badge, Box, Button, Group, Loader,
  Modal, Paper, ScrollArea, Stack, Text, TextInput, Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  LuSearch, LuSend, LuCircle, LuMessageSquare, LuMic, LuX,
  LuPhone, LuVideo, LuArrowLeft, LuImage, LuPaperclip,
  LuDownload, LuFileText,
} from 'react-icons/lu';
import { useGlobalCall } from '../../context/GlobalCallProvider';
import { useAppSelector } from '../../Redux/hooks';
import { supabase } from '../../supabase/client';
import { showerrornotification } from '../../helper/notificationhelper';

// ── Role groups ────────────────────────────────────────────────────────────────
const STUDENT_ROLES    = ['Student', 'PhD Student', 'Undergraduate Student', "Master's Student", 'Postgraduate Student', 'Researcher'];
const SUPERVISOR_ROLES = ['Supervisor', 'Senior Supervisor', 'Co-Supervisor', 'Assistant Supervisor'];
const MANAGEMENT_ROLES = ['schoolAdmin', 'Head of Department', 'PG Coordinator', 'Dean', 'Provost', 'Director of Research', 'Vice Chancellor', 'External Examiner', 'Internal Examiner'];

// ── Types ──────────────────────────────────────────────────────────────────────

interface Contact {
  id:             string;
  name:           string;
  email:          string;
  role:           string;
  unread:         number;
  avatar_url?:    string;
  lastMessage?:   string;
  lastTime?:      string;
  lastTimestamp?: string;
}

interface DBMessage {
  id:            string;
  sender_id:     string;
  receiver_id:   string;
  text:          string;
  audio_url?:    string;
  file_url?:     string;
  file_name?:    string;
  file_size?:    number;
  message_type?: 'text' | 'voice' | 'call-invite' | 'call-ended' | 'image' | 'file';
  created_at:    string;
  read_at:       string | null;
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

function fmtFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Download a cross-origin file by fetching it as a blob first. */
async function downloadFile(url: string, filename: string) {
  try {
    const res    = await fetch(url);
    const blob   = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a      = Object.assign(document.createElement('a'), { href: objUrl, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objUrl);
  } catch {
    window.open(url, '_blank');
  }
}

const COLORS = ['blue', 'teal', 'violet', 'orange', 'grape', 'cyan', 'green', 'red'];
function roleColor(role: string) {
  let h = 0;
  for (const c of role) h = (h << 5) - h + c.charCodeAt(0);
  return COLORS[Math.abs(h) % COLORS.length];
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

function VoicePlayer({ url }: { url: string }) {
  return (
    <Group gap={8} style={{ minWidth: 200 }} wrap="nowrap">
      <LuMic size={14} style={{ flexShrink: 0, color: '#868e96' }} />
      <audio controls src={url} style={{ height: 32, flex: 1, minWidth: 0 }} />
    </Group>
  );
}

// ── Bubble background helper ───────────────────────────────────────────────────

function bubbleBg(msg: Message): string {
  switch (msg.message_type) {
    case 'voice':
      return msg.isOwn ? 'var(--mantine-color-brand-1)' : 'var(--mantine-color-gray-1)';
    case 'call-invite':
      return msg.isOwn ? 'var(--mantine-color-green-7)' : 'var(--mantine-color-green-0)';
    case 'image':
      return 'transparent';
    case 'file':
      return msg.isOwn ? 'var(--mantine-color-brand-6)' : 'var(--mantine-color-gray-1)';
    default:
      return msg.isOwn ? 'var(--mantine-color-brand-6)' : 'var(--mantine-color-gray-1)';
  }
}

function bubbleColor(msg: Message): string {
  if (msg.message_type === 'call-invite' && !msg.isOwn) return 'var(--mantine-color-dark-7)';
  if (msg.isOwn && msg.message_type !== 'voice' && msg.message_type !== 'image') return 'white';
  return 'var(--mantine-color-dark-7)';
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function MessagingPanel() {
  const location      = useLocation();
  const preselectedId = (location.state as { activeContactId?: string } | null)?.activeContactId ?? null;

  const user          = useAppSelector(s => s.auth.user);
  const myId          = user?.id           ?? '';
  const myName        = user?.name         ?? 'Me';
  const myAvatarUrl   = user?.avatar       ?? undefined;
  const institutionId = user?.institutionId ?? '';
  const myRole        = user?.role         ?? '';
  const supervisorId  = user?.supervisorId ?? '';

  const [contacts,        setContacts]        = useState<Contact[]>([]);
  const [messages,        setMessages]        = useState<Message[]>([]);
  const [activeId,        setActiveId]        = useState<string | null>(null);
  const [draft,           setDraft]           = useState('');
  const [search,          setSearch]          = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending,         setSending]         = useState(false);
  const [uploading,       setUploading]       = useState(false);
  const [preview,         setPreview]         = useState<{ url: string; name: string; size?: number; msgType: 'image' | 'file' } | null>(null);
  const [previewBlobUrl,  setPreviewBlobUrl]  = useState<string | null>(null);
  const [previewLoading,  setPreviewLoading]  = useState(false);
  const [onlineUsers,     setOnlineUsers]     = useState<Set<string>>(new Set());

  const isMobile  = useMediaQuery('(max-width: 768px)') ?? false;
  const [mobileView, setMobileView] = useState<'contacts' | 'chat'>('contacts');

  const { startCall, joinCall, endedCallUrls, creatingCall } = useGlobalCall();

  const contactsRef   = useRef<Contact[]>([]);
  const activeIdRef   = useRef<string | null>(null);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Voice recording
  const [recording,    setRecording]   = useState(false);
  const [recDuration,  setRecDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 1. Load contacts ────────────────────────────────────────────────────────

  const loadContacts = useCallback(async () => {
    if (!myId || !institutionId) return;
    setLoadingContacts(true);

    type UserRow = { id: string; name: string; email: string; role: string; avatar_url?: string; supervisor_id?: string };

    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, email, role, avatar_url, supervisor_id')
        .eq('institution_id', institutionId)
        .neq('id', myId)
        .order('name');

      let users = (data ?? []) as unknown as UserRow[];

      if (STUDENT_ROLES.includes(myRole)) {
        users = supervisorId ? users.filter(u => u.id === supervisorId) : [];
      } else if (SUPERVISOR_ROLES.includes(myRole)) {
        users = users.filter(u =>
          (STUDENT_ROLES.includes(u.role) && u.supervisor_id === myId) ||
          MANAGEMENT_ROLES.includes(u.role),
        );
      } else if (MANAGEMENT_ROLES.includes(myRole)) {
        users = users.filter(u =>
          MANAGEMENT_ROLES.includes(u.role) || SUPERVISOR_ROLES.includes(u.role),
        );
      }

      if (!users.length) { setContacts([]); return; }

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
          id:            u.id,
          name:          u.name,
          email:         u.email,
          role:          u.role,
          avatar_url:    u.avatar_url || undefined,
          unread:        unread ?? 0,
          lastMessage:   lastMsg?.text,
          lastTime:      lastMsg ? fmtTime(lastMsg.created_at) : undefined,
          lastTimestamp: lastMsg?.created_at,
        } as Contact;
      }));

      setContacts(enriched);
    } finally {
      setLoadingContacts(false);
    }
  }, [institutionId, myId, myRole, supervisorId]);

  // ── 2. Load messages ────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (contactId: string) => {
    if (!myId) return;
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, text, audio_url, file_url, file_name, file_size, message_type, created_at, read_at')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true });

      setMessages((data ?? []).map(m => ({ ...m, isOwn: m.sender_id === myId })));

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

  // ── 3. Send text message ────────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !activeId || !myId || !institutionId) return;
    setDraft('');
    setSending(true);
    try {
      const { data: newMsg } = await supabase
        .from('messages')
        .insert({ institution_id: institutionId, sender_id: myId, receiver_id: activeId, text, message_type: 'text' })
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

  // ── 4. Send file (image or document) ───────────────────────────────────────

  const sendFile = async (file: File, type: 'image' | 'file') => {
    if (!activeId || !myId || !institutionId) return;

    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_BYTES) {
      showerrornotification({ message: `File too large — maximum size is 5 MB (your file is ${fmtFileSize(file.size)}).` });
      return;
    }

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path     = `${institutionId}/${myId}/${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('chat-files')
        .upload(path, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(path);

      const preview = type === 'image' ? '[Image]' : `[File: ${file.name}]`;

      const { data: newMsg } = await supabase
        .from('messages')
        .insert({
          institution_id: institutionId,
          sender_id:      myId,
          receiver_id:    activeId,
          text:           preview,
          file_url:       publicUrl,
          file_name:      file.name,
          file_size:      file.size,
          message_type:   type,
        })
        .select()
        .single();

      if (newMsg) {
        setMessages(prev => [...prev, { ...newMsg, isOwn: true }]);
        setContacts(prev => prev.map(c => c.id === activeId
          ? { ...c, lastMessage: preview, lastTime: fmtTime(newMsg.created_at), lastTimestamp: newMsg.created_at }
          : c));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showerrornotification({ message: `Upload failed: ${msg}` });
    } finally {
      setUploading(false);
    }
  };

  // ── 5. Voice recording ──────────────────────────────────────────────────────

  const sendVoiceNote = async (blob: Blob, mimeType: string) => {
    if (!activeId || !myId || !institutionId) return;
    setSending(true);
    try {
      const ext  = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
      const path = `${institutionId}/${myId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('voice-notes')
        .upload(path, blob, { contentType: mimeType });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('voice-notes').getPublicUrl(path);

      const { data: newMsg } = await supabase
        .from('messages')
        .insert({
          institution_id: institutionId,
          sender_id:      myId,
          receiver_id:    activeId,
          text:           '[Voice note]',
          audio_url:      publicUrl,
          message_type:   'voice',
        })
        .select()
        .single();

      if (newMsg) {
        setMessages(prev => [...prev, { ...newMsg, isOwn: true }]);
        setContacts(prev => prev.map(c => c.id === activeId
          ? { ...c, lastMessage: '[Voice note]', lastTime: fmtTime(newMsg.created_at), lastTimestamp: newMsg.created_at }
          : c));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showerrornotification({ message: `Voice note failed: ${msg}` });
    } finally {
      setSending(false);
      setRecDuration(0);
    }
  };

  const startRecording = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const mr       = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        sendVoiceNote(blob, mr.mimeType || 'audio/webm');
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecDuration(0);
      timerRef.current = setInterval(() => setRecDuration(d => d + 1), 1000);
    } catch {
      // microphone permission denied
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setRecording(false);
    setRecDuration(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // ── 6. PDF blob loader — fetch PDF and create a local blob URL so the
  //        browser's native renderer works without any cross-origin issues.
  useEffect(() => {
    let objectUrl: string | null = null;

    if (!preview || preview.msgType !== 'file') {
      setPreviewBlobUrl(null);
      return;
    }

    const ext = preview.name.split('.').pop()?.toLowerCase() ?? '';
    if (ext !== 'pdf') {
      setPreviewBlobUrl(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewBlobUrl(null);

    fetch(preview.url)
      .then(r => r.blob())
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(objectUrl);
      })
      .catch(() => setPreviewBlobUrl(null))
      .finally(() => setPreviewLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [preview?.url]);

  // ── 7. Realtime ─────────────────────────────────────────────────────────────

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
          setMessages(prev => [...prev, { ...msg, isOwn: false }]);
          supabase.from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id)
            .then(() => {});
        } else {
          setContacts(prev => prev.map(c => c.id === msg.sender_id
            ? { ...c, unread: c.unread + 1, lastMessage: msg.text, lastTime: fmtTime(msg.created_at), lastTimestamp: msg.created_at }
            : c));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myId]);

  // ── Presence — track who is online within the same institution ───────────────
  useEffect(() => {
    if (!myId || !institutionId) return;

    const presence = supabase.channel(`presence-${institutionId}`, {
      config: { presence: { key: myId } },
    });

    presence
      .on('presence', { event: 'sync' }, () => {
        const state   = presence.presenceState<{ user_id: string }>();
        const ids     = new Set(Object.values(state).flat().map(p => p.user_id));
        ids.delete(myId); // don't count yourself
        setOnlineUsers(ids);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await presence.track({ user_id: myId });
        }
      });

    return () => { supabase.removeChannel(presence); };
  }, [myId, institutionId]);

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    if (!contacts.length || activeId) return;
    if (preselectedId && contacts.find(c => c.id === preselectedId)) {
      setActiveId(preselectedId);
      if (isMobile) setMobileView('chat');
    } else if (STUDENT_ROLES.includes(myRole) && contacts.length === 1) {
      setActiveId(contacts[0].id);
      if (isMobile) setMobileView('chat');
    }
  }, [contacts, preselectedId, myRole, isMobile, activeId]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeContact = contacts.find(c => c.id === activeId) ?? null;

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

  const busy = sending || uploading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box style={{ display: 'flex', height: 'calc(100vh - 96px)', gap: 0, position: 'relative' }}>

      {/* ── Left: contact list ── */}
      <Paper withBorder radius="md"
        style={{
          width: isMobile ? '100%' : 300,
          flexShrink: 0,
          display: isMobile && mobileView === 'chat' ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

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
              {!institutionId
                ? 'Loading…'
                : STUDENT_ROLES.includes(myRole) && !supervisorId
                ? 'No supervisor assigned yet. Contact your HoD.'
                : 'No contacts available.'}
            </Text>
          ) : (
            filtered.map(contact => (
              <Box
                key={contact.id}
                onClick={() => { setActiveId(contact.id); if (isMobile) setMobileView('chat'); }}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  background: activeId === contact.id ? 'var(--mantine-color-brand-0)' : 'transparent',
                  borderLeft: activeId === contact.id ? '3px solid var(--mantine-color-brand-6)' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}
              >
                <Group gap="sm" wrap="nowrap">
                  <Box style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar src={contact.avatar_url} color={roleColor(contact.role)} radius="xl" size={38}>
                      {getInitials(contact.name)}
                    </Avatar>
                    {onlineUsers.has(contact.id) && (
                      <Box style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 11, height: 11, borderRadius: '50%',
                        background: '#40c057',
                        border: '2px solid white',
                      }} />
                    )}
                  </Box>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={contact.unread > 0 ? 700 : 600} truncate>{contact.name}</Text>
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
          style={{
            flex: 1,
            display: isMobile && mobileView === 'contacts' ? 'none' : 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginLeft: isMobile ? 0 : 12,
          }}>

          {/* Header */}
          <Box style={{ padding: isMobile ? '10px 10px' : '12px 20px', borderBottom: '1px solid #f1f3f5', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
            {isMobile && (
              <ActionIcon variant="subtle" color="gray" radius="xl" size="md"
                onClick={() => { setActiveId(null); setMobileView('contacts'); }}
                style={{ flexShrink: 0 }}>
                <LuArrowLeft size={16} />
              </ActionIcon>
            )}
            <Box style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar src={activeContact.avatar_url} color={roleColor(activeContact.role)} radius="xl" size={isMobile ? 34 : 40}>
                {getInitials(activeContact.name)}
              </Avatar>
              {onlineUsers.has(activeContact.id) && (
                <Box style={{
                  position: 'absolute', bottom: 1, right: 1,
                  width: 11, height: 11, borderRadius: '50%',
                  background: '#40c057',
                  border: '2px solid white',
                }} />
              )}
            </Box>
            <Box style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <Text fw={700} size="sm" truncate>{activeContact.name}</Text>
              {!isMobile ? (
                <Group gap={4} wrap="nowrap">
                  {onlineUsers.has(activeContact.id) ? (
                    <>
                      <LuCircle size={8} color="#40c057" fill="#40c057" style={{ flexShrink: 0 }} />
                      <Text size="xs" c="green.6" fw={500}>Online</Text>
                      <Text size="xs" c="dimmed">· {activeContact.role}</Text>
                    </>
                  ) : (
                    <>
                      <LuCircle size={8} color="#adb5bd" fill="#adb5bd" style={{ flexShrink: 0 }} />
                      <Text size="xs" c="dimmed" truncate>{activeContact.role} · {activeContact.email}</Text>
                    </>
                  )}
                </Group>
              ) : (
                <Group gap={4} wrap="nowrap">
                  {onlineUsers.has(activeContact.id) && (
                    <LuCircle size={7} color="#40c057" fill="#40c057" style={{ flexShrink: 0 }} />
                  )}
                  <Text size="xs" c={onlineUsers.has(activeContact.id) ? 'green.6' : 'dimmed'} truncate>
                    {onlineUsers.has(activeContact.id) ? 'Online' : activeContact.role}
                  </Text>
                </Group>
              )}
            </Box>
            <Group gap={isMobile ? 2 : 4} wrap="nowrap" style={{ flexShrink: 0 }}>
              <ActionIcon
                variant="subtle" color="green" radius="xl" size={isMobile ? 'md' : 'lg'}
                onClick={() => startCall('voice', { id: activeContact.id, name: activeContact.name, avatar: activeContact.avatar_url })}
                loading={creatingCall} title="Voice call"
              >
                <LuPhone size={isMobile ? 15 : 17} />
              </ActionIcon>
              <ActionIcon
                variant="subtle" color="brand" radius="xl" size={isMobile ? 'md' : 'lg'}
                onClick={() => startCall('video', { id: activeContact.id, name: activeContact.name, avatar: activeContact.avatar_url })}
                loading={creatingCall} title="Video call"
              >
                <LuVideo size={isMobile ? 15 : 17} />
              </ActionIcon>
            </Group>
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
                      <Avatar src={activeContact.avatar_url} color={roleColor(activeContact.role)}
                        radius="xl" size={28} mr={8} style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
                        {getInitials(activeContact.name)}
                      </Avatar>
                    )}
                    {msg.isOwn && (
                      <Box style={{ order: 2, flexShrink: 0, alignSelf: 'flex-end', marginLeft: 8 }}>
                        <Avatar src={myAvatarUrl} color="brand" radius="xl" size={28}>
                          {getInitials(myName)}
                        </Avatar>
                      </Box>
                    )}

                    <Box style={{ maxWidth: '70%' }}>
                      <Box style={{
                        padding:      msg.message_type === 'image' ? 0 : '10px 14px',
                        borderRadius: msg.isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background:   bubbleBg(msg),
                        color:        bubbleColor(msg),
                        fontSize:     '0.875rem',
                        lineHeight:   1.5,
                        overflow:     'hidden',
                      }}>

                        {/* ── Image message ── */}
                        {msg.message_type === 'image' && msg.file_url ? (
                          <Box>
                            <Tooltip label="Click to preview" withArrow position="top">
                              <Box
                                style={{
                                  borderRadius: msg.isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                  overflow: 'hidden', cursor: 'zoom-in',
                                }}
                                onClick={() => setPreview({ url: msg.file_url!, name: msg.file_name ?? 'Image', size: msg.file_size, msgType: 'image' })}
                              >
                                <img
                                  src={msg.file_url}
                                  alt={msg.file_name ?? 'Image'}
                                  style={{ display: 'block', width: '100%', maxWidth: 260, maxHeight: 280, objectFit: 'cover' }}
                                />
                              </Box>
                            </Tooltip>
                            <Group gap={4} px={10} py={6} justify="space-between" wrap="nowrap">
                              <Text size="10px" c="dimmed" truncate style={{ flex: 1 }}>
                                {msg.file_name}
                              </Text>
                              <Tooltip label="Download" withArrow>
                                <ActionIcon
                                  size="xs" variant="subtle" color="gray"
                                  onClick={() => downloadFile(msg.file_url!, msg.file_name ?? 'image')}
                                >
                                  <LuDownload size={11} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Box>

                        ) : msg.message_type === 'file' && msg.file_url ? (
                          /* ── Document / file message ── */
                          <Group
                            gap="sm" wrap="nowrap"
                            style={{ minWidth: 220, cursor: 'pointer' }}
                            onClick={() => setPreview({ url: msg.file_url!, name: msg.file_name ?? 'Document', size: msg.file_size, msgType: 'file' })}
                          >
                            <Box style={{
                              width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                              background: msg.isOwn ? 'rgba(255,255,255,0.2)' : '#e9ecef',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <LuFileText size={20} color={msg.isOwn ? 'white' : '#3b5bdb'} />
                            </Box>
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <Text size="xs" fw={600} truncate style={{ color: msg.isOwn ? 'white' : 'var(--mantine-color-dark-7)' }}>
                                {msg.file_name ?? 'Document'}
                              </Text>
                              {msg.file_size != null && (
                                <Text size="10px" style={{ color: msg.isOwn ? 'rgba(255,255,255,0.65)' : 'var(--mantine-color-dimmed)' }}>
                                  {fmtFileSize(msg.file_size)}
                                </Text>
                              )}
                              <Text size="10px" style={{ color: msg.isOwn ? 'rgba(255,255,255,0.5)' : 'var(--mantine-color-brand-5)' }}>
                                Tap to preview
                              </Text>
                            </Box>
                            <Tooltip label="Download" withArrow>
                              <ActionIcon
                                size="sm" variant="subtle"
                                style={{ flexShrink: 0, color: msg.isOwn ? 'white' : 'var(--mantine-color-brand-6)' }}
                                onClick={e => { e.stopPropagation(); downloadFile(msg.file_url!, msg.file_name ?? 'file'); }}
                              >
                                <LuDownload size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>

                        ) : msg.message_type === 'call-ended' ? (
                          /* ── Call ended ── */
                          <Group gap={8} wrap="nowrap">
                            <LuPhone size={14} />
                            <Text size="sm" c="dimmed">Call ended</Text>
                          </Group>

                        ) : msg.message_type === 'call-invite' && msg.audio_url ? (
                          /* ── Call invite ── */
                          <Box>
                            <Group gap={8} wrap="nowrap" mb={msg.isOwn ? 0 : 8}>
                              <Box style={{
                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <LuPhone size={15} />
                              </Box>
                              <Text size="sm" fw={600}>{msg.text}</Text>
                            </Group>
                            {!msg.isOwn && (
                              endedCallUrls.has(msg.audio_url) ? (
                                <Badge size="sm" color="gray" variant="light">Call Ended</Badge>
                              ) : (
                                <Button
                                  size="xs" color="green" radius="xl"
                                  leftSection={<LuPhone size={12} />}
                                  onClick={() => joinCall(msg.audio_url!, {
                                    id:     activeContact.id,
                                    name:   activeContact.name,
                                    avatar: activeContact.avatar_url,
                                  })}
                                >
                                  Join Call
                                </Button>
                              )
                            )}
                          </Box>

                        ) : msg.message_type === 'voice' && msg.audio_url ? (
                          /* ── Voice note ── */
                          <VoicePlayer url={msg.audio_url} />

                        ) : (
                          /* ── Plain text ── */
                          msg.text
                        )}
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

          {/* ── Input bar ── */}
          <Box style={{ padding: '12px 16px', borderTop: '1px solid #f1f3f5' }}>

            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) sendFile(file, 'image');
                e.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) sendFile(file, 'file');
                e.target.value = '';
              }}
            />

            {recording ? (
              /* Recording bar */
              <Group gap="sm">
                <Box style={{
                  display: 'flex', alignItems: 'center', gap: 10, flex: 1,
                  background: '#fff5f5', borderRadius: 24, padding: '8px 16px',
                  border: '1.5px solid #ffc9c9',
                }}>
                  <Box style={{ width: 8, height: 8, borderRadius: '50%', background: '#f03e3e', flexShrink: 0 }} />
                  <Text size="sm" fw={700} c="red.7" style={{ minWidth: 40 }}>{formatDuration(recDuration)}</Text>
                  <Text size="xs" c="dimmed" style={{ flex: 1 }}>Recording…</Text>
                </Box>
                <ActionIcon size="lg" radius="xl" color="gray" variant="light" onClick={cancelRecording} title="Cancel">
                  <LuX size={16} />
                </ActionIcon>
                <ActionIcon size="lg" radius="xl" color="brand" variant="filled" onClick={stopRecording} loading={sending} title="Send">
                  <LuSend size={16} />
                </ActionIcon>
              </Group>
            ) : (
              /* Normal input bar */
              <Group gap={6} wrap="nowrap">

                {/* Image upload button */}
                <Tooltip label="Share image" withArrow>
                  <ActionIcon
                    size="lg" radius="xl" color="brand" variant="subtle"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={busy}
                  >
                    <LuImage size={18} />
                  </ActionIcon>
                </Tooltip>

                {/* Document upload button */}
                <Tooltip label="Share document" withArrow>
                  <ActionIcon
                    size="lg" radius="xl" color="brand" variant="subtle"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                  >
                    <LuPaperclip size={18} />
                  </ActionIcon>
                </Tooltip>

                <TextInput
                  style={{ flex: 1 }}
                  placeholder={uploading ? 'Uploading…' : `Message ${activeContact.name}…`}
                  value={draft}
                  onChange={e => setDraft(e.currentTarget.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  radius="xl"
                  size="md"
                  disabled={busy}
                />

                {uploading ? (
                  <ActionIcon size="lg" radius="xl" color="brand" variant="light" loading>
                    <LuSend size={16} />
                  </ActionIcon>
                ) : draft.trim() ? (
                  <ActionIcon size="lg" radius="xl" color="brand" variant="filled"
                    onClick={sendMessage} disabled={sending} loading={sending}>
                    <LuSend size={16} />
                  </ActionIcon>
                ) : (
                  <ActionIcon size="lg" radius="xl" color="brand" variant="light"
                    onClick={startRecording} disabled={busy} title="Record voice note">
                    <LuMic size={16} />
                  </ActionIcon>
                )}
              </Group>
            )}
          </Box>
        </Paper>
      ) : !isMobile ? (
        <Paper withBorder radius="md"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
          <Stack align="center" gap="xs">
            <LuMessageSquare size={40} color="#adb5bd" />
            <Text c="dimmed" fw={600}>Select a contact to start messaging</Text>
            <Text size="xs" c="dimmed">Messages are end-to-end within your institution</Text>
          </Stack>
        </Paper>
      ) : null}

      {/* ── Preview modal ── */}
      <Modal
        opened={preview !== null}
        onClose={() => setPreview(null)}
        title={
          <Group gap="xs" wrap="nowrap">
            {preview?.msgType === 'image' ? <LuImage size={16} /> : <LuFileText size={16} />}
            <Text size="sm" fw={600} truncate style={{ maxWidth: 320 }}>
              {preview?.name}
            </Text>
          </Group>
        }
        size={preview?.msgType === 'image' ? 'lg' : 'xl'}
        centered
        padding="md"
      >
        {preview && (
          <Stack gap="md">
            {preview.msgType === 'image' ? (
              /* Full-size image */
              <Box ta="center" style={{ background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                <img
                  src={preview.url}
                  alt={preview.name}
                  style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
              </Box>
            ) : (() => {
              const ext      = preview.name.split('.').pop()?.toLowerCase() ?? '';
              const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);

              if (ext === 'pdf') {
                /* PDF — fetched as blob and rendered by the browser's native engine */
                return previewLoading ? (
                  <Box ta="center" py="xl"><Loader color="brand" /></Box>
                ) : previewBlobUrl ? (
                  <Box style={{ height: '70vh', borderRadius: 8, overflow: 'hidden', border: '1px solid #e9ecef' }}>
                    <iframe
                      src={previewBlobUrl}
                      title={preview.name}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  </Box>
                ) : (
                  <Text ta="center" c="dimmed" py="xl">Could not load PDF preview — please download to view.</Text>
                );
              }

              if (isOffice) {
                /* Word / Excel / PowerPoint — Microsoft Office Online viewer */
                return (
                  <Box style={{ height: '70vh', borderRadius: 8, overflow: 'hidden', border: '1px solid #e9ecef' }}>
                    <iframe
                      key={preview.url}
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(preview.url)}`}
                      title={preview.name}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  </Box>
                );
              }

              /* Other file types (txt, csv, zip …) — no in-browser preview */
              return (
                <Box ta="center" py="xl">
                  <LuFileText size={48} color="#adb5bd" />
                  <Text c="dimmed" mt="sm">No preview available for .{ext} files.</Text>
                  <Text size="xs" c="dimmed">Download the file to open it.</Text>
                </Box>
              );
            })()}

            <Group justify="space-between" align="center">
              {preview.size != null && (
                <Text size="xs" c="dimmed">{fmtFileSize(preview.size)}</Text>
              )}
              <Button
                ml="auto"
                size="sm"
                variant="light"
                color="brand"
                leftSection={<LuDownload size={14} />}
                onClick={() => downloadFile(preview.url, preview.name)}
              >
                Download
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
