import { useEffect, useMemo, useState } from 'react';
import {
  Avatar, Badge, Box, Button, Checkbox, Group, Loader,
  Paper, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
  LuCircleCheck, LuClock, LuTriangleAlert, LuPenLine, LuBook,
  LuActivity, LuBot, LuShield, LuDownload, LuTarget,
  LuFileText, LuHash, LuTrendingUp, LuBookOpen,
} from 'react-icons/lu';
import { CHECKLIST } from '../studentData';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchStudentSubmissions, type DBSubmission } from '../../../supabase/submissions';
import { supabase } from '../../../supabase/client';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function wordCount(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function formatRelativeTime(iso: string) {
  const diffMs    = Date.now() - new Date(iso).getTime();
  const diffMins  = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays  = Math.floor(diffMs / 86_400_000);
  if (diffMins  <  1) return 'Just now';
  if (diffMins  < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays  === 1) return 'Yesterday';
  if (diffDays  <  7) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === 'approved')
    return <LuCircleCheck size={16} color="#2f9e44" />;
  if (status === 'in-progress')
    return <LuClock size={16} color="#3b5bdb" />;
  if (status === 'needs-revision')
    return <LuTriangleAlert size={16} color="#f08c00" />;
  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <circle cx={8} cy={8} r={7} fill="none" stroke="#ced4da" strokeWidth={1.5} />
    </svg>
  );
}

// ── KPI chip ──────────────────────────────────────────────────────────────────

function KpiChip({ icon: Icon, value, label, color = 'brand' }: {
  icon: React.ElementType; value: string | number; label: string; color?: string;
}) {
  return (
    <Paper withBorder p="md" radius="md" bg="white">
      <Group gap="sm" mb={6}>
        <ThemeIcon size={32} radius="md" color={color} variant="light">
          <Icon size={15} />
        </ThemeIcon>
      </Group>
      <Text fw={800} size="xl" c={color} lh={1.1}>{value}</Text>
      <Text size="xs" c="dimmed" mt={4} fw={500}>{label}</Text>
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const navigate = useNavigate();
  const authUser = useAppSelector(s => s.auth.user);
  const supName  = authUser?.supervisorName  ?? null;
  const supEmail = authUser?.supervisorEmail ?? null;

  const [projectTitle, setProjectTitle] = useState<string>('');
  const [degreeLevel,  setDegreeLevel]  = useState<string>('');
  const [submissions,  setSubmissions]  = useState<DBSubmission[]>([]);
  const [loading,      setLoading]      = useState(true);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST.map(c => [c.id, c.checked]))
  );

  // ── Fetch profile + submissions ────────────────────────────────────────────
  useEffect(() => {
    if (!authUser?.id) return;
    setLoading(true);

    Promise.all([
      supabase
        .from('users')
        .select('project_title, degree_level')
        .eq('id', authUser.id)
        .single(),
      fetchStudentSubmissions(authUser.id),
    ]).then(([{ data: profile }, subs]) => {
      setProjectTitle(profile?.project_title ?? '');
      setDegreeLevel(profile?.degree_level  ?? authUser.role ?? '');
      setSubmissions(subs);
      setLoading(false);
    });

    // Realtime: supervisor approves / requests revision
    const channel = supabase
      .channel(`dashboard-subs-${authUser.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'submissions',
        filter: `student_id=eq.${authUser.id}`,
      }, payload =>
        setSubmissions(prev =>
          prev.map(s => s.id === (payload.new as DBSubmission).id ? (payload.new as DBSubmission) : s)
        )
      )
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'submissions',
        filter: `student_id=eq.${authUser.id}`,
      }, payload =>
        setSubmissions(prev => [...prev, payload.new as DBSubmission])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authUser?.id]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const sorted = useMemo(
    () => [...submissions].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)),
    [submissions]
  );

  const approved = useMemo(() => submissions.filter(s => s.status === 'approved'),       [submissions]);
  const pending  = useMemo(() => submissions.filter(s => s.status === 'pending'),         [submissions]);
  const revision = useMemo(() => submissions.filter(s => s.status === 'needs-revision'), [submissions]);

  const totalWords = useMemo(
    () => submissions.reduce((acc, s) => acc + wordCount(s.content ?? ''), 0),
    [submissions]
  );

  const progress = submissions.length > 0
    ? Math.round((approved.length / submissions.length) * 100)
    : 0;

  // Map submissions → section rows
  const sections = useMemo(() =>
    sorted.map(sub => ({
      id:        sub.id,
      title:     sub.section_title,
      status:    sub.status === 'approved'      ? 'approved'
               : sub.status === 'needs-revision' ? 'needs-revision'
               : 'in-progress',
      wordCount: wordCount(sub.content ?? ''),
      approved:  sub.status === 'approved',
    })),
  [sorted]);

  // Map submissions → activity events
  const activities = useMemo(() => {
    const acts: { id: string; user: string; action: string; target: string; ts: string }[] = [];
    for (const sub of submissions) {
      acts.push({
        id:     `sub-${sub.id}`,
        user:   authUser?.name ?? 'You',
        action: 'submitted',
        target: sub.section_title,
        ts:     sub.submitted_at,
      });
      if (sub.reviewed_at) {
        acts.push({
          id:     `rev-${sub.id}`,
          user:   supName ?? 'Supervisor',
          action: sub.status === 'approved' ? 'approved' : 'requested revision on',
          target: sub.section_title,
          ts:     sub.reviewed_at,
        });
      }
    }
    return acts.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 8);
  }, [submissions, authUser?.name, supName]);

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const displayTitle   = projectTitle || authUser?.name ? `${authUser?.name ?? ''}'s Research Project` : 'Research Project';

  if (loading) {
    return (
      <Box p="xl" ta="center" pt={80}>
        <Loader size="sm" color="brand" />
        <Text size="sm" c="dimmed" mt="sm">Loading dashboard…</Text>
      </Box>
    );
  }

  return (
    <Box p="xl">

      {/* ── Hero project card ── */}
      <Paper
        withBorder radius="md" p="xl" mb="lg" bg="white"
        style={{ borderLeft: '4px solid #3b5bdb' }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" mb={8}>
              {degreeLevel && (
                <Badge color="brand" variant="light" size="sm">{degreeLevel}</Badge>
              )}
              <Badge
                color={submissions.length === 0 ? 'gray' : pending.length > 0 ? 'orange' : 'green'}
                variant="light"
                size="sm"
              >
                {submissions.length === 0 ? 'Not started' : pending.length > 0 ? 'Under Review' : 'In Progress'}
              </Badge>
            </Group>
            <Title
              order={2}
              lh={1.25}
              mb="sm"
              style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.35rem' }}
            >
              {projectTitle || 'Untitled Research Project'}
            </Title>
            <Group gap="xl" mt="md" wrap="wrap">
              <Box>
                <Text size="xs" c="dimmed" fw={500} mb={4}>Chapter Progress</Text>
                <Group gap="xs" align="center" mb={4}>
                  <Text size="sm" fw={700} c="brand">{approved.length}/{submissions.length} approved</Text>
                </Group>
                <Progress value={progress} color="brand" size="sm" radius="xl" w={200} />
              </Box>
              {totalWords > 0 && (
                <Box>
                  <Text size="xs" c="dimmed" fw={500} mb={2}>Words Written</Text>
                  <Text size="sm" fw={600}>
                    {totalWords.toLocaleString()}
                    <Text span size="xs" c="dimmed" fw={400}> words across {submissions.length} chapter{submissions.length !== 1 ? 's' : ''}</Text>
                  </Text>
                  <Progress
                    value={Math.min((totalWords / 80000) * 100, 100)}
                    color="teal" size="xs" radius="xl" mt={4} w={200}
                  />
                </Box>
              )}
            </Group>
          </Box>

          <Stack gap="xs" align="flex-end" style={{ flexShrink: 0, minWidth: 150 }}>
            <SimpleGrid cols={2} spacing={6}>
              <Paper radius="md" p="xs" style={{ background: '#f6fef9', textAlign: 'center', minWidth: 60 }}>
                <Text size="xs" c="dimmed" fw={500}>Approved</Text>
                <Text fw={800} size="xl" c="green">{approved.length}</Text>
              </Paper>
              <Paper radius="md" p="xs" style={{ background: '#fff9db', textAlign: 'center', minWidth: 60 }}>
                <Text size="xs" c="dimmed" fw={500}>Pending</Text>
                <Text fw={800} size="xl" c="orange">{pending.length}</Text>
              </Paper>
            </SimpleGrid>
            <Button
              color="brand" size="sm"
              leftSection={<LuPenLine size={14} />}
              onClick={() => navigate('/app/editor')}
              mt={4}
            >
              Open Editor
            </Button>
          </Stack>
        </Group>
      </Paper>

      {/* ── KPI chips ── */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
        <KpiChip icon={LuFileText}   value={submissions.length} label="Chapters Submitted" />
        <KpiChip icon={LuCircleCheck} value={approved.length}  label="Approved"  color="green" />
        <KpiChip icon={LuClock}       value={pending.length}   label="Pending Review" color="orange" />
        <KpiChip icon={LuHash}        value={totalWords > 0 ? totalWords.toLocaleString() : '—'} label="Words Written" />
      </SimpleGrid>

      {/* ── Two-column layout ── */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">

        {/* Left (2/3) */}
        <Box style={{ gridColumn: 'span 2' }}>
          <Stack gap="lg">

            {/* Submitted Chapters */}
            <Paper withBorder radius="md" p="lg" bg="white">
              <Group justify="space-between" mb="md">
                <Text fw={700} size="md">Submitted Chapters</Text>
                <Text
                  size="xs" c="brand"
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate('/app/editor')}
                >
                  Open Editor
                </Text>
              </Group>

              {sections.length === 0 ? (
                <Box ta="center" py="lg">
                  <LuBookOpen size={28} color="#ced4da" />
                  <Text size="sm" c="dimmed" mt="xs">No chapters submitted yet.</Text>
                  <Text size="xs" c="dimmed">Submit a chapter from the Editor to get started.</Text>
                  <Button size="xs" variant="light" color="brand" mt="sm"
                    leftSection={<LuPenLine size={12} />}
                    onClick={() => navigate('/app/editor')}>
                    Go to Editor
                  </Button>
                </Box>
              ) : (
                <Stack gap={0}>
                  {sections.map((sec, idx) => (
                    <Group
                      key={sec.id}
                      justify="space-between"
                      py={10}
                      wrap="nowrap"
                      style={idx < sections.length - 1 ? { borderBottom: '1px solid #f1f3f5' } : undefined}
                    >
                      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <StatusIcon status={sec.status} />
                        <Text
                          size="sm"
                          fw={sec.approved ? 600 : 400}
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {sec.title}
                        </Text>
                        {sec.approved && (
                          <LuCircleCheck size={13} color="#2f9e44" />
                        )}
                      </Group>
                      <Group gap="sm" style={{ flexShrink: 0, marginLeft: 8 }}>
                        <Badge
                          variant="light"
                          size="xs"
                          radius="sm"
                          color={sec.status === 'approved' ? 'green' : sec.status === 'needs-revision' ? 'orange' : 'blue'}
                        >
                          {sec.status === 'approved' ? 'Approved' : sec.status === 'needs-revision' ? 'Revision' : 'Pending'}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {sec.wordCount > 0 ? `${sec.wordCount.toLocaleString()} w` : '—'}
                        </Text>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              )}
            </Paper>

            {/* Project Checklist */}
            <Paper withBorder radius="md" p="lg" bg="white">
              <Group justify="space-between" mb="md">
                <Text fw={700} size="md">Project Checklist</Text>
                <Badge color="brand" variant="light" size="sm">
                  {completedCount} / {CHECKLIST.length} completed
                </Badge>
              </Group>
              <Stack gap="xs">
                {CHECKLIST.map(item => (
                  <Checkbox
                    key={item.id}
                    checked={checkedItems[item.id] ?? false}
                    onChange={e => setCheckedItems(prev => ({ ...prev, [item.id]: e.currentTarget.checked }))}
                    color="brand"
                    label={
                      <Text size="sm" style={checkedItems[item.id]
                        ? { textDecoration: 'line-through', color: '#adb5bd' }
                        : undefined}>
                        {item.label}
                      </Text>
                    }
                  />
                ))}
              </Stack>
            </Paper>

          </Stack>
        </Box>

        {/* Right (1/3) */}
        <Stack gap="lg">

          {/* Supervisor card */}
          <Paper
            withBorder radius="md" p="lg" bg="white"
            style={{ background: 'linear-gradient(135deg, #edf2ff 0%, #f8f9fe 100%)' }}
          >
            <Text fw={700} size="xs" c="dimmed" mb="sm"
              style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Your Supervisor
            </Text>
            {supName ? (
              <>
                <Group gap="md" mb="md" wrap="nowrap">
                  <Avatar color="brand" radius="xl" size="md">{getInitials(supName)}</Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Text fw={700} size="sm" lh={1.2}>{supName}</Text>
                    <Text size="xs" c="dimmed">Supervisor</Text>
                  </Box>
                </Group>
                {supEmail && <Text size="xs" c="dimmed" mb="sm">{supEmail}</Text>}
                <Button variant="light" color="brand" size="xs" fullWidth
                  leftSection={<LuPenLine size={12} />}
                  onClick={() => navigate('/app/messages')}>
                  Message Supervisor
                </Button>
              </>
            ) : (
              <Text size="sm" c="dimmed" fs="italic">No supervisor assigned yet — contact your HoD.</Text>
            )}
          </Paper>

          {/* Quick Actions */}
          <Paper withBorder radius="md" p="lg" bg="white">
            <Text fw={700} size="md" mb="md">Quick Actions</Text>
            <SimpleGrid cols={2} spacing="xs">
              {[
                { label: 'Editor',     Icon: LuPenLine,   path: '/app/editor'            },
                { label: 'References', Icon: LuBook,      path: '/app/references'        },
                { label: 'Analysis',   Icon: LuActivity,  path: '/app/analysis'          },
                { label: 'AI Review',  Icon: LuBot,       path: '/app/ai-reviewer'       },
                { label: 'Plagiarism', Icon: LuShield,    path: '/app/plagiarism-checker'},
                { label: 'Export',     Icon: LuDownload,  path: '/app/export'            },
              ].map(({ label, Icon, path }) => (
                <Button
                  key={label}
                  variant="light"
                  color="brand"
                  size="xs"
                  leftSection={<Icon size={13} />}
                  onClick={() => navigate(path)}
                  styles={{ root: { justifyContent: 'flex-start' } }}
                >
                  {label}
                </Button>
              ))}
            </SimpleGrid>
          </Paper>

          {/* Activity Log */}
          <Paper withBorder radius="md" p="lg" bg="white">
            <Group justify="space-between" mb="md">
              <Text fw={700} size="md">Activity Log</Text>
              <ThemeIcon size={22} radius="xl" color="brand" variant="light">
                <LuTarget size={12} />
              </ThemeIcon>
            </Group>
            {activities.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py="sm">No activity yet.</Text>
            ) : (
              <Stack gap={0}>
                {activities.map((act, idx) => (
                  <Group
                    key={act.id}
                    justify="space-between"
                    py={8}
                    wrap="nowrap"
                    align="flex-start"
                    style={idx < activities.length - 1 ? { borderBottom: '1px solid #f8f9fa' } : undefined}
                  >
                    <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      <Box style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#edf2ff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Text size="9px" fw={700} c="brand">{idx + 1}</Text>
                      </Box>
                      <Text size="xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Text span fw={600} size="xs">{act.user}</Text>
                        {' '}{act.action}{' '}
                        <Text span size="xs" c="dimmed">{act.target}</Text>
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0, marginLeft: 6 }}>
                      {formatRelativeTime(act.ts)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            )}
          </Paper>

        </Stack>
      </SimpleGrid>

      {/* ── Revision alert ── */}
      {revision.length > 0 && (
        <Paper
          withBorder radius="md" p="md" mt="lg" bg="white"
          style={{ borderLeft: '4px solid #f08c00' }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <LuTriangleAlert size={18} color="#f08c00" />
              <Box>
                <Text size="sm" fw={600}>
                  {revision.length} chapter{revision.length > 1 ? 's' : ''} need{revision.length === 1 ? 's' : ''} revision
                </Text>
                <Text size="xs" c="dimmed" mt={1}>
                  {revision.map(s => s.section_title).join(', ')} — check your supervisor's feedback.
                </Text>
              </Box>
            </Group>
            <Text
              size="xs" c="brand" fw={600}
              style={{ cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
              onClick={() => navigate('/app/editor')}
            >
              Open Editor
            </Text>
          </Group>
        </Paper>
      )}

    </Box>
  );
}
