import { useMemo, useState } from 'react';
import {
  Badge, Box, Drawer, Group, Paper, Select, SimpleGrid,
  Stack, Table, Text, TextInput, Title,
} from '@mantine/core';
import {
  LuFolder, LuClock, LuClipboardCheck,
  LuSearch, LuBot, LuFileCheck, LuCircleCheck,
} from 'react-icons/lu';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DocSection { name: string; words: number; }

interface Project {
  id: string;
  title: string;
  researcher: string;
  department: string;
  status: string;
  aiUsage: string;
  integrity: number;
  lastUpdated: string;
  dataset: string;
  aiMode: string;
  sections: DocSection[];
}

// ── Static data ────────────────────────────────────────────────────────────────

const PROJECTS: Project[] = [
  {
    id: '1',
    title: 'AI-Based Early Detection of Crop Diseases Using Computer Vision',
    researcher: 'Dr. Fatima Hassan', department: 'Computer Science',
    status: 'In-Progress', aiUsage: 'Moderate', integrity: 84,
    lastUpdated: '2026-02-14', dataset: 'Uploaded', aiMode: 'Enabled',
    sections: [{ name: 'Abstract', words: 210 }, { name: 'Introduction', words: 1450 }, { name: 'Methodology', words: 980 }],
  },
  {
    id: '2',
    title: 'Microplastic Contamination in Freshwater Ecosystems',
    researcher: 'Dr. Sarah Chen', department: 'Environmental Science',
    status: 'Review', aiUsage: 'Low', integrity: 92,
    lastUpdated: '2026-02-12', dataset: 'Uploaded', aiMode: 'Enabled',
    sections: [{ name: 'Abstract', words: 195 }, { name: 'Introduction', words: 1600 }, { name: 'Results', words: 2100 }],
  },
  {
    id: '3',
    title: 'CRISPR-Cas9 Gene Editing for Sickle Cell Disease Therapy',
    researcher: 'Dr. Kwame Asante', department: 'Medicine',
    status: 'In-Progress', aiUsage: 'High', integrity: 68,
    lastUpdated: '2026-02-11', dataset: 'Uploaded', aiMode: 'Enabled',
    sections: [{ name: 'Abstract', words: 220 }, { name: 'Introduction', words: 1300 }],
  },
  {
    id: '4',
    title: 'Quantum Computing Approaches to Drug Discovery',
    researcher: 'Prof. Elena Vasquez', department: 'Chemistry',
    status: 'Draft', aiUsage: 'None', integrity: 95,
    lastUpdated: '2026-02-09', dataset: 'Not Uploaded', aiMode: 'Disabled',
    sections: [{ name: 'Abstract', words: 180 }, { name: 'Introduction', words: 1200 }],
  },
  {
    id: '5',
    title: 'Social Media Misinformation and Public Health Outcomes',
    researcher: 'Dr. Amina Yusuf', department: 'Social Sciences',
    status: 'Submitted', aiUsage: 'Low', integrity: 89,
    lastUpdated: '2026-02-06', dataset: 'Uploaded', aiMode: 'Enabled',
    sections: [{ name: 'Abstract', words: 200 }, { name: 'Introduction', words: 1100 }, { name: 'Discussion', words: 1800 }, { name: 'Conclusion', words: 650 }],
  },
  {
    id: '6',
    title: 'Renewable Energy Integration in Smart Grid Systems',
    researcher: 'Dr. Michael Obi', department: 'Engineering',
    status: 'In-Progress', aiUsage: 'Moderate', integrity: 81,
    lastUpdated: '2026-02-08', dataset: 'Uploaded', aiMode: 'Enabled',
    sections: [{ name: 'Abstract', words: 190 }, { name: 'Introduction', words: 1350 }, { name: 'Methodology', words: 1100 }],
  },
  {
    id: '7',
    title: 'Antibiotic Resistance Patterns in Hospital-Acquired Infections',
    researcher: 'Dr. Grace Ndegwa', department: 'Medicine',
    status: 'Exported', aiUsage: 'Low', integrity: 91,
    lastUpdated: '2026-01-30', dataset: 'Uploaded', aiMode: 'Enabled',
    sections: [{ name: 'Abstract', words: 205 }, { name: 'Introduction', words: 1500 }, { name: 'Results', words: 2200 }, { name: 'Conclusion', words: 700 }],
  },
  {
    id: '8',
    title: 'Neural Machine Translation for Low-Resource African Languages',
    researcher: 'Dr. Ibrahim Musa', department: 'Computer Science',
    status: 'In-Progress', aiUsage: 'High', integrity: 73,
    lastUpdated: '2026-02-13', dataset: 'Uploaded', aiMode: 'Enabled',
    sections: [{ name: 'Abstract', words: 215 }, { name: 'Introduction', words: 1400 }, { name: 'Methodology', words: 1050 }],
  },
];

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
  const [search, setSearch]           = useState('');
  const [deptFilter, setDeptFilter]   = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selected, setSelected]       = useState<Project | null>(null);

  const departments = [...new Set(PROJECTS.map(p => p.department))].sort();
  const statuses    = [...new Set(PROJECTS.map(p => p.status))];

  const filtered = useMemo(() => PROJECTS.filter(p => {
    const q = search.toLowerCase();
    const matchSearch  = !q || p.title.toLowerCase().includes(q) || p.researcher.toLowerCase().includes(q);
    const matchDept    = !deptFilter   || p.department === deptFilter;
    const matchStatus  = !statusFilter || p.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  }), [search, deptFilter, statusFilter]);

  // Summary counts
  const total      = PROJECTS.length;
  const inProgress = PROJECTS.filter(p => p.status === 'In-Progress').length;
  const inReview   = PROJECTS.filter(p => p.status === 'Review').length;
  const submitted  = PROJECTS.filter(p => p.status === 'Submitted').length;

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
      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Table highlightOnHover striped={false} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr style={{ background: '#f8f9fa' }}>
              {['Project Title', 'Researcher', 'Department', 'Status', 'AI Usage', 'Integrity', 'Last Updated'].map(h => (
                <Table.Th key={h}>
                  <Text size="sm" c="dimmed" fw={500}>{h}</Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map(p => (
              <Table.Tr
                key={p.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(p)}
              >
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
                  <Text fw={700} style={{ color: integrityColor(p.integrity) }}>{p.integrity}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">{p.lastUpdated}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

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
                <Text size="xs" c="dimmed" mb={2}>Integrity Score</Text>
                <Text fw={800} size="xl" style={{ color: integrityColor(selected.integrity) }}>
                  {selected.integrity}
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
                  Document Sections
                </Text>
              </Group>
              <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                {selected.sections.map((sec, i) => (
                  <Group
                    key={sec.name}
                    justify="space-between"
                    px="md"
                    py="sm"
                    style={{ borderTop: i > 0 ? '1px solid #f1f3f5' : undefined }}
                  >
                    <Text size="sm">{sec.name}</Text>
                    <Text size="sm" c="dimmed">{sec.words.toLocaleString()} words</Text>
                  </Group>
                ))}
              </Paper>
            </Box>

          </Stack>
        )}
      </Drawer>

    </Box>
  );
}
