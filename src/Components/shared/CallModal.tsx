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
  background: 'rgba(255,255,255,0.12)',
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

  // Leave on unmount + stop all tones
  useEffect(() => () => { daily?.leave(); stopAll(); }, [daily]);

  // Outgoing "calling…" tone — play until remote participant joins
  useEffect(() => {
    startOutgoingTone();
    return () => stopOutgoingTone();
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
      position: 'fixed', inset: 0, zIndex: 9000,
      background: '#0e0e0e',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'inherit',
    }}>

      {/* ── Header ── */}
      <Box style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3,
        padding: '24px 28px 60px',
        background: 'linear-gradient(180deg,rgba(0,0,0,0.75) 0%,transparent 100%)',
        pointerEvents: 'none',
      }}>
        <Text fw={700} c="white" size="xl">{contactName}</Text>
        <Text size="sm" c="rgba(255,255,255,0.5)" mt={4}>
          {isConnecting
            ? 'Connecting…'
            : !remoteId
            ? 'Waiting for them to join…'
            : fmtDuration(duration)}
        </Text>
      </Box>

      {/* ── Main video area ── */}
      <Box style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Priority: screen share → remote video → waiting */}
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
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <Avatar
              src={contactAvatar}
              size={110}
              radius="50%"
              color="brand"
              style={{ border: '3px solid rgba(255,255,255,0.14)', fontSize: 36 }}
            >
              {getInitials(contactName)}
            </Avatar>
            <Text c="rgba(255,255,255,0.45)" size="sm">
              {isConnecting ? 'Connecting…' : `Waiting for ${contactName} to join`}
            </Text>
          </Box>
        )}

        {/* ── Local PiP — video on ── */}
        {localId && !camOff && (
          <Box style={{
            position: 'absolute', bottom: 96, right: 20,
            width: 168, height: 112,
            borderRadius: 14, overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.18)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
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
            position: 'absolute', bottom: 96, right: 20,
            width: 168, height: 112,
            borderRadius: 14, overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.1)',
            background: '#1a1a2e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}>
            <Avatar src={myAvatar} size={52} radius="50%" color="brand">
              {getInitials(myName)}
            </Avatar>
          </Box>
        )}

        {/* Screen share indicator badge */}
        {isSharingScreen && (
          <Box style={{
            position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--mantine-color-brand-6)',
            color: '#fff', borderRadius: 20, padding: '4px 14px',
            fontSize: 12, fontWeight: 600, zIndex: 3,
          }}>
            You are sharing your screen
          </Box>
        )}

        {/* Remote audio playback */}
        <DailyAudio />
      </Box>

      {/* ── Controls bar ── */}
      <Box style={{
        padding: '20px 0 32px',
        background: 'linear-gradient(0deg,rgba(0,0,0,0.85) 0%,transparent 100%)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20,
        zIndex: 3,
      }}>

        <Tooltip label={muted ? 'Unmute mic' : 'Mute mic'} withArrow color="dark">
          <ActionIcon
            size={60} radius="50%"
            style={muted ? CTRL_BTN_ACTIVE : CTRL_BTN}
            onClick={toggleMic}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted
              ? <LuMicOff size={24} color="white" />
              : <LuMic    size={24} color="white" />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label={camOff ? 'Turn camera on' : 'Turn camera off'} withArrow color="dark">
          <ActionIcon
            size={60} radius="50%"
            style={camOff ? CTRL_BTN_ACTIVE : CTRL_BTN}
            onClick={toggleCam}
            aria-label={camOff ? 'Camera on' : 'Camera off'}
          >
            {camOff
              ? <LuVideoOff size={24} color="white" />
              : <LuVideo    size={24} color="white" />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label={isSharingScreen ? 'Stop sharing screen' : 'Share screen'} withArrow color="dark">
          <ActionIcon
            size={60} radius="50%"
            style={isSharingScreen ? CTRL_BTN_SCREEN : CTRL_BTN}
            onClick={toggleScreen}
            aria-label={isSharingScreen ? 'Stop share' : 'Share screen'}
          >
            {isSharingScreen
              ? <LuMonitorOff size={24} color="white" />
              : <LuMonitor    size={24} color="white" />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="End call" withArrow color="dark">
          <ActionIcon
            size={60} radius="50%"
            style={{ ...CTRL_BTN, background: '#e03131' }}
            onClick={endCall}
            aria-label="End call"
          >
            <LuPhoneOff size={24} color="white" />
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
