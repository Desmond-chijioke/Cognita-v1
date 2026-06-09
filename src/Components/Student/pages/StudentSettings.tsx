import { useEffect, useRef, useState } from 'react';
import {
  Avatar, Box, Button, Divider, Group, Loader, Paper, Select, SimpleGrid,
  Stack, Switch, Text, TextInput, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuUser, LuBuilding2, LuBot, LuBell, LuSave, LuMail,
  LuLock, LuFileText, LuCamera, LuTag, LuShield, LuPhone,
} from 'react-icons/lu';
import { useAppDispatch, useAppSelector } from '../../../Redux/hooks';
import { updateUser } from '../../../Redux/slices/authSlice';
import { supabase } from '../../../supabase/client';
import { fetchMyProfile, updateMyProfile, fileToAvatarDataUrl } from '../../../supabase/profile';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle: string;
}) {
  return (
    <>
      <Group gap="sm" mb={6}>
        <ThemeIcon size={38} radius="md" color="brand" variant="light"><Icon size={18} /></ThemeIcon>
        <Box>
          <Text fw={700} size="md" lh={1.3}>{title}</Text>
          <Text size="xs" c="dimmed">{subtitle}</Text>
        </Box>
      </Group>
      <Divider mb="lg" mt="xs" />
    </>
  );
}

function ToggleRow({ label, description, checked, onChange, last = false }: {
  label: string; description: string; checked: boolean;
  onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" py="md"
      style={last ? undefined : { borderBottom: '1px solid #f1f3f5' }}>
      <Box style={{ flex: 1, paddingRight: 24 }}>
        <Text size="sm" fw={500}>{label}</Text>
        <Text size="xs" c="dimmed" mt={3} lh={1.5}>{description}</Text>
      </Box>
      <Switch checked={checked} onChange={e => onChange(e.currentTarget.checked)} color="brand" size="md" />
    </Group>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function StudentSettings() {
  const dispatch     = useAppDispatch();
  const authUser     = useAppSelector(s => s.auth.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hovered,   setHovered]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  // ── Editable identity fields ───────────────────────────────────────────────
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');

  // ── Profile fields from Supabase ───────────────────────────────────────────
  const [matricNo,    setMatricNo]    = useState('');
  const [degreeLevel, setDegreeLevel] = useState('');
  const [department,  setDepartment]  = useState('');

  // ── Project preferences ────────────────────────────────────────────────────
  const [projectPrefs, setProjectPrefs] = useState({
    title:         '',
    discipline:    '',
    targetOutput:  '',
    targetJournal: '',
    citationStyle: 'apa',
  });

  // ── Other prefs ────────────────────────────────────────────────────────────
  const [aiPolicy, setAiPolicy] = useState({
    reviewer:   true,
    rewrites:   true,
    generation: false,
  });

  const [notifPrefs, setNotifPrefs] = useState({
    supervisorFeedback: true,
    plagiarismReminder: true,
    deadlineReminder:   true,
    weeklyDigest:       false,
  });

  // ── Fetch real profile data ────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser?.id) return;
    Promise.all([
      fetchMyProfile(authUser.id),
      supabase
        .from('users')
        .select('matric_no, degree_level, project_title, department')
        .eq('id', authUser.id)
        .single(),
    ]).then(([profile, { data }]) => {
      if (profile) {
        setName(profile.name ?? authUser.name ?? '');
        setPhone(profile.phone ?? '');
        setAvatarUrl(profile.avatar_url ?? null);
      }
      if (data) {
        setMatricNo(data.matric_no      ?? '');
        setDegreeLevel(data.degree_level  ?? '');
        setDepartment(data.department    ?? authUser.departmentName ?? '');
        setProjectPrefs(p => ({
          ...p,
          title:        data.project_title ?? '',
          discipline:   data.degree_level  ?? '',
          targetOutput: data.degree_level?.includes('PhD')
            ? 'PhD Thesis'
            : data.degree_level?.includes('Master')
            ? "Master's Dissertation"
            : 'Undergraduate Project',
        }));
      }
      setLoading(false);
    });
  }, [authUser?.id, authUser?.departmentName, authUser?.name]);

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

  const handleSave = async () => {
    if (!authUser?.id) return;
    setSaving(true);
    try {
      await updateMyProfile(authUser.id, { name: name.trim(), phone: phone.trim(), avatarUrl });
      dispatch(updateUser({ name: name.trim(), avatar: avatarUrl ?? undefined }));
      notifications.show({ title: 'Settings saved', message: 'Your profile has been updated successfully.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Save failed', message: err instanceof Error ? err.message : 'Could not save your settings.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const email       = authUser?.email           ?? '';
  const institution = authUser?.institutionName ?? '—';
  const supervisor  = authUser?.supervisorName  ?? '—';

  if (loading) {
    return (
      <Box p="xl" ta="center" pt={80}>
        <Loader size="sm" color="brand" />
        <Text size="sm" c="dimmed" mt="sm">Loading settings…</Text>
      </Box>
    );
  }

  return (
    <Box p="xl">
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Settings</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Manage your profile, project preferences, and notification settings.
        </Text>
      </Box>

      <Stack gap="lg">

        {/* ── Profile card ── */}
        <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>
          <Box style={{
            position: 'relative', height: 100,
            background: 'linear-gradient(120deg, #3b5bdb 0%, #748ffc 100%)',
          }}>
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
                {getInitials(name)}
              </Avatar>
              {hovered && (
                <Box style={{
                  position: 'absolute', inset: 0, borderRadius: 14,
                  background: 'rgba(0,0,0,0.48)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <LuCamera size={24} color="white" />
                </Box>
              )}
              <Box style={{
                position: 'absolute', bottom: 2, right: 2, width: 26, height: 26,
                borderRadius: '50%', background: '#3b5bdb', border: '2px solid white',
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
                <Text fw={700} size="lg" lh={1.2}>{name}</Text>
                <Text size="sm" c="dimmed" mt={2}>
                  {degreeLevel || authUser?.role || 'Researcher'}
                  {department ? ` · ${department}` : ''}
                </Text>
              </Box>
              <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}>
                Click photo to update
              </Text>
            </Group>
            <Divider mb="lg" />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
              <TextInput
                label="Full Name"
                leftSection={<LuUser size={14} color="#868e96" />}
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <TextInput
                label="Phone Number"
                placeholder="e.g. +234 80 000 0000"
                leftSection={<LuPhone size={14} color="#868e96" />}
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {([
                { label: 'Email Address',  value: email,        icon: LuMail      },
                { label: 'Institution',    value: institution,  icon: LuBuilding2 },
                { label: 'Matric Number',  value: matricNo || '—', icon: LuTag   },
                { label: 'Supervisor',     value: supervisor,   icon: LuUser      },
              ] as const).map(({ label, value, icon: Icon }) => (
                <TextInput
                  key={label}
                  label={label}
                  leftSection={<Icon size={14} color="#adb5bd" />}
                  rightSection={<LuLock size={13} color="#adb5bd" />}
                  value={value}
                  disabled
                  styles={{ input: { cursor: 'not-allowed', color: '#868e96', background: '#f8f9fa' } }}
                />
              ))}
            </SimpleGrid>
          </Box>
        </Paper>

        {/* ── Project Preferences ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader
            icon={LuFileText}
            title="Project Preferences"
            subtitle="Edit your thesis metadata and citation defaults"
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Project Title"
              value={projectPrefs.title}
              onChange={e => setProjectPrefs(p => ({ ...p, title: e.target.value }))}
            />
            <TextInput
              label="Discipline / Level"
              value={projectPrefs.discipline}
              onChange={e => setProjectPrefs(p => ({ ...p, discipline: e.target.value }))}
            />
            <Select
              label="Target Output"
              value={projectPrefs.targetOutput}
              onChange={v => setProjectPrefs(p => ({ ...p, targetOutput: v ?? p.targetOutput }))}
              data={['PhD Thesis', "Master's Dissertation", 'Undergraduate Project', 'Journal Article']}
            />
            <TextInput
              label="Target Journal"
              value={projectPrefs.targetJournal}
              placeholder="e.g. Nature Medicine"
              onChange={e => setProjectPrefs(p => ({ ...p, targetJournal: e.target.value }))}
            />
            <Select
              label="Default Citation Style"
              value={projectPrefs.citationStyle}
              onChange={v => setProjectPrefs(p => ({ ...p, citationStyle: v ?? 'apa' }))}
              data={[
                { value: 'apa',     label: 'APA 7th Edition' },
                { value: 'ieee',    label: 'IEEE'            },
                { value: 'chicago', label: 'Chicago'         },
              ]}
            />
          </SimpleGrid>
        </Paper>

        {/* ── AI Policy ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader
            icon={LuBot}
            title="AI Usage Policy"
            subtitle="Control how AI assists your research writing"
          />
          <Stack gap={0}>
            <ToggleRow
              label="AI Reviewer"
              description="Allow AI to review and score your sections for quality, clarity, and completeness"
              checked={aiPolicy.reviewer}
              onChange={v => setAiPolicy(p => ({ ...p, reviewer: v }))}
            />
            <ToggleRow
              label="Rewrite Suggestions"
              description="Allow AI to suggest sentence-level rewrites for flagged issues"
              checked={aiPolicy.rewrites}
              onChange={v => setAiPolicy(p => ({ ...p, rewrites: v }))}
            />
            <ToggleRow
              label="Full Section Generation"
              description="Allow AI to draft complete section content — always review AI output carefully"
              checked={aiPolicy.generation}
              onChange={v => setAiPolicy(p => ({ ...p, generation: v }))}
              last
            />
          </Stack>
          <Text size="xs" c="dimmed" mt="md"
            style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 12px' }}>
            AI interactions are processed securely. Your raw document content is never stored on external servers.
          </Text>
        </Paper>

        {/* ── Notification Preferences ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader
            icon={LuBell}
            title="Notification Preferences"
            subtitle="Choose which alerts you receive by email"
          />
          <Stack gap={0}>
            <ToggleRow
              label="Supervisor Feedback Alerts"
              description="Get notified when your supervisor leaves a comment or approves a section"
              checked={notifPrefs.supervisorFeedback}
              onChange={v => setNotifPrefs(p => ({ ...p, supervisorFeedback: v }))}
            />
            <ToggleRow
              label="Plagiarism Scan Reminders"
              description="Weekly reminders to run an integrity scan when your document has changed"
              checked={notifPrefs.plagiarismReminder}
              onChange={v => setNotifPrefs(p => ({ ...p, plagiarismReminder: v }))}
            />
            <ToggleRow
              label="Deadline Reminders"
              description="Alerts 30, 14, and 7 days before your submission deadline"
              checked={notifPrefs.deadlineReminder}
              onChange={v => setNotifPrefs(p => ({ ...p, deadlineReminder: v }))}
            />
            <ToggleRow
              label="Weekly Progress Digest"
              description="Weekly email summary of word count progress and completed milestones"
              checked={notifPrefs.weeklyDigest}
              onChange={v => setNotifPrefs(p => ({ ...p, weeklyDigest: v }))}
              last
            />
          </Stack>
        </Paper>

        {/* ── Security ── */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader icon={LuShield} title="Security" subtitle="Manage your account security" />
          <Group gap="sm">
            <Button variant="light" color="brand" size="sm">Change Password</Button>
            <Button variant="light" color="orange" size="sm">Enable Two-Factor Authentication</Button>
          </Group>
        </Paper>

        {/* ── Save bar ── */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" fw={600}>Ready to apply changes?</Text>
              <Text size="xs" c="dimmed" mt={2}>All updates take effect immediately.</Text>
            </Box>
            <Button
              color="brand" size="md"
              leftSection={<LuSave size={15} />}
              px="xl"
              loading={saving}
              onClick={handleSave}
            >
              Save Settings
            </Button>
          </Group>
        </Paper>

      </Stack>
    </Box>
  );
}
