import { useRef, useState } from 'react';
import {
  Avatar, Box, Button, Divider, Group, NumberInput, Paper,
  SimpleGrid, Stack, Switch, Text, TextInput, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuUser, LuBuilding2, LuShield, LuBell,
  LuSave, LuMail, LuPhone, LuTag,
  LuUsers, LuBot, LuFileSearch, LuCamera,
  LuLock,
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
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
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
      <Switch
        checked={checked}
        onChange={e => onChange(e.currentTarget.checked)}
        color="brand"
        size="md"
      />
    </Group>
  );
}

// ── Stat chip ──────────────────────────────────────────────────────────────────

function StatChip({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <Box p="md" style={{ borderRadius: 10, background: `${color}10`, border: `1.5px solid ${color}28`, textAlign: 'center' }}>
      <Text fw={800} size="xl" lh={1} style={{ color }}>{value}</Text>
      <Text size="xs" c="dimmed" mt={6} fw={500}>{label}</Text>
    </Box>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HODSettings() {
  const user            = useAppSelector(s => s.auth.user);
  const students        = useAppSelector(s => s.hod.students);
  const supervisors     = useAppSelector(s => s.hod.supervisors);
  const institutionId   = user?.institutionId   ?? '';
  const institutionName = user?.institutionName ?? '';
  const departmentName  = user?.departmentName  ?? '';

  const fileInputRef               = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl]  = useState<string | null>(null);
  const [hovered, setHovered]      = useState(false);

  const [profile, setProfile] = useState({
    name:  user?.name  || '',
    title: 'Head of Department',
    phone: '',
  });

  const [compliance, setCompliance] = useState({
    maxStudentsPerSupervisor: 8,
    similarityThreshold:      25,
    aiDetectionThreshold:     30,
    requireEthicsApproval:    true,
    autoAssignSupervisors:    false,
  });

  const [notifPrefs, setNotifPrefs] = useState({
    emailOnFlag:       true,
    weeklyDigest:      true,
    supervisorAlerts:  false,
    complianceReports: true,
  });

  const assigned    = students.filter(s => s.supervisorId).length;
  const assignedPct = students.length ? Math.round((assigned / students.length) * 100) : 0;

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
      message: 'Your department settings have been updated successfully.',
      color:   'green',
    });

  return (
    <Box p="xl">

      {/* ── Page header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>
          Department Settings
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Manage your profile, department configuration, and compliance policies.
        </Text>
      </Box>

      <Stack gap="lg">

        {/* ── HOD Profile ── */}
        <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>

          {/* Gradient banner with avatar positioned inside it */}
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
                style={{
                  border: '3px solid white',
                  boxShadow: '0 6px 20px rgba(59, 91, 219, 0.3)',
                  fontSize: 26,
                  fontWeight: 700,
                  display: 'block',
                }}
              >
                {getInitials(profile.name)}
              </Avatar>

              {/* Hover overlay */}
              {hovered && (
                <Box style={{
                  position: 'absolute', inset: 0, borderRadius: 14,
                  background: 'rgba(0,0,0,0.48)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <LuCamera size={24} color="white" />
                </Box>
              )}

              {/* Camera badge */}
              <Box style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 26, height: 26, borderRadius: '50%',
                background: '#3b5bdb', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LuCamera size={12} color="white" />
              </Box>
            </Box>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </Box>

          {/* Content below banner */}
          <Box px="xl" pb="xl">

            {/* Name/title preview — mt accounts for avatar sticking out of banner */}
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
                placeholder="e.g. Prof. Jane Doe"
                leftSection={<LuUser size={14} color="#868e96" />}
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              />
              <TextInput
                label="Title / Position"
                placeholder="e.g. Professor & Head of Department"
                leftSection={<LuTag size={14} color="#868e96" />}
                value={profile.title}
                onChange={e => setProfile(p => ({ ...p, title: e.target.value }))}
              />
              <TextInput
                label="Phone Number"
                placeholder="+234 80 000 0000"
                leftSection={<LuPhone size={14} color="#868e96" />}
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              />
            </SimpleGrid>

            {/* Locked fields — pulled from localStorage via Redux */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label="Email Address"
                description="Cannot be changed"
                leftSection={<LuMail size={14} color="#adb5bd" />}
                rightSection={<LuLock size={13} color="#adb5bd" />}
                value={user?.email ?? ''}
                readOnly
                styles={{ input: { cursor: 'not-allowed', color: '#495057', background: '#f8f9fa' }, description: { color: '#adb5bd' } }}
              />
              <TextInput
                label="Role"
                description="Assigned by your institution"
                leftSection={<LuUser size={14} color="#adb5bd" />}
                rightSection={<LuLock size={13} color="#adb5bd" />}
                value={user?.role ?? ''}
                readOnly
                styles={{ input: { cursor: 'not-allowed', color: '#495057', background: '#f8f9fa' }, description: { color: '#adb5bd' } }}
              />
              <TextInput
                label="Department"
                description="Your assigned department"
                leftSection={<LuBuilding2 size={14} color="#adb5bd" />}
                rightSection={<LuLock size={13} color="#adb5bd" />}
                value={departmentName}
                readOnly
                styles={{ input: { cursor: 'not-allowed', color: '#495057', background: '#f8f9fa' }, description: { color: '#adb5bd' } }}
              />
              <TextInput
                label="Institution ID"
                description="Your unique institution code"
                leftSection={<LuBuilding2 size={14} color="#adb5bd" />}
                rightSection={<LuLock size={13} color="#adb5bd" />}
                value={institutionId}
                readOnly
                styles={{ input: { cursor: 'not-allowed', color: '#495057', background: '#f8f9fa', fontFamily: 'monospace', fontWeight: 700 }, description: { color: '#adb5bd' } }}
              />
            </SimpleGrid>
          </Box>
        </Paper>

        {/* ── Department Information ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader
            icon={LuBuilding2}
            title="Department Information"
            subtitle="Your department details and current activity snapshot"
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="lg">
            <TextInput
              label="Department Name"
              value={departmentName}
              readOnly
              styles={{ input: { background: '#f8f9fa', cursor: 'not-allowed', color: '#495057' } }}
            />
            <TextInput
              label="Institution"
              value={institutionName}
              readOnly
              styles={{ input: { background: '#f8f9fa', cursor: 'not-allowed', color: '#495057' } }}
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <StatChip value={students.length}    label="Total Students" color="#3b5bdb" />
            <StatChip value={supervisors.length} label="Supervisors"    color="#0c8599" />
            <StatChip value={`${assignedPct}%`}  label="Assigned Rate"  color="#2f9e44" />
          </SimpleGrid>
        </Paper>

        {/* ── Compliance Policies ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader
            icon={LuShield}
            title="Compliance Policies"
            subtitle="Set departmental thresholds and enforcement rules"
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="xl">
            <NumberInput
              label="Max Students / Supervisor"
              description="Hard cap per supervisor"
              leftSection={<LuUsers size={14} color="#868e96" />}
              value={compliance.maxStudentsPerSupervisor}
              onChange={v => setCompliance(c => ({ ...c, maxStudentsPerSupervisor: Number(v) }))}
              min={1}
              max={50}
            />
            <NumberInput
              label="Similarity Threshold"
              description="Flags students above this %"
              leftSection={<LuFileSearch size={14} color="#868e96" />}
              value={compliance.similarityThreshold}
              onChange={v => setCompliance(c => ({ ...c, similarityThreshold: Number(v) }))}
              min={0}
              max={100}
              suffix="%"
            />
            <NumberInput
              label="AI Detection Threshold"
              description="Flags students above this %"
              leftSection={<LuBot size={14} color="#868e96" />}
              value={compliance.aiDetectionThreshold}
              onChange={v => setCompliance(c => ({ ...c, aiDetectionThreshold: Number(v) }))}
              min={0}
              max={100}
              suffix="%"
            />
          </SimpleGrid>
          <Stack gap={0}>
            <ToggleRow
              label="Require Ethics Approval"
              description="Students must upload ethics clearance before proceeding to data collection"
              checked={compliance.requireEthicsApproval}
              onChange={v => setCompliance(c => ({ ...c, requireEthicsApproval: v }))}
            />
            <ToggleRow
              label="Auto-Assign Supervisors"
              description="Automatically assign new students to supervisors based on available capacity"
              checked={compliance.autoAssignSupervisors}
              onChange={v => setCompliance(c => ({ ...c, autoAssignSupervisors: v }))}
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
              label="Email Alerts on Flags"
              description="Get notified by email whenever a student is flagged for compliance issues"
              checked={notifPrefs.emailOnFlag}
              onChange={v => setNotifPrefs(p => ({ ...p, emailOnFlag: v }))}
            />
            <ToggleRow
              label="Weekly Department Digest"
              description="Receive a weekly summary of department activity every Monday morning"
              checked={notifPrefs.weeklyDigest}
              onChange={v => setNotifPrefs(p => ({ ...p, weeklyDigest: v }))}
            />
            <ToggleRow
              label="Supervisor Inactivity Alerts"
              description="Get notified when a supervisor has not reviewed student work in over 14 days"
              checked={notifPrefs.supervisorAlerts}
              onChange={v => setNotifPrefs(p => ({ ...p, supervisorAlerts: v }))}
            />
            <ToggleRow
              label="Compliance Report Emails"
              description="Receive monthly compliance and integrity reports for your department"
              checked={notifPrefs.complianceReports}
              onChange={v => setNotifPrefs(p => ({ ...p, complianceReports: v }))}
              last
            />
          </Stack>
        </Paper>

        {/* ── Save bar ── */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" fw={600}>Ready to apply changes?</Text>
              <Text size="xs" c="dimmed" mt={2}>All updates take effect immediately across your department.</Text>
            </Box>
            <Button
              color="brand"
              size="md"
              leftSection={<LuSave size={15} />}
              onClick={handleSave}
              px="xl"
            >
              Save Settings
            </Button>
          </Group>
        </Paper>

      </Stack>
    </Box>
  );
}
