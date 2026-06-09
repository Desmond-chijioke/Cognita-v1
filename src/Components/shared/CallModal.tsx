import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Avatar, Box, Text, Tooltip } from '@mantine/core';
import {
  DailyAudio,
  DailyProvider,
  DailyVideo,
  useDaily,
  useLocalSessionId,
  useMeetingState,
  useParticipantIds,
  useScreenShare,
  useVideoTrack,
} from '@daily-co/daily-react';
import {
  LuMic, LuMicOff, LuPhoneOff,
  LuVideo, LuVideoOff,
  LuMonitor, LuMonitorOff,
} from 'react-icons/lu';
import { startOutgoingTone, stopOutgoingTone, stopAll } from '../../utils/callAudio';

export type CallType = 'voice' | 'video';

export interface CallModalProps {
  type:           CallType;
  roomUrl:        string;
  contactName:    string;
  contactAvatar?: string;
  myName:         string;
  myAvatar?:      string;
  onClose:        () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

const CTRL_BTN: React.CSSProperties = {
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  background: 'rgba(255,255,255,0.15)',
};
const CTRL_BTN_ACTIVE: React.CSSProperties = { ...CTRL_BTN, background: '#e03131' };
const CTRL_BTN_SCREEN: React.CSSProperties = { ...CTRL_BTN, background: 'var(--mantine-color-brand-6)' };

// ── Remote participant tile — handles video on/off state ──────────────────────

function RemoteTile({
  sessionId, contactName, contactAvatar,
}: { sessionId: string; contactName: string; contactAvatar?: string }) {
  const video = useVideoTrack(sessionId);

  if (video.isOff) {
    return (
      <Box style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Avatar
          src={contactAvatar}
          size={110}
          radius="50%"
          color="brand"
          style={{ border: '3px solid rgba(255,255,255,0.18)', fontSize: 36 }}
        >
          {getInitials(contactName)}
        </Avatar>
      </Box>
    );
  }

  return (
    <DailyVideo
      sessionId={sessionId}
      type="video"

      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

// ── Inner UI — must sit inside DailyProvider ──────────────────────────────────

function CallUI({ type, roomUrl, contactName, contactAvatar, myName, myAvatar, onClose }: CallModalProps) {
  const daily        = useDaily();
  const meetingState = useMeetingState();
  const localId      = useLocalSessionId();
  const remoteIds    = useParticipantIds({ filter: 'remote' });
  const {
    startScreenShare,
    stopScreenShare,
    isSharingScreen,
    screens,
  }                  = useScreenShare();

  const [muted,    setMuted]    = useState(false);
  const [camOff,   setCamOff]   = useState(type === 'voice');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Draggable window ─────────────────────────────────────────────────────
  const posRef     = useRef({ x: window.innerWidth - 380, y: window.innerHeight - 500 });
  const [pos, setPos] = useState(posRef.current);
  const isDragging  = useRef(false);
  const dragOffset  = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const next = {
        x: Math.max(0, Math.min(window.innerWidth  - 360, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 480, e.clientY - dragOffset.current.y)),
      };
      posRef.current = next;
      setPos(next);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      document.body.style.cursor = '';
    };
  }, []);

  const onDragStart = (e: React.MouseEvent) => {
    isDragging.current = true;
    document.body.style.cursor = 'grabbing';
    dragOffset.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    e.preventDefault();
  };

  // Join room on mount
  useEffect(() => {
    if (daily && meetingState === 'new') {
      daily.join({ url: roomUrl, startVideoOff: type === 'voice', startAudioOff: false });
    }
  }, [daily, meetingState, roomUrl, type]);

  // Duration timer — starts once joined
  useEffect(() => {
    if (meetingState === 'joined-meeting') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [meetingState]);

  // Leave Daily room when the call object changes or on unmount
  useEffect(() => () => { daily?.leave(); }, [daily]);

  // Stop all audio ONLY on final unmount — not when daily reference changes
  useEffect(() => () => stopAll(), []);

  // Outgoing "calling…" tone — plays on loop until remote participant joins
  useEffect(() => {
    startOutgoingTone();
    return stopOutgoingTone;
  }, []);

  useEffect(() => {
    if (remoteIds.length > 0) stopOutgoingTone();
  }, [remoteIds.length]);

  const toggleMic = useCallback(() => {
    setMuted(m => { daily?.setLocalAudio(m); return !m; });
  }, [daily]);

  const toggleCam = useCallback(() => {
    setCamOff(c => { daily?.setLocalVideo(c); return !c; });
  }, [daily]);

  const toggleScreen = useCallback(() => {
    if (isSharingScreen) stopScreenShare();
    else startScreenShare();
  }, [isSharingScreen, startScreenShare, stopScreenShare]);

  const endCall = useCallback(() => {
    daily?.leave();
    onClose();
  }, [daily, onClose]);

  const remoteId     = remoteIds[0] ?? null;
  const screenTile   = screens[0] ?? null;
  const isConnecting = meetingState === 'loading' || meetingState === 'joining-meeting';

  return (
    <Box style={{
      position: 'fixed', top: pos.y, left: pos.x, zIndex: 9000,
      width: 360, height: 480,
      background: '#0e0e0e',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'inherit',
    }}>

      {/* ── Header bar — drag handle ── */}
      <Box
        onMouseDown={onDragStart}
        style={{
          padding: '10px 14px',
          background: '#1a1a1a',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
          zIndex: 3,
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <Avatar src={contactAvatar} size={30} radius="50%" color="brand" style={{ flexShrink: 0 }}>
          {getInitials(contactName)}
        </Avatar>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} c="white" size="sm" truncate>{contactName}</Text>
          <Text size="xs" c="rgba(255,255,255,0.45)">
            {isConnecting
              ? 'Connecting…'
              : !remoteId
              ? 'Waiting to join…'
              : fmtDuration(duration)}
          </Text>
        </Box>
      </Box>

      {/* ── Main video area ── */}
      <Box style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Priority: screen share → remote video → waiting avatar */}
        {screenTile ? (
          <DailyVideo
            sessionId={screenTile.session_id}
            type="screenVideo"
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        ) : remoteId ? (
          <RemoteTile
            sessionId={remoteId}
            contactName={contactName}
            contactAvatar={contactAvatar}
          />
        ) : (
          <Box style={{
            height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <Avatar
              src={contactAvatar}
              size={80}
              radius="50%"
              color="brand"
              style={{ border: '2px solid rgba(255,255,255,0.14)' }}
            >
              {getInitials(contactName)}
            </Avatar>
            <Text c="rgba(255,255,255,0.4)" size="xs">
              {isConnecting ? 'Connecting…' : `Waiting for ${contactName}`}
            </Text>
          </Box>
        )}

        {/* ── Local PiP — video on ── */}
        {localId && !camOff && (
          <Box style={{
            position: 'absolute', bottom: 8, right: 8,
            width: 96, height: 64,
            borderRadius: 10, overflow: 'hidden',
            border: '1.5px solid rgba(255,255,255,0.18)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            zIndex: 2,
          }}>
            <DailyVideo
              sessionId={localId}
              type="video"
              mirror
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
        )}

        {/* ── Local PiP — camera off ── */}
        {camOff && (
          <Box style={{
            position: 'absolute', bottom: 8, right: 8,
            width: 96, height: 64,
            borderRadius: 10, overflow: 'hidden',
            border: '1.5px solid rgba(255,255,255,0.1)',
            background: '#1a1a2e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}>
            <Avatar src={myAvatar} size={36} radius="50%" color="brand">
              {getInitials(myName)}
            </Avatar>
          </Box>
        )}

        {/* Screen share badge */}
        {isSharingScreen && (
          <Box style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--mantine-color-brand-6)',
            color: '#fff', borderRadius: 20, padding: '3px 10px',
            fontSize: 11, fontWeight: 600, zIndex: 3, whiteSpace: 'nowrap',
          }}>
            Sharing your screen
          </Box>
        )}

        <DailyAudio />
      </Box>

      {/* ── Controls bar ── */}
      <Box style={{
        padding: '10px 0 14px',
        background: '#1a1a1a',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
        flexShrink: 0,
        zIndex: 3,
      }}>

        <Tooltip label={muted ? 'Unmute' : 'Mute'} withArrow color="dark">
          <ActionIcon
            size={44} radius="50%"
            style={muted ? CTRL_BTN_ACTIVE : CTRL_BTN}
            onClick={toggleMic}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <LuMicOff size={18} color="white" /> : <LuMic size={18} color="white" />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label={camOff ? 'Camera on' : 'Camera off'} withArrow color="dark">
          <ActionIcon
            size={44} radius="50%"
            style={camOff ? CTRL_BTN_ACTIVE : CTRL_BTN}
            onClick={toggleCam}
            aria-label={camOff ? 'Camera on' : 'Camera off'}
          >
            {camOff ? <LuVideoOff size={18} color="white" /> : <LuVideo size={18} color="white" />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label={isSharingScreen ? 'Stop sharing' : 'Share screen'} withArrow color="dark">
          <ActionIcon
            size={44} radius="50%"
            style={isSharingScreen ? CTRL_BTN_SCREEN : CTRL_BTN}
            onClick={toggleScreen}
            aria-label={isSharingScreen ? 'Stop share' : 'Share screen'}
          >
            {isSharingScreen ? <LuMonitorOff size={18} color="white" /> : <LuMonitor size={18} color="white" />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="End call" withArrow color="dark">
          <ActionIcon
            size={44} radius="50%"
            style={{ ...CTRL_BTN, background: '#e03131' }}
            onClick={endCall}
            aria-label="End call"
          >
            <LuPhoneOff size={18} color="white" />
          </ActionIcon>
        </Tooltip>

      </Box>
    </Box>
  );
}

// ── Exported wrapper — provides DailyProvider context ─────────────────────────

export default function CallModal(props: CallModalProps) {
  return (
    <DailyProvider>
      <CallUI {...props} />
    </DailyProvider>
  );
}
