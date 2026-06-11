import { useEffect, useState } from 'react';
import {
  ActionIcon, Avatar, Box, Center, Divider, Group, Loader, Paper,
  Progress, RingProgress, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { LuGraduationCap, LuUsers, LuUserCheck, LuCalendar, LuBuilding2, LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { supabase } from '../../../supabase/client';

// ── Constants ─────────────────────────────────────────────────────────────────

const PG_ROLES = ['PhD Student', "Master's Student", 'Postgraduate Student', 'Researcher'];
const RING_COLORS = ['#4c6ef5', '#7950f2', '#ae3ec9', '#2f9e44', '#f08c00'];
const BAR_COLORS  = ['#4c6ef5', '#0c8599', '#7950f2', '#f08c00', '#2f9e44', '#ae3ec9', '#e03131', '#1971c2'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const MANTINE_COLORS = ['blue', 'teal', 'violet', 'orange', 'cyan', 'grape', 'green', 'indigo'];
function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return MANTINE_COLORS[Math.abs(h) % MANTINE_COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function roleBadgeStyle(role: string): { bg: string; text: string } {
  if (role === 'PhD Student')           return { bg: '#e7f5ff', text: '#1c7ed6' };
  if (role === "Master's Student")      return { bg: '#f3f0ff', text: '#7048e8' };
  if (role === 'Postgraduate Student')  return { bg: '#f8f0fc', text: '#9c36b5' };
  // if (role === 'Researcher')            return { bg: '#ebfbee', text: '#2f9e44' };
  return { bg: '#f8f9fa', text: '#868e96' };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentStudent {
  id:         string;
  name:       string;
  role:       string;
  department: string;
  faculty:    string;
  addedOn:    string;
  color:      string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PGSchoolOverview() {
  const user            = useAppSelector(s => s.auth.user);
  const institutionId   = user?.institutionId   ?? '';
  const institutionName = user?.institutionName ?? 'Institution';

  const [stats, setStats] = useState({ total: 0, phd: 0, masters: 0, pg: 0, researcher: 0, supervisors: 0 });
  const [facBreakdown, setFacBreakdown] = useState<{ name: string; count: number; color: string }[]>([]);
  const [recent, setRecent] = useState<RecentStudent[]>([]);
  const [recentPage, setRecentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 6;

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      const [{ data: studentRows }, { data: deptRows }, { data: facRows }] = await Promise.all([
        supabase.from('users')
          .select('id, name, role, department, supervisor_id, created_at')
          .eq('institution_id', institutionId)
          .in('role', PG_ROLES)
          .order('created_at', { ascending: false }),
        supabase.from('departments')
          .select('name, faculty_id')
          .eq('institution_id', institutionId),
        supabase.from('faculties')
          .select('id, name')
          .eq('institution_id', institutionId)
          .order('name'),
      ]);

      const studs = (studentRows ?? []) as {
        id: string; name: string; role: string; department: string;
        supervisor_id: string | null; created_at: string;
      }[];

      const deptFacId:   Record<string, string> = {};
      const facNameById: Record<string, string> = {};
      (deptRows ?? []).forEach(d => { deptFacId[d.name]  = d.faculty_id; });
      (facRows  ?? []).forEach(f => { facNameById[f.id]  = f.name; });

      // Faculty breakdown
      const facCount: Record<string, number> = {};
      studs.forEach(s => {
        const facId   = deptFacId[s.department];
        const facName = facId ? (facNameById[facId] ?? 'Unknown') : 'Unknown';
        facCount[facName] = (facCount[facName] ?? 0) + 1;
      });

      const breakdown = Object.entries(facCount)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count], i) => ({ name, count, color: BAR_COLORS[i % BAR_COLORS.length] }));

      // All students for paginated "Recently Added" widget
      const recentRows = studs.map(s => {
        const facId   = deptFacId[s.department];
        const facName = facId ? (facNameById[facId] ?? '—') : '—';
        return {
          id:         s.id,
          name:       s.name,
          role:       s.role,
          department: s.department || '—',
          faculty:    facName,
          addedOn:    new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          color:      nameToColor(s.name),
        };
      });

      const supervisorIds = [...new Set(studs.map(s => s.supervisor_id).filter(Boolean) as string[])];

      setStats({
        total:       studs.length,
        phd:         studs.filter(s => s.role === 'PhD Student').length,
        masters:     studs.filter(s => s.role === "Master's Student").length,
        pg:          studs.filter(s => s.role === 'Postgraduate Student').length,
        researcher:  studs.filter(s => s.role === 'Researcher').length,
        supervisors: supervisorIds.length,
      });
      setFacBreakdown(breakdown);
      setRecent(recentRows);
      setLoading(false);
    }

    load();
  }, [institutionId]);

  if (loading) return (
    <Box p="xl" ta="center" pt={80}>
      <Loader size="sm" color="brand" />
      <Text size="sm" c="dimmed" mt="sm">Loading overview…</Text>
    </Box>
  );

  const totalD = stats.total || 1;
  const maxFac = Math.max(...facBreakdown.map(f => f.count), 1);

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>
            Postgraduate School Overview
          </Title>
          <Text size="sm" c="dimmed" mt={2}>
            {institutionName} — all postgraduate student activity across faculties.
          </Text>
        </Box>
        <Group gap="xs">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      {/* KPI tiles */}
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} mb="xl">
        {[
          { label: 'Total PG',      value: stats.total,       color: 'indigo', icon: LuUsers         },
          { label: 'PhD',           value: stats.phd,         color: 'blue',   icon: LuGraduationCap },
          { label: "Master's",      value: stats.masters,     color: 'violet', icon: LuGraduationCap },
          { label: 'Postgraduate',  value: stats.pg,          color: 'grape',  icon: LuGraduationCap },
          // { label: 'Researchers',   value: stats.researcher,  color: 'green',  icon: LuGraduationCap },
          { label: 'Supervisors',   value: stats.supervisors, color: 'teal',   icon: LuUserCheck     },
        ].map(({ label, value, color, icon: Icon }) => (
          <Paper key={label} withBorder p="md" radius="md" bg="white">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size={34} radius="md" color={color} variant="light"><Icon size={16} /></ThemeIcon>
              <Box style={{ minWidth: 0 }}>
                <Text fw={800} size="lg" lh={1}>{value}</Text>
                <Text size="xs" c="dimmed" lineClamp={1}>{label}</Text>
              </Box>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} mb="xl">
        {/* Students by faculty */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuBuilding2 size={16} color="#4c6ef5" />
            <Text fw={600}>Students by Faculty</Text>
          </Group>
          <Divider mb="md" />
          {facBreakdown.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">No faculty data yet.</Text>
          ) : (
            <Stack gap="md">
              {facBreakdown.map(f => (
                <Box key={f.name}>
                  <Group justify="space-between" mb={6}>
                    <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>{f.name}</Text>
                    <Text size="sm" fw={700}>{f.count}</Text>
                  </Group>
                  <Progress value={(f.count / maxFac) * 100} color={f.color} size="sm" radius="xl" />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Degree level ring */}
        <Paper withBorder p="lg" radius="md" bg="white">
          <Group gap="xs" mb="md">
            <LuGraduationCap size={16} color="#4c6ef5" />
            <Text fw={600}>Degree Level Distribution</Text>
          </Group>
          <Divider mb="md" />
          <Group justify="center" align="center" gap="xl" mt="sm">
            <RingProgress
              size={150} thickness={24} roundCaps
              sections={stats.total === 0
                ? [{ value: 100, color: '#dee2e6' }]
                : [
                    { value: (stats.phd        / totalD) * 100, color: RING_COLORS[0] },
                    { value: (stats.masters     / totalD) * 100, color: RING_COLORS[1] },
                    { value: (stats.pg          / totalD) * 100, color: RING_COLORS[2] },
                    // { value: (stats.researcher  / totalD) * 100, color: RING_COLORS[3] },
                  ]}
              label={
                <Box ta="center">
                  <Text fw={800} size="md" lh={1}>{stats.total}</Text>
                  <Text size="xs" c="dimmed">total</Text>
                </Box>
              }
            />
            <Stack gap="sm">
              {[
                { label: 'PhD',          count: stats.phd,        color: RING_COLORS[0] },
                { label: "Master's",     count: stats.masters,    color: RING_COLORS[1] },
                { label: 'Postgraduate', count: stats.pg,         color: RING_COLORS[2] },
                // { label: 'Researcher',   count: stats.researcher, color: RING_COLORS[3] },
              ].map(({ label, count, color }) => (
                <Group key={label} gap="xs" wrap="nowrap">
                  <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <Text size="sm" c="dimmed" style={{ minWidth: 90 }}>{label}</Text>
                  <Text size="sm" fw={700}>{count}</Text>
                </Group>
              ))}
            </Stack>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Recently added — paginated */}
      <Paper withBorder p="lg" radius="md" bg="white">
        <Group justify="space-between" mb="md" align="center">
          <Group gap="xs">
            <LuUsers size={16} color="#4c6ef5" />
            <Text fw={600}>Recently Added PG Students</Text>
          </Group>
          {recent.length > PAGE_SIZE && (
            <Group gap={6} align="center">
              <Text size="xs" c="dimmed">
                {recentPage * PAGE_SIZE + 1}–{Math.min((recentPage + 1) * PAGE_SIZE, recent.length)} of {recent.length}
              </Text>
              <ActionIcon
                variant="subtle" color="gray" size="sm" radius="md"
                disabled={recentPage === 0}
                onClick={() => setRecentPage(p => p - 1)}
              >
                <LuChevronLeft size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle" color="gray" size="sm" radius="md"
                disabled={(recentPage + 1) * PAGE_SIZE >= recent.length}
                onClick={() => setRecentPage(p => p + 1)}
              >
                <LuChevronRight size={14} />
              </ActionIcon>
            </Group>
          )}
        </Group>
        <Divider mb="md" />
        {recent.length === 0 ? (
          <Center py="md"><Text size="sm" c="dimmed">No PG students found.</Text></Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {recent.slice(recentPage * PAGE_SIZE, (recentPage + 1) * PAGE_SIZE).map(s => {
              const { bg, text } = roleBadgeStyle(s.role);
              return (
                <Group key={s.id} gap="sm" p="sm" wrap="nowrap"
                  style={{ borderRadius: 8, border: '1px solid #f1f3f5', background: '#fafafa' }}>
                  <Avatar color={s.color} radius="xl" size="md">{getInitials(s.name)}</Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} lineClamp={1}>{s.name}</Text>
                    <Box
                      component="span"
                      style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: bg, color: text }}
                    >
                      {s.role.replace(' Student', '')}
                    </Box>
                    <Text size="xs" c="dimmed" mt={3} lineClamp={1}>{s.department} · {s.faculty}</Text>
                    <Text size="xs" c="dimmed">{s.addedOn}</Text>
                  </Box>
                </Group>
              );
            })}
          </SimpleGrid>
        )}
      </Paper>
    </Box>
  );
}
