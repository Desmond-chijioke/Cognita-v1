import { useRef, useState } from 'react';
import {
  Avatar, Box, Button, Divider, Group, NumberInput, Paper,
  Select, SimpleGrid, Stack, Switch, Text, TextInput, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuUser, LuBuilding2, LuShield, LuBell,
  LuSave, LuMail, LuPhone, LuTag,
  LuBot, LuFileSearch, LuCamera, LuLock,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle: string;
}) {
  return (
    <>
      <Group gap="sm" mb={6}>
        <ThemeIcon size={38} radius="md" color="brand" variant="light">
          <Icon size={18} />
        </ThemeIcon>
        <Box>
          <Text fw={700} size="md" lh={1.3}>{title}</Text>
          <Text size="xs" c="dimmed">{subtitle}</Text>
        </Box>
      </Group>
      <Divider mb="lg" mt="xs" />
    </>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────────

function ToggleRow({ label, description, checked, onChange, last = false }: {
  label: string; description: string; checked: boolean;
  onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      py="md"
      style={last ? undefined : { borderBottom: '1px solid #f1f3f5' }}
    >
      <Box style={{ flex: 1, paddingRight: 24 }}>
        <Text size="sm" fw={500}>{label}</Text>
        <Text size="xs" c="dimmed" mt={3} lh={1.5}>{description}</Text>
      </Box>
      <Switch checked={checked} onChange={e => onChange(e.currentTarget.checked)} color="brand" size="md" />
    </Group>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorSettings() {
  const user = useAppSelector(s => s.auth.user);

  const fileInputRef              = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hovered, setHovered]     = useState(false);

  const [profile, setProfile] = useState({
    name:           user?.name || 'Dr. Adebayo Ogundimu',
    title:          'Senior Lecturer & Research Supervisor',
    phone:          '+234 80 123 4567',
    department:     'Computer Science',
    specialization: 'Machine Learning & Distributed Systems',
  });

  const [notifPrefs, setNotifPrefs] = useState({
    submissionAlerts:  true,
    complianceAlerts:  true,
    approvalRequests:  true,
    reviewReminders:   true,
    weeklyDigest:      false,
  });

  const [supPrefs, setSupPrefs] = useState({
    similarityThreshold: 25,
    aiThreshold:         30,
    autoReminders:       true,
    reminderFrequency:   '7',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
    notifications.show({ title: 'Photo updated', message: 'Your profile photo has been changed.', color: 'brand' });
  };

  const handleSave = () =>
    notifications.show({
      title:   'Settings saved',
      message: 'Your settings have been updated successfully.',
      color:   'green',
    });

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Settings</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Manage your profile, supervision preferences, and notification settings.
        </Text>
      </Box>

      <Stack gap="lg">

        {/* ── Supervisor Profile ── */}
        <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>

          {/* Gradient banner */}
          <Box style={{ position: 'relative', height: 100, background: 'linear-gradient(120deg, #3b5bdb 0%, #748ffc 100%)' }}>
            <Box
              style={{ position: 'absolute', bottom: -40, left: 32, cursor: 'pointer', borderRadius: 14, zIndex: 1 }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <Avatar
                src={avatarUrl ?? undefined}
                color="brand"
                radius="xl"
                size={84}
                style={{ border: '3px solid white', boxShadow: '0 6px 20px rgba(59,91,219,0.3)', fontSize: 26, fontWeight: 700 }}
              >
                {getInitials(profile.name)}
              </Avatar>

              {hovered && (
                <Box style={{
                  position: 'absolute', inset: 0, borderRadius: 14,
                  background: 'rgba(0,0,0,0.48)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <LuCamera size={24} color="white" />
                </Box>
              )}

              <Box style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 26, height: 26, borderRadius: '50%',
                background: '#3b5bdb', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LuCamera size={12} color="white" />
              </Box>
            </Box>

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
          </Box>

          <Box px="xl" pb="xl">
            <Group justify="space-between" align="center" mt={52} mb="lg" wrap="nowrap">
              <Box>
                <Text fw={700} size="lg" lh={1.2}>{profile.name}</Text>
                <Text size="sm" c="dimmed" mt={2}>{profile.title}</Text>
              </Box>
              <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                Click photo to update
              </Text>
            </Group>

            <Divider mb="lg" />

            {/* Editable fields */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="md">
              <TextInput
                label="Full Name"
                leftSection={<LuUser size={14} color="#868e96" />}
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              />
              <TextInput
                label="Title / Position"
                leftSection={<LuTag size={14} color="#868e96" />}
                value={profile.title}
                onChange={e => setProfile(p => ({ ...p, title: e.target.value }))}
              />
              <TextInput
                label="Phone Number"
                leftSection={<LuPhone size={14} color="#868e96" />}
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              />
              <TextInput
                label="Department"
                leftSection={<LuBuilding2 size={14} color="#868e96" />}
                value={profile.department}
                onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
              />
              <TextInput
                label="Specialization"
                leftSection={<LuFileSearch size={14} color="#868e96" />}
                value={profile.specialization}
                onChange={e => setProfile(p => ({ ...p, specialization: e.target.value }))}
              />
            </SimpleGrid>

            {/* Locked fields */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label="Email Address"
                description="Managed by your institution"
                leftSection={<LuMail size={14} color="#adb5bd" />}
                rightSection={<LuLock size={13} color="#adb5bd" />}
                value={user?.email || 'a.ogundimu@university.ac'}
                disabled
                styles={{ input: { cursor: 'not-allowed', color: '#868e96', background: '#f8f9fa' }, description: { color: '#adb5bd' } }}
              />
              <TextInput
                label="Role"
                description="Assigned by your institution"
                leftSection={<LuUser size={14} color="#adb5bd" />}
                rightSection={<LuLock size={13} color="#adb5bd" />}
                value={user?.role || 'Supervisor'}
                disabled
                styles={{ input: { cursor: 'not-allowed', color: '#868e96', background: '#f8f9fa' }, description: { color: '#adb5bd' } }}
              />
            </SimpleGrid>
          </Box>
        </Paper>

        {/* ── Supervision Preferences ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader
            icon={LuShield}
            title="Supervision Preferences"
            subtitle="Set compliance thresholds and automated reminder behaviour"
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="xl">
            <NumberInput
              label="Similarity Flag Threshold"
              description="Flag students above this %"
              leftSection={<LuFileSearch size={14} color="#868e96" />}
              value={supPrefs.similarityThreshold}
              onChange={v => setSupPrefs(p => ({ ...p, similarityThreshold: Number(v) }))}
              min={0} max={100} suffix="%"
            />
            <NumberInput
              label="AI Detection Threshold"
              description="Flag students above this %"
              leftSection={<LuBot size={14} color="#868e96" />}
              value={supPrefs.aiThreshold}
              onChange={v => setSupPrefs(p => ({ ...p, aiThreshold: Number(v) }))}
              min={0} max={100} suffix="%"
            />
            <Select
              label="Review Reminder Frequency"
              description="How often to remind about pending reviews"
              value={supPrefs.reminderFrequency}
              onChange={v => setSupPrefs(p => ({ ...p, reminderFrequency: v ?? '7' }))}
              data={[
                { value: '3',  label: 'Every 3 days'  },
                { value: '7',  label: 'Every 7 days'  },
                { value: '14', label: 'Every 14 days' },
                { value: '30', label: 'Monthly'       },
              ]}
            />
          </SimpleGrid>
          <Stack gap={0}>
            <ToggleRow
              label="Auto-send Review Reminders"
              description="Automatically remind students when a submitted section has not been reviewed within the set frequency"
              checked={supPrefs.autoReminders}
              onChange={v => setSupPrefs(p => ({ ...p, autoReminders: v }))}
              last
            />
          </Stack>
        </Paper>

        {/* ── Notification Preferences ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader
            icon={LuBell}
            title="Notification Preferences"
            subtitle="Choose which alerts and digests you receive by email"
          />
          <Stack gap={0}>
            <ToggleRow
              label="Student Submission Alerts"
              description="Get notified immediately when a student submits a chapter or section for review"
              checked={notifPrefs.submissionAlerts}
              onChange={v => setNotifPrefs(p => ({ ...p, submissionAlerts: v }))}
            />
            <ToggleRow
              label="Compliance Flag Alerts"
              description="Receive alerts when a student's similarity or AI detection score exceeds your set thresholds"
              checked={notifPrefs.complianceAlerts}
              onChange={v => setNotifPrefs(p => ({ ...p, complianceAlerts: v }))}
            />
            <ToggleRow
              label="Approval Request Alerts"
              description="Get notified when a student submits an ethics clearance, extension, or submission approval request"
              checked={notifPrefs.approvalRequests}
              onChange={v => setNotifPrefs(p => ({ ...p, approvalRequests: v }))}
            />
            <ToggleRow
              label="Pending Review Reminders"
              description="Receive reminders when a submitted section has been waiting for your review for more than 3 days"
              checked={notifPrefs.reviewReminders}
              onChange={v => setNotifPrefs(p => ({ ...p, reviewReminders: v }))}
            />
            <ToggleRow
              label="Weekly Supervision Digest"
              description="Receive a weekly summary of all student activity, progress, and compliance status every Monday"
              checked={notifPrefs.weeklyDigest}
              onChange={v => setNotifPrefs(p => ({ ...p, weeklyDigest: v }))}
              last
            />
          </Stack>
        </Paper>

        {/* ── Save bar ── */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" fw={600}>Ready to apply changes?</Text>
              <Text size="xs" c="dimmed" mt={2}>All updates take effect immediately.</Text>
            </Box>
            <Button color="brand" size="md" leftSection={<LuSave size={15} />} onClick={handleSave} px="xl">
              Save Settings
            </Button>
          </Group>
        </Paper>

      </Stack>
    </Box>
  );
}
