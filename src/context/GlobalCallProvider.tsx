import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ActionIcon, Avatar, Box, Group, Paper, Text } from '@mantine/core';
import { LuPhone, LuPhoneOff } from 'react-icons/lu';
import { useAppSelector } from '../Redux/hooks';
import { supabase } from '../supabase/client';
import { showerrornotification } from '../helper/notificationhelper';
import { startIncomingRing, stopIncomingRing, stopAll } from '../utils/callAudio';
import CallModal, { type CallType } from '../Components/shared/CallModal';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ContactInfo {
  id:      string;
  name:    string;
  avatar?: string;
}

interface ActiveCall {
  type:          CallType;
  roomUrl:       string;
  contactId:     string;
  contactName:   string;
  contactAvatar?: string;
}

interface IncomingCall {
  roomUrl:       string;
  callerName:    string;
  callerAvatar?: string;
  callerId:      string;
}

interface DBCallMsg {
  message_type?: string;
  audio_url?:    string;
  sender_id:     string;
}

export interface GlobalCallContextValue {
  startCall:    (type: CallType, contact: ContactInfo) => Promise<void>;
  joinCall:     (roomUrl: string, contact: ContactInfo) => void;
  endedCallUrls: Set<string>;
  creatingCall:  boolean;
}

// ── Context ────────────────────────────────────────────────────────────────────

const GlobalCallContext = createContext<GlobalCallContextValue | null>(null);

export function useGlobalCall(): GlobalCallContextValue {
  const ctx = useContext(GlobalCallContext);
  if (!ctx) throw new Error('useGlobalCall must be inside GlobalCallProvider');
  return ctx;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function GlobalCallProvider({ children }: { children: ReactNode }) {
  const user          = useAppSelector(s => s.auth.user);
  const myId          = user?.id           ?? '';
  const myName        = user?.name         ?? 'Me';
  const myAvatar      = user?.avatar       ?? undefined;
  const institutionId = user?.institutionId ?? '';

  const [activeCall,    setActiveCall]    = useState<ActiveCall | null>(null);
  const [incomingCall,  setIncomingCall]  = useState<IncomingCall | null>(null);
  const [endedCallUrls, setEndedCallUrls] = useState<Set<string>>(new Set());
  const [creatingCall,  setCreatingCall]  = useState(false);

  const incomingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Realtime: incoming call-invite and call-ended ────────────────────────

  useEffect(() => {
    if (!myId) return;

    const channel = supabase
      .channel(`global-calls-${myId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `receiver_id=eq.${myId}`,
      }, async payload => {
        const msg = payload.new as DBCallMsg;

        if (msg.message_type === 'call-invite' && msg.audio_url) {
          const { data: caller } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', msg.sender_id)
            .single();

          const callerRow = caller as { name?: string; avatar_url?: string } | null;

          startIncomingRing();
          setIncomingCall({
            roomUrl:      msg.audio_url,
            callerName:   callerRow?.name   ?? 'Someone',
            callerAvatar: callerRow?.avatar_url ?? undefined,
            callerId:     msg.sender_id,
          });

          if (incomingTimeout.current) clearTimeout(incomingTimeout.current);
          incomingTimeout.current = setTimeout(() => {
            stopIncomingRing();
            setIncomingCall(null);
          }, 30_000);
        }

        if (msg.message_type === 'call-ended' && msg.audio_url) {
          const url = msg.audio_url;
          setEndedCallUrls(prev => new Set(prev).add(url));
          setActiveCall(prev => (prev?.roomUrl === url ? null : prev));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myId]);

  useEffect(() => () => {
    stopAll();
    if (incomingTimeout.current) clearTimeout(incomingTimeout.current);
  }, []);

  // ── startCall ─────────────────────────────────────────────────────────────

  const startCall = useCallback(async (type: CallType, contact: ContactInfo) => {
    if (!myId || !institutionId) return;
    setCreatingCall(true);
    try {
      const apiKey = import.meta.env.VITE_DAILY_API_KEY as string | undefined;
      if (!apiKey) throw new Error('VITE_DAILY_API_KEY is not set in your .env file');

      const res = await fetch('https://api.daily.co/v1/rooms', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          properties: {
            exp:               Math.round(Date.now() / 1000) + 7200,
            enable_screenshare: true,
            max_participants:  10,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Daily API ${res.status}`);
      }

      const room = await res.json() as { url: string; name: string };

      await supabase.from('messages').insert({
        institution_id: institutionId,
        sender_id:      myId,
        receiver_id:    contact.id,
        text:           type === 'voice' ? '📞 Voice call started' : '📹 Video call started',
        audio_url:      room.url,
        message_type:   'call-invite',
      });

      setActiveCall({ type, roomUrl: room.url, contactId: contact.id, contactName: contact.name, contactAvatar: contact.avatar });
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : JSON.stringify(err);
      showerrornotification({ message: `Call failed: ${detail}` });
    } finally {
      setCreatingCall(false);
    }
  }, [myId, institutionId]);

  // ── joinCall ──────────────────────────────────────────────────────────────

  const joinCall = useCallback((roomUrl: string, contact: ContactInfo) => {
    stopIncomingRing();
    if (incomingTimeout.current) clearTimeout(incomingTimeout.current);
    setIncomingCall(null);
    setActiveCall({ type: 'video', roomUrl, contactId: contact.id, contactName: contact.name, contactAvatar: contact.avatar });
  }, []);

  // ── handleCallEnd — inserts call-ended message and closes modal ───────────

  const handleCallEnd = useCallback(async () => {
    if (!activeCall) return;
    const { roomUrl, contactId } = activeCall;

    setEndedCallUrls(prev => new Set(prev).add(roomUrl));
    setActiveCall(null);

    if (myId && institutionId) {
      supabase.from('messages').insert({
        institution_id: institutionId,
        sender_id:      myId,
        receiver_id:    contactId,
        text:           'Call ended',
        audio_url:      roomUrl,
        message_type:   'call-ended',
      }).then(() => {});
    }
  }, [activeCall, myId, institutionId]);

  // ── Accept / Decline handlers ─────────────────────────────────────────────

  const acceptCall = () => {
    if (!incomingCall) return;
    joinCall(incomingCall.roomUrl, {
      id:     incomingCall.callerId,
      name:   incomingCall.callerName,
      avatar: incomingCall.callerAvatar,
    });
  };

  const declineCall = () => {
    stopIncomingRing();
    if (incomingTimeout.current) clearTimeout(incomingTimeout.current);
    setIncomingCall(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <GlobalCallContext.Provider value={{ startCall, joinCall, endedCallUrls, creatingCall }}>
      {children}

      {/* ── Floating incoming call banner — visible on any page ── */}
      {incomingCall && (
        <Box style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9500, width: 'calc(100% - 32px)', maxWidth: 420,
          pointerEvents: 'auto',
        }}>
          <Paper withBorder radius="lg" p="md" shadow="xl"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.15)' }}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <Avatar src={incomingCall.callerAvatar} size={46} radius="50%" color="brand" style={{ flexShrink: 0 }}>
                  {getInitials(incomingCall.callerName)}
                </Avatar>
                <Box style={{ minWidth: 0 }}>
                  <Text fw={700} c="white" size="sm" truncate>{incomingCall.callerName}</Text>
                  <Text size="xs" c="rgba(255,255,255,0.5)">Incoming call…</Text>
                </Box>
              </Group>
              <Group gap={10} style={{ flexShrink: 0 }}>
                <ActionIcon size={46} radius="50%" color="red" variant="filled" onClick={declineCall} title="Decline">
                  <LuPhoneOff size={20} />
                </ActionIcon>
                <ActionIcon size={46} radius="50%" color="green" variant="filled" onClick={acceptCall} title="Accept">
                  <LuPhone size={20} />
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        </Box>
      )}

      {/* ── Compact floating call window — on top of any page ── */}
      {activeCall && (
        <CallModal
          type={activeCall.type}
          roomUrl={activeCall.roomUrl}
          contactName={activeCall.contactName}
          contactAvatar={activeCall.contactAvatar}
          myName={myName}
          myAvatar={myAvatar}
          onClose={handleCallEnd}
        />
      )}
    </GlobalCallContext.Provider>
  );
}
