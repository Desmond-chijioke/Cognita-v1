import { useEffect, useMemo, useState } from 'react';
import {
  Badge, Box, Drawer, Group, Loader, Paper, Select, SimpleGrid,
  Stack, Table, Text, TextInput, Title,
} from '@mantine/core';
import {
  LuFolder, LuClock, LuClipboardCheck,
  LuSearch, LuBot, LuFileCheck, LuCircleCheck,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { fetchAdminProjects } from '../../../supabase/adminStats';
import type { AdminProject } from '../../../supabase/adminStats';

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  'Draft': 'gray', 'In-Progress': 'blue', 'Review': 'yellow',
  'Submitted': 'green', 'Exported': 'teal',
};

const AI_COLOR: Record<string, string> = {
  'None': 'gray', 'Low': 'green', 'Moderate': 'yellow', 'High': 'red',
};

function integrityColor(n: number) {
  if (n >= 85) return '#2f9e44';
  if (n >= 70) return '#f59f00';
  return '#fa5252';
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminProjects() {
  const user          = useAppSelector(s => s.auth.user);
  const institutionId = user?.institutionId;

  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetchAdminProjects(institutionId)
      .then(setProjects)
      .finally(() => setLoading(false));
  }, [institutionId]);

  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selected,     setSelected]     = useState<AdminProject | null>(null);

  const departments = useMemo(() => [...new Set(projects.map(p => p.department))].sort(), [projects]);
  const statuses    = useMemo(() => [...new Set(projects.map(p => p.status))], [projects]);

  const filtered = useMemo(() => projects.filter(p => {
    const q = search.toLowerCase();
    return (
      (!q          || p.title.toLowerCase().includes(q) || p.researcher.toLowerCase().includes(q)) &&
      (!deptFilter   || p.department === deptFilter) &&
      (!statusFilter || p.status     === statusFilter)
    );
  }), [projects, search, deptFilter, statusFilter]);

  const total      = projects.length;
  const inProgress = projects.filter(p => p.status === 'In-Progress').length;
  const inReview   = projects.filter(p => p.status === 'Review').length;
  const submitted  = projects.filter(p => p.status === 'Submitted').length;

  const SUMMARY = [
    { label: 'Total Projects', value: total,      icon: LuFolder,         color: '#228be6' },
    { label: 'In Progress',    value: inProgress,  icon: LuClock,          color: '#1864ab' },
    { label: 'In Review',      value: inReview,    icon: LuClipboardCheck, color: '#f59f00' },
    { label: 'Submitted',      value: submitted,   icon: LuCircleCheck,    color: '#2f9e44' },
  ];

  return (
    <Box p="xl">

      {/* Title */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Projects</Title>
        <Text size="sm" c="dimmed">Monitor all research projects across the institution</Text>
      </Box>

      {/* ── Summary cards ── */}
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
        {SUMMARY.map(({ label, value, icon: Icon, color }) => (
          <Paper key={label} withBorder p="md" radius="md" bg="white">
            <Group gap="sm" mb={4}>
              <Icon size={20} color={color} />
              <Text fw={800} size="xl">{value}</Text>
            </Group>
            <Text size="sm" c="dimmed">{label}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* ── Search + filters ── */}
      <Group mb="md" wrap="nowrap">
        <TextInput
          placeholder="Search projects or researchers..."
          leftSection={<LuSearch size={16} />}
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="All Departments"
          data={departments}
          value={deptFilter}
          onChange={setDeptFilter}
          clearable
          w={190}
        />
        <Select
          placeholder="All Status"
          data={statuses}
          value={statusFilter}
          onChange={setStatusFilter}
          clearable
          w={150}
        />
      </Group>

      {/* ── Table ── */}
      {loading ? (
        <Group justify="center" py={80}><Loader size="md" /></Group>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table highlightOnHover striped={false} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr style={{ background: '#f8f9fa' }}>
                {['Project Title', 'Researcher', 'Department', 'Status', 'AI Usage', 'Approval', 'Last Updated'].map(h => (
                  <Table.Th key={h}>
                    <Text size="sm" c="dimmed" fw={500}>{h}</Text>
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text size="sm" c="dimmed" ta="center" py={32}>
                      {projects.length === 0 ? 'No student projects found for this institution.' : 'No projects match your filters.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filtered.map(p => (
                  <Table.Tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(p)}>
                    <Table.Td style={{ maxWidth: 340 }}>
                      <Text size="sm" fw={500} lineClamp={2}>{p.title}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{p.researcher}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{p.department}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLOR[p.status] ?? 'gray'} variant="light" radius="sm">
                        {p.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={AI_COLOR[p.aiUsage] ?? 'gray'} variant="light" radius="sm">
                        {p.aiUsage}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={700} style={{ color: integrityColor(p.integrity) }}>
                        {p.integrity > 0 ? `${p.integrity}%` : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{p.lastUpdated}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {/* ── Project detail drawer ── */}
      <Drawer
        opened={!!selected}
        onClose={() => setSelected(null)}
        title={
          <Text fw={700} size="md" style={{ lineHeight: 1.3, paddingRight: 16 }}>
            {selected?.title}
          </Text>
        }
        position="right"
        size="md"
        padding="xl"
      >
        {selected && (
          <Stack gap="lg">

            {/* Meta grid */}
            <SimpleGrid cols={2} spacing="md">
              <Box>
                <Text size="xs" c="dimmed" mb={2}>Researcher</Text>
                <Text fw={600}>{selected.researcher}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" mb={2}>Department</Text>
                <Text fw={600}>{selected.department}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" mb={2}>Status</Text>
                <Badge color={STATUS_COLOR[selected.status] ?? 'gray'} variant="light" radius="sm">
                  {selected.status}
                </Badge>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" mb={2}>Approval Rate</Text>
                <Text fw={800} size="xl" style={{ color: integrityColor(selected.integrity) }}>
                  {selected.integrity > 0 ? `${selected.integrity}%` : '—'}
                </Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" mb={2}>Dataset</Text>
                <Text fw={600}>{selected.dataset}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" mb={2}>Last Updated</Text>
                <Text fw={600}>{selected.lastUpdated}</Text>
              </Box>
            </SimpleGrid>

            {/* AI Mode */}
            <Paper bg="#eff6ff" p="md" radius="md">
              <Group gap="xs" mb="xs">
                <LuBot size={15} color="#1971c2" />
                <Text size="xs" fw={700} c="blue" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  AI Mode
                </Text>
              </Group>
              <Text fw={600} mb="xs">{selected.aiMode}</Text>
              <Badge color={AI_COLOR[selected.aiUsage] ?? 'gray'} variant="light" radius="sm">
                {selected.aiUsage} Usage
              </Badge>
            </Paper>

            {/* Document sections */}
            <Box>
              <Group gap="xs" mb="sm">
                <LuFileCheck size={15} color="#868e96" />
                <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Submitted Sections
                </Text>
              </Group>
              {selected.sections.length === 0 ? (
                <Text size="sm" c="dimmed">No sections submitted yet.</Text>
              ) : (
                <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                  {selected.sections.map((sec, i) => (
                    <Group
                      key={`${sec.name}-${i}`}
                      justify="space-between"
                      px="md" py="sm"
                      style={{ borderTop: i > 0 ? '1px solid #f1f3f5' : undefined }}
                    >
                      <Text size="sm">{sec.name}</Text>
                      <Text size="sm" c="dimmed">{sec.words.toLocaleString()} words</Text>
                    </Group>
                  ))}
                </Paper>
              )}
            </Box>

          </Stack>
        )}
      </Drawer>

    </Box>
  );
}
