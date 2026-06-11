import { useEffect, useRef, useState } from 'react';
import {
  Avatar, Box, Button, Divider, Group, Paper,
  SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { LuUser, LuBuilding, LuMail, LuPhone, LuTag, LuSave, LuCamera, LuLock } from 'react-icons/lu';
import { useAppDispatch, useAppSelector } from '../../../Redux/hooks';
import { updateUser } from '../../../Redux/slices/authSlice';
import { fetchMyProfile, updateMyProfile, fileToAvatarDataUrl } from '../../../supabase/profile';

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
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

export default function FacultySettings() {
  const dispatch        = useAppDispatch();
  const user            = useAppSelector(s => s.auth.user);
  const institutionId   = user?.institutionId   ?? '';
  const institutionName = user?.institutionName ?? '';
  const facultyName     = user?.departmentName  ?? '';

  const fileInputRef              = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hovered,   setHovered]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  const [profile, setProfile] = useState({ name: user?.name || '', title: 'Dean', phone: '' });

  useEffect(() => {
    if (!user?.id) return;
    fetchMyProfile(user.id).then(p => {
      if (!p) return;
      setProfile(prev => ({ ...prev, name: p.name ?? prev.name, phone: p.phone ?? '' }));
      setAvatarUrl(p.avatar_url ?? null);
    });
  }, [user?.id]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
      notifications.show({ title: 'Photo selected', message: 'Save settings to apply.', color: 'brand' });
    } catch (err) {
      notifications.show({ title: 'Upload failed', message: err instanceof Error ? err.message : 'Could not process image.', color: 'red' });
    } finally { e.target.value = ''; }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateMyProfile(user.id, { name: profile.name.trim(), phone: profile.phone.trim(), avatarUrl });
      dispatch(updateUser({ name: profile.name.trim(), avatar: avatarUrl ?? undefined }));
      notifications.show({ title: 'Settings saved', message: 'Profile updated successfully.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Save failed', message: err instanceof Error ? err.message : 'Could not save.', color: 'red' });
    } finally { setSaving(false); }
  };

  return (
    <Box p="xl">
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Faculty Settings</Title>
        <Text size="sm" c="dimmed" mt={4}>Manage your profile and faculty configuration.</Text>
      </Box>

      <Stack gap="lg">
        {/* Profile card */}
        <Paper withBorder radius="md" bg="white" style={{ overflow: 'hidden' }}>
          <Box style={{ position: 'relative', height: 100, background: 'linear-gradient(120deg, #0c8599 0%, #38d9a9 100%)' }}>
            <Box
              style={{ position: 'absolute', bottom: -40, left: 32, cursor: 'pointer', borderRadius: 14, zIndex: 1 }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <Avatar src={avatarUrl ?? undefined} color="teal" radius="xl" size={84}
                style={{ border: '3px solid white', boxShadow: '0 6px 20px rgba(12,133,153,0.3)', fontSize: 26, fontWeight: 700 }}>
                {getInitials(profile.name)}
              </Avatar>
              {hovered && (
                <Box style={{ position: 'absolute', inset: 0, borderRadius: 14, background: 'rgba(0,0,0,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LuCamera size={24} color="white" />
                </Box>
              )}
              <Box style={{ position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: '50%', background: '#0c8599', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LuCamera size={12} color="white" />
              </Box>
            </Box>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
          </Box>

          <Box px="xl" pb="xl">
            <Group justify="space-between" align="center" mt={52} mb="lg" wrap="nowrap">
              <Box>
                <Text fw={700} size="lg" lh={1.2}>{profile.name}</Text>
                <Text size="sm" c="dimmed" mt={2}>{profile.title} · {facultyName}</Text>
              </Box>
              <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                Click photo to update
              </Text>
            </Group>

            <Divider mb="lg" />

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="md">
              <TextInput label="Full Name" placeholder="e.g. Prof. Jane Doe" leftSection={<LuUser size={14} color="#868e96" />}
                value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
              <TextInput label="Title / Position" placeholder="e.g. Dean of Faculty" leftSection={<LuTag size={14} color="#868e96" />}
                value={profile.title} onChange={e => setProfile(p => ({ ...p, title: e.target.value }))} />
              <TextInput label="Phone Number" placeholder="+234 80 000 0000" leftSection={<LuPhone size={14} color="#868e96" />}
                value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput label="Email Address" description="Cannot be changed" leftSection={<LuMail size={14} color="#adb5bd" />}
                rightSection={<LuLock size={13} color="#adb5bd" />} value={user?.email ?? ''} readOnly
                styles={{ input: { cursor: 'not-allowed', color: '#495057', background: '#f8f9fa' }, description: { color: '#adb5bd' } }} />
              <TextInput label="Role" description="Assigned by institution" leftSection={<LuUser size={14} color="#adb5bd" />}
                rightSection={<LuLock size={13} color="#adb5bd" />} value={user?.role ?? ''} readOnly
                styles={{ input: { cursor: 'not-allowed', color: '#495057', background: '#f8f9fa' }, description: { color: '#adb5bd' } }} />
            </SimpleGrid>
          </Box>
        </Paper>

        {/* Faculty info */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <SectionHeader icon={LuBuilding} title="Faculty Information" subtitle="Your faculty and institution details" />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput label="Faculty Name" value={facultyName} readOnly
              styles={{ input: { background: '#f8f9fa', cursor: 'not-allowed', color: '#495057' } }} />
            <TextInput label="Institution" value={institutionName} readOnly
              styles={{ input: { background: '#f8f9fa', cursor: 'not-allowed', color: '#495057' } }} />
            <TextInput label="Institution ID" value={institutionId} readOnly
              styles={{ input: { background: '#f8f9fa', cursor: 'not-allowed', color: '#495057', fontFamily: 'monospace', fontWeight: 700 } }} />
          </SimpleGrid>
        </Paper>

        {/* Save bar */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" fw={600}>Ready to apply changes?</Text>
              <Text size="xs" c="dimmed" mt={2}>All updates take effect immediately.</Text>
            </Box>
            <Button color="teal" size="md" leftSection={<LuSave size={15} />} loading={saving} onClick={handleSave} px="xl">
              Save Settings
            </Button>
          </Group>
        </Paper>
      </Stack>
    </Box>
  );
}
