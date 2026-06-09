import { useEffect, useRef, useState } from 'react';
import {
  Avatar, Box, Button, Divider, Group, NumberInput, Paper,
  SimpleGrid, Stack, Switch, Text, TextInput, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuUser, LuBuilding2, LuBot, LuBell, LuSave,
  LuMail, LuPhone, LuTag, LuCamera, LuLock,
  LuUsers, LuFolder, LuBookOpen, LuBrain, LuShield,
} from 'react-icons/lu';
import { useAppDispatch, useAppSelector } from '../../../Redux/hooks';
import { updateSchool, updateUser } from '../../../Redux/slices/authSlice';
import { fetchMyProfile, updateMyProfile, fileToAvatarDataUrl } from '../../../supabase/profile';
import { supabase } from '../../../supabase/client';
import { fetchDashboardData, fetchAnalyticsData } from '../../../supabase/adminStats';

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
      <Switch checked={checked} onChange={e => onChange(e.currentTarget.checked)} color="brand" size="md" />
    </Group>
  );
}

// ── Stat chip ──────────────────────────────────────────────────────────────────

function StatChip({ value, label, color, icon: Icon }: {
  value: string | number; label: string; color: string; icon: React.ElementType;
}) {
  return (
    <Box p="md" style={{ borderRadius: 10, background: `${color}10`, border: `1.5px solid ${color}28`, textAlign: 'center' }}>
      <Group justify="center" gap={6} mb={4}>
        <Icon size={14} style={{ color }} />
      </Group>
      <Text fw={800} size="xl" lh={1} style={{ color }}>{value}</Text>
      <Text size="xs" c="dimmed" mt={6} fw={500}>{label}</Text>
    </Box>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const dispatch   = useAppDispatch();
  const user       = useAppSelector(s => s.auth.user);
  const schoolName = useAppSelector(s => s.auth.schoolName);

  const fileInputRef              = useRef<HTMLInputElement>(null);
  const logoInputRef              = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hovered, setHovered]     = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name:        user?.name  || '',
    title:       'School Administrator',
    phone:       '',
    institution: user?.institutionName ?? schoolName ?? '',
  });

  const [stats, setStats] = useState({ researchers: 0, activeProjects: 0, publications: 0 });

  // ── Fetch real profile data (name / phone / avatar / institution logo) ─────
  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      fetchMyProfile(user.id),
      supabase.from('users').select('institution_logo').eq('id', user.id).maybeSingle(),
    ]).then(([p, { data: logoRow }]) => {
      if (p) {
        setProfile(prev => ({ ...prev, name: p.name ?? prev.name, phone: p.phone ?? '' }));
        setAvatarUrl(p.avatar_url ?? null);
      }
      const persistedLogo = logoRow?.institution_logo ?? null;
      setLogoDataUrl(persistedLogo);
      if (persistedLogo) dispatch(updateSchool({ schoolLogo: persistedLogo }));
    });
  }, [user?.id, dispatch]);

  // ── Fetch real institution-wide activity snapshot ──────────────────────────
  useEffect(() => {
    const institutionId = user?.institutionId;
    if (!institutionId) return;
    Promise.all([
      fetchDashboardData(institutionId),
      fetchAnalyticsData(institutionId),
    ]).then(([dashboard, analytics]) => {
      setStats({
        researchers:    dashboard.totalStudents,
        activeProjects: dashboard.activeProjects,
        publications:   analytics.totalPubs,
      });
    });
  }, [user?.institutionId]);

  const [aiPolicy, setAiPolicy] = useState({
    allowRewrite:    true,
    allowGeneration: false,
    requireEthics:   true,
    minIntegrity:    70,
  });

  const [notifPrefs, setNotifPrefs] = useState({
    criticalAlerts:  true,
    weeklyReport:    true,
    ethicsAlerts:    true,
    systemUpdates:   false,
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
      notifications.show({ title: 'Photo selected', message: 'Click "Save Settings" to apply your new profile photo.', color: 'brand' });
    } catch (err) {
      notifications.show({ title: 'Upload failed', message: err instanceof Error ? err.message : 'Could not process the image.', color: 'red' });
    } finally {
      e.target.value = '';
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file, 160);
      setLogoDataUrl(dataUrl);
      notifications.show({ title: 'Logo selected', message: 'Click "Save Settings" to apply your new institution logo.', color: 'brand' });
    } catch (err) {
      notifications.show({ title: 'Upload failed', message: err instanceof Error ? err.message : 'Could not process the image.', color: 'red' });
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateMyProfile(user.id, { name: profile.name.trim(), phone: profile.phone.trim(), avatarUrl });
      const { error } = await supabase.from('users')
        .update({ institution_name: profile.institution.trim(), institution_logo: logoDataUrl })
        .eq('id', user.id);
      if (error) throw new Error(error.message);
      dispatch(updateUser({ name: profile.name.trim(), avatar: avatarUrl ?? undefined }));
      dispatch(updateSchool({ schoolName: profile.institution, schoolLogo: logoDataUrl ?? undefined }));
      notifications.show({
        title:   'Settings saved',
        message: 'Your profile and institution settings have been updated successfully.',
        color:   'green',
      });
    } catch (err) {
      notifications.show({ title: 'Save failed', message: err instanceof Error ? err.message : 'Could not save your settings.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Settings</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Manage your admin profile, institution details, and platform-wide policies.
        </Text>
      </Box>

      <Stack gap="lg">

        {/* ── Admin Profile ── */}
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
            </SimpleGrid>

            {/* Locked fields */}
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
                description="Assigned by the platform"
                leftSection={<LuUser size={14} color="#adb5bd" />}
                rightSection={<LuLock size={13} color="#adb5bd" />}
                value={user?.role ?? ''}
                readOnly
                styles={{ input: { cursor: 'not-allowed', color: '#495057', background: '#f8f9fa' }, description: { color: '#adb5bd' } }}
              />
              <TextInput
                label="Institution ID"
                description="Your unique institution identifier"
                leftSection={<LuBuilding2 size={14} color="#adb5bd" />}
                rightSection={<LuLock size={13} color="#adb5bd" />}
                value={user?.institutionId ?? ''}
                readOnly
                styles={{ input: { cursor: 'not-allowed', color: '#495057', background: '#f8f9fa', fontFamily: 'monospace', fontWeight: 700 }, description: { color: '#adb5bd' } }}
              />
            </SimpleGrid>
          </Box>
        </Paper>

        {/* ── Institution Details ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader
            icon={LuBuilding2}
            title="Institution Details"
            subtitle="Your institution's name, logo, and live activity snapshot"
          />

          {/* School logo upload */}
          <Group gap="lg" mb="lg" align="center">
            <Box
              style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => logoInputRef.current?.click()}
              onMouseEnter={() => setLogoHovered(true)}
              onMouseLeave={() => setLogoHovered(false)}
            >
              <Avatar
                src={logoDataUrl ?? undefined}
                size={72}
                radius="md"
                color="brand"
                style={{ border: '2px dashed var(--mantine-color-brand-4)', fontSize: 22, fontWeight: 700 }}
              >
                {profile.institution.charAt(0).toUpperCase()}
              </Avatar>
              {logoHovered && (
                <Box style={{
                  position: 'absolute', inset: 0, borderRadius: 8,
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <LuCamera size={22} color="white" />
                </Box>
              )}
              <Box style={{
                position: 'absolute', bottom: -6, right: -6,
                width: 22, height: 22, borderRadius: '50%',
                background: '#3b5bdb', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LuCamera size={10} color="white" />
              </Box>
            </Box>
            <Box>
              <Text size="sm" fw={600}>School Logo</Text>
              <Text size="xs" c="dimmed" mt={2}>Shown in the app header for all users</Text>
              <Text size="xs" c="dimmed">PNG, JPG · max 2 MB · click to upload</Text>
            </Box>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
          </Group>

          <TextInput
            label="Institution Name"
            leftSection={<LuBuilding2 size={14} color="#868e96" />}
            value={profile.institution}
            onChange={e => setProfile(p => ({ ...p, institution: e.target.value }))}
            mb="lg"
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <StatChip value={stats.researchers}    label="Total Researchers"  color="#3b5bdb" icon={LuUsers}    />
            <StatChip value={stats.activeProjects} label="Active Projects"    color="#0c8599" icon={LuFolder}   />
            <StatChip value={stats.publications}   label="Publications (YTD)" color="#2f9e44" icon={LuBookOpen} />
          </SimpleGrid>
        </Paper>

        {/* ── AI Policy ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader
            icon={LuBot}
            title="AI Policy  —  Institution-wide"
            subtitle="Control which AI features are available to all researchers"
          />
          <Stack gap={0} mb="xl">
            <ToggleRow
              label="Allow AI Rewrite Suggestions"
              description="Researchers can use AI to rephrase and improve individual sentences"
              checked={aiPolicy.allowRewrite}
              onChange={v => setAiPolicy(p => ({ ...p, allowRewrite: v }))}
            />
            <ToggleRow
              label="Allow Full AI Generation"
              description="Researchers can generate entire sections or paragraphs using AI"
              checked={aiPolicy.allowGeneration}
              onChange={v => setAiPolicy(p => ({ ...p, allowGeneration: v }))}
            />
            <ToggleRow
              label="Require Ethics Clearance Before Export"
              description="Projects must have a valid ethics approval before they can be exported or submitted"
              checked={aiPolicy.requireEthics}
              onChange={v => setAiPolicy(p => ({ ...p, requireEthics: v }))}
              last
            />
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label="Minimum Integrity Score for Submission"
              description="Projects scoring below this threshold cannot be submitted"
              leftSection={<LuShield size={14} color="#868e96" />}
              value={aiPolicy.minIntegrity}
              onChange={v => setAiPolicy(p => ({ ...p, minIntegrity: Number(v) }))}
              min={0}
              max={100}
              suffix="%"
            />
            <NumberInput
              label="AI Detection Flag Threshold"
              description="Projects above this AI score are automatically flagged for review"
              leftSection={<LuBrain size={14} color="#868e96" />}
              value={30}
              min={0}
              max={100}
              suffix="%"
            />
          </SimpleGrid>
        </Paper>

        {/* ── Notification Preferences ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader
            icon={LuBell}
            title="Notification Preferences"
            subtitle="Choose which system alerts and reports you receive"
          />
          <Stack gap={0}>
            <ToggleRow
              label="Critical Compliance Alerts"
              description="Receive immediate email alerts when a critical compliance issue is detected"
              checked={notifPrefs.criticalAlerts}
              onChange={v => setNotifPrefs(p => ({ ...p, criticalAlerts: v }))}
            />
            <ToggleRow
              label="Weekly Institution Report"
              description="Receive a weekly summary of research activity, flags, and integrity scores"
              checked={notifPrefs.weeklyReport}
              onChange={v => setNotifPrefs(p => ({ ...p, weeklyReport: v }))}
            />
            <ToggleRow
              label="Ethics Review Alerts"
              description="Get notified when a project's ethics clearance is pending, expired, or flagged"
              checked={notifPrefs.ethicsAlerts}
              onChange={v => setNotifPrefs(p => ({ ...p, ethicsAlerts: v }))}
            />
            <ToggleRow
              label="Platform System Updates"
              description="Receive announcements about new features, maintenance windows, and updates"
              checked={notifPrefs.systemUpdates}
              onChange={v => setNotifPrefs(p => ({ ...p, systemUpdates: v }))}
              last
            />
          </Stack>
        </Paper>

        {/* ── Save bar ── */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" fw={600}>Ready to apply changes?</Text>
              <Text size="xs" c="dimmed" mt={2}>All updates take effect immediately across the institution.</Text>
            </Box>
            <Button color="brand" size="md" leftSection={<LuSave size={15} />} loading={saving} onClick={handleSave} px="xl">
              Save Settings
            </Button>
          </Group>
        </Paper>

      </Stack>
    </Box>
  );
}
