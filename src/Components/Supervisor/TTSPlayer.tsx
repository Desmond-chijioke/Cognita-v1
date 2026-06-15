import { useState } from 'react';
import { ActionIcon, Box, Group, Select, Text, Tooltip } from '@mantine/core';
import { LuPlay, LuPause, LuSquare, LuVolume2 } from 'react-icons/lu';
import { useTTS } from '../../hooks/useTTS';

const RATES = [
  { value: '0.75', label: '0.75×' },
  { value: '1',    label: '1×'    },
  { value: '1.25', label: '1.25×' },
  { value: '1.5',  label: '1.5×'  },
  { value: '2',    label: '2×'    },
];

const BRAND = '#3b5bdb';

/**
 * Self-contained TTS player bar.
 * Each card gets its own instance, so state (playing / paused / idle)
 * is fully independent per chapter. Playing a new chapter automatically
 * resets any other that's still speaking via the browser's cancel() cascade.
 */
export default function TTSPlayer({ text }: { text: string }) {
  const [rate, setRate]           = useState('1');
  const { play, pause, resume, stop, status, supported } = useTTS();

  if (!supported || !text?.trim()) return null;

  const isIdle     = status === 'idle';
  const isSpeaking = status === 'speaking';
  const isPaused   = status === 'paused';

  const borderColor = isSpeaking ? '#748ffc' : isPaused ? '#ffa94d' : '#dee2e6';
  const bgColor     = isSpeaking ? '#eef2ff'  : isPaused ? '#fff8f0'  : '#f8f9fa';
  const iconColor   = isSpeaking ? BRAND       : isPaused ? '#f08c00'  : '#adb5bd';

  return (
    <Group
      gap={8}
      px={12}
      py={6}
      style={{
        background:   bgColor,
        border:       `1.5px solid ${borderColor}`,
        borderRadius: 10,
        transition:   'background 0.2s, border-color 0.2s',
        flexWrap:     'nowrap',
        alignItems:   'center',
      }}
    >
      {/* Speaker icon — pulses when active */}
      <Box style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <LuVolume2 size={15} color={iconColor} />
      </Box>

      {/* Play / Pause toggle */}
      {isSpeaking ? (
        <Tooltip label="Pause" withArrow>
          <ActionIcon
            size="sm"
            variant="light"
            color="orange"
            onClick={pause}
            style={{ flexShrink: 0 }}
          >
            <LuPause size={13} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <Tooltip label={isPaused ? 'Resume' : 'Play'} withArrow>
          <ActionIcon
            size="sm"
            variant="light"
            color="brand"
            onClick={() => isPaused ? resume() : play(text, parseFloat(rate))}
            style={{ flexShrink: 0 }}
          >
            <LuPlay size={13} />
          </ActionIcon>
        </Tooltip>
      )}

      {/* Stop — only visible while speaking or paused */}
      {!isIdle && (
        <Tooltip label="Stop" withArrow>
          <ActionIcon
            size="sm"
            variant="light"
            color="red"
            onClick={stop}
            style={{ flexShrink: 0 }}
          >
            <LuSquare size={12} />
          </ActionIcon>
        </Tooltip>
      )}

      {/* Status label */}
      <Text
        size="xs"
        fw={isIdle ? 400 : 500}
        c={isSpeaking ? 'brand' : isPaused ? 'orange' : 'dimmed'}
        style={{ flex: 1, minWidth: 0, userSelect: 'none' }}
      >
        {isSpeaking
          ? 'Reading aloud…'
          : isPaused
          ? 'Paused — press play to resume'
          : 'Listen to chapter'}
      </Text>

      {/* Playback speed */}
      <Select
        data={RATES}
        value={rate}
        onChange={v => {
          if (!v) return;
          setRate(v);
          // If currently speaking, stop so the user re-presses play at new speed
          if (isSpeaking) stop();
        }}
        size="xs"
        w={78}
        comboboxProps={{ withinPortal: true }}
        styles={{ input: { fontSize: 11, paddingLeft: 8 } }}
        disabled={isPaused}
      />
    </Group>
  );
}
