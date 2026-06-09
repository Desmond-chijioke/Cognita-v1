import { ActionIcon, Box, Button, Modal, Stack, Text, ThemeIcon } from '@mantine/core';
import { LuPhone, LuVideo, LuX } from 'react-icons/lu';

type CallType = 'voice' | 'video';

interface Props {
  opened:    boolean;
  callType:  CallType;
  contactName: string;
  onClose:   () => void;
}

const CONFIG = {
  voice: {
    icon:     LuPhone,
    label:    'Voice Call',
    color:    'green' as const,
    iconBg:   '#d3f9d8',
    desc:     'One-tap audio calls directly inside Cognita — no external apps needed.',
  },
  video: {
    icon:     LuVideo,
    label:    'Video Call',
    color:    'brand' as const,
    iconBg:   'var(--mantine-color-brand-0)',
    desc:     'Face-to-face supervision sessions, viva prep, and group calls — all in one place.',
  },
};

export default function ComingSoonCallModal({ opened, callType, contactName, onClose }: Props) {
  const cfg  = CONFIG[callType];
  const Icon = cfg.icon;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="sm"
      withCloseButton={false}
      overlayProps={{ color: 'var(--mantine-color-brand-9)', backgroundOpacity: 0.55, blur: 3 }}
      radius="lg"
      padding="xl"
    >
      <Stack align="center" gap="md">

        {/* Close button */}
        <Box style={{ position: 'absolute', top: 12, right: 12 }}>
          <ActionIcon variant="subtle" color="gray" radius="xl" onClick={onClose}>
            <LuX size={16} />
          </ActionIcon>
        </Box>

        {/* Icon */}
        <Box style={{
          width: 80, height: 80, borderRadius: '50%',
          background: cfg.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ThemeIcon size={44} radius="xl" color={cfg.color} variant="light">
            <Icon size={22} />
          </ThemeIcon>
        </Box>

        {/* Heading */}
        <Box ta="center">
          <Text fw={800} size="lg" style={{ fontFamily: 'Playfair Display, serif' }}>
            {cfg.label} — Coming Soon
          </Text>
          <Text size="sm" c="dimmed" mt={6}>
            with <Text component="span" fw={600} c="dark">{contactName}</Text>
          </Text>
        </Box>

        {/* Description */}
        <Box
          p="md"
          style={{
            background: '#f8f9fa',
            borderRadius: 10,
            border: '1px solid #e9ecef',
            width: '100%',
          }}
        >
          <Text size="sm" c="dimmed" ta="center" lh={1.6}>
            {cfg.desc}
          </Text>
          <Text size="xs" c="dimmed" ta="center" mt={8} fw={500}>
            This feature is actively being built and will be available in a future update.
          </Text>
        </Box>

        <Button fullWidth color={cfg.color} radius="xl" onClick={onClose}>
          Got it
        </Button>
      </Stack>
    </Modal>
  );
}
