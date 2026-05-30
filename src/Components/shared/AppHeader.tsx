import {
  ActionIcon, Avatar, Box, Burger, Center, Divider,
  Group, Image, Modal, Stack, Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { LuBell } from 'react-icons/lu';
import { useAppSelector } from '../../Redux/hooks';
import Logo from '../../assets/cognita-logo.png';

interface AppHeaderProps {
  navItems: unknown[];
  opened: boolean;
  onToggle: () => void;
}

export default function AppHeader({ opened, onToggle }: AppHeaderProps) {
  const user       = useAppSelector(state => state.auth.user);
  const schoolName = useAppSelector(state => state.auth.schoolName);
  const schoolLogo = useAppSelector(state => state.auth.schoolLogo);

  // Prefer institution name from Supabase profile, fall back to Redux schoolName
  const institutionName = user?.institutionName ?? schoolName ?? 'Cognita';
  const [notifOpened, { open: openNotif, close: closeNotif }] = useDisclosure();

  const initials = user?.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : '?';

  const displayLogo = schoolLogo ?? Logo;
  const displayName = institutionName;

  return (
    <>
      <Group
        h="100%"
        px="lg"
        justify="space-between"
        wrap="nowrap"
        style={{ borderBottom: '1px solid #f0f0f0' }}
      >
        {/* Left: burger (mobile) + logo */}
        <Group gap="sm" wrap="nowrap">
          <Burger opened={opened} onClick={onToggle} hiddenFrom="sm" size="sm" />
          <Group gap="sm" wrap="nowrap">
            <Image src={displayLogo} w={36} h={36} style={{ objectFit: 'contain', borderRadius: 6 }} />
            <Text fw={700} size="md" lh={1}>{displayName}</Text>
          </Group>
        </Group>

        {/* Right: bell + avatar */}
        <Group gap="sm" wrap="nowrap">
          {/* Notification bell */}
          <ActionIcon variant="subtle" color="gray" size="lg" radius="xl" onClick={openNotif}>
            <LuBell size={20} />
          </ActionIcon>

          <Divider orientation="vertical" my="xs" />

          {/* Avatar — always visible; shows uploaded image or initials fallback */}
          <Group gap="xs" wrap="nowrap" style={{ cursor: 'pointer' }}>
            <Avatar
              src={user?.avatar ?? null}
              size={36}
              radius="xl"
              color="brand"
              variant="filled"
              style={{
                border: '2px solid var(--mantine-color-brand-3)',
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>

            {/* Name + role — only on desktop */}
            <Box visibleFrom="sm">
              <Text size="sm" fw={600} lh={1.2} style={{ textTransform: 'capitalize' }}>
                {user?.name ?? ''}
              </Text>
              <Text size="xs" c="dimmed" lh={1.4}>{user?.role ?? ''}</Text>
            </Box>
          </Group>
        </Group>
      </Group>

      {/* Notification modal */}
      <Modal
        opened={notifOpened}
        onClose={closeNotif}
        title="Notifications"
        centered
        size="md"
        overlayProps={{ color: 'brand', opacity: 0.6, blur: 1 }}
      >
        <Center py={48}>
          <Stack align="center" gap="sm">
            <LuBell size={48} color="#adb5bd" />
            <Text fw={600} c="dimmed">No notifications yet</Text>
            <Text size="sm" c="dimmed" ta="center">
              You're all caught up. Check back later for updates.
            </Text>
          </Stack>
        </Center>
      </Modal>
    </>
  );
}
