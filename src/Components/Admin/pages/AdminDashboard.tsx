import { useEffect, useMemo, useState } from 'react';
import {
  Accordion, Avatar, Badge, Box, Divider, Group, Loader, Pagination, Paper, Progress,
  RingProgress, ScrollArea, SimpleGrid, Stack, Table, Tabs, Text,
  TextInput, ThemeIcon, Title,
} from '@mantine/core';
import {
  LuFolder, LuFileText, LuClipboard, LuTrendingUp,
  LuSearch, LuCircleCheck, LuClock, LuRotateCcw, LuActivity,
  LuUsers, LuBell, LuCalendar, LuBookOpen, LuGraduationCap,
  LuTriangleAlert, LuBuilding2, LuLandmark, LuLayers,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import { showerrornotification } from '../../../helper/notificationhelper';
import { fetchDashboardData, fetchOrgHierarchyTable } from '../../../supabase/adminStats';
import type {
  DeptStat, StatusSlice, SubmissionRow, ApprovedChapter,
  ActivityEvent, StudentProgress, OrgCollegeRow, OrgFacultyRow, OrgHierarchyData,
} from '../../../supabase/adminStats';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MANTINE_COLORS = ['blue', 'teal', 'green', 'grape', 'orange', 'cyan', 'indigo', 'red', 'pink', 'yellow'];
function nameToColor(name: string) {
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return MANTINE_COLORS[Math.abs(h) % MANTINE_COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatRelTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function degreeBadgeColor(level: string) {
  if (level === 'PhD' || level === 'PhD Student')           return 'blue';
  if (level === "Master's" || level === "Master's Student") return 'violet';
  return 'teal';
}

// ── Bar chart ──────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: DeptStat[] }) {
  if (!data.length) return <Text size="sm" c="dimmed" ta="center" py={40}>No submission data yet.</Text>;
  const H = 110, BOT = 130, BW = Math.min(40, Math.floor(300 / data.length) - 8);
  const GAP = Math.min(28, Math.floor(56 / data.length)), SX = 40;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const totalW = SX + data.length * (BW + GAP) + 16;
  return (
    <svg viewBox={`0 0 ${totalW} 175`} width="100%" height="175">
      {[0, Math.round(maxVal * 0.5), maxVal].map(v => {
        const y = BOT - (v / maxVal) * H;
        return (
          <g key={v}>
            <line x1={32} y1={y} x2={totalW - 8} y2={y} stroke="#f1f3f5" strokeWidth={1} />
            <text x={26} y={y + 4} textAnchor="end" fontSize={10} fill="#adb5bd">{v}</text>
          </g>
        );
      })}
      {data.map((item, i) => {
        const x = SX + i * (BW + GAP);
        const bh = Math.max((item.count / maxVal) * H, 3);
        return (
          <g key={item.dept}>
            <rect x={x} y={BOT - bh} width={BW} height={bh} fill="#1864ab" rx={3} />
            <text x={x + BW / 2} y={165} textAnchor="middle" fontSize={9} fill="#868e96">{item.dept}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    'pending':        { color: 'yellow', label: 'Pending'        },
    'approved':       { color: 'green',  label: 'Approved'       },
    'needs-revision': { color: 'red',    label: 'Needs Revision' },
  };
  const { color, label } = map[status] ?? { color: 'gray', label: status };
  return <Badge color={color} variant="light" radius="sm" size="sm">{label}</Badge>;
}

// ── Activity dot ───────────────────────────────────────────────────────────────

function ActivityDot({ type }: { type: ActivityEvent['type'] }) {
  const map: Record<string, { color: string; icon: React.ElementType }> = {
    submitted:  { color: '#4c6ef5', icon: LuFileText    },
    approved:   { color: '#2f9e44', icon: LuCircleCheck },
    revision:   { color: '#e03131', icon: LuRotateCcw   },
    annotation: { color: '#f08c00', icon: LuBell        },
  };
  const { color, icon: Icon } = map[type] ?? map.submitted;
  return (
    <ThemeIcon size={28} radius="xl" style={{ background: color + '18', color, flexShrink: 0 }}>
      <Icon size={13} />
    </ThemeIcon>
  );
}

// ── Chapter tracker table ──────────────────────────────────────────────────────

const CARD_PAGE_SIZE = 5;

function ChapterTable({ rows }: { rows: SubmissionRow[] }) {
  const [search, setSearch] = useState('');
  const [tab,    setTab]    = useState<string>('all');
  const [page,   setPage]   = useState(1);

  const counts = useMemo(() => ({
    all:              rows.length,
    pending:          rows.filter(r => r.status === 'pending').length,
    approved:         rows.filter(r => r.status === 'approved').length,
    'needs-revision': rows.filter(r => r.status === 'needs-revision').length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .filter(r => {
        const matchTab    = tab === 'all' || r.status === tab;
        const matchSearch = !q || r.studentName.toLowerCase().includes(q) || r.sectionTitle.toLowerCase().includes(q) || r.department.toLowerCase().includes(q);
        return matchTab && matchSearch;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [rows, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CARD_PAGE_SIZE));
  const pagedRows  = filtered.slice((page - 1) * CARD_PAGE_SIZE, page * CARD_PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, tab]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  if (!rows.length) return <Text size="sm" c="dimmed" ta="center" py={40}>No chapters submitted yet.</Text>;

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Tabs value={tab} onChange={v => setTab(v ?? 'all')} variant="pills">
          <Tabs.List>
            {(['all', 'pending', 'approved', 'needs-revision'] as const).map(key => (
              <Tabs.Tab key={key} value={key}
                rightSection={
                  <Badge size="xs" variant="filled" radius="xl"
                    color={key === 'pending' ? 'yellow' : key === 'approved' ? 'green' : key === 'needs-revision' ? 'red' : 'gray'}
                  >{counts[key]}</Badge>
                }
              >
                {key === 'all' ? 'All' : key === 'needs-revision' ? 'Needs Revision' : key.charAt(0).toUpperCase() + key.slice(1)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
        <TextInput
          placeholder="Search student, chapter, dept…"
          leftSection={<LuSearch size={14} />}
          value={search} onChange={e => setSearch(e.currentTarget.value)}
          size="xs" w={210}
        />
      </Group>
      <ScrollArea>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Chapter / Section', 'Student', 'Department', 'Words', 'Status', 'Submitted', 'Reviewed'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: '#868e96', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f3f5' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0
              ? <tr><td colSpan={7} style={{ padding: '24px 12px', textAlign: 'center', color: '#adb5bd' }}>No chapters match your filter.</td></tr>
              : pagedRows.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f8f9fa' }}>
                  <td style={{ padding: '10px 12px', maxWidth: 240 }}>
                    <Text size="sm" fw={500} lineClamp={1}>{row.sectionTitle}</Text>
                    {row.unresolvedAnnotations > 0 && <Text size="xs" c="orange.6" mt={1}>{row.unresolvedAnnotations} open annotation{row.unresolvedAnnotations > 1 ? 's' : ''}</Text>}
                    {row.supervisorComment && <Text size="xs" c="dimmed" mt={1} lineClamp={1}>"{row.supervisorComment}"</Text>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#495057', whiteSpace: 'nowrap' }}>{row.studentName}</td>
                  <td style={{ padding: '10px 12px', color: '#868e96', maxWidth: 130 }}><Text size="sm" lineClamp={1}>{row.department}</Text></td>
                  <td style={{ padding: '10px 12px', color: '#868e96', whiteSpace: 'nowrap' }}>{row.wordCount.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}><StatusBadge status={row.status} /></td>
                  <td style={{ padding: '10px 12px', color: '#adb5bd', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {new Date(row.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#adb5bd', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {row.reviewedAt ? new Date(row.reviewedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </ScrollArea>
      {totalPages > 1 && (
        <Group justify="flex-end">
          <Pagination total={totalPages} value={page} onChange={setPage} color="brand" radius="md" size="sm" />
        </Group>
      )}
    </Stack>
  );
}

// ── Approved chapters cards (mirrors SupervisorApprovals) ──────────────────────

function ApprovedList({ chapters }: { chapters: ApprovedChapter[] }) {
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () => [...chapters].sort((a, b) => new Date(b.reviewedAt ?? b.submittedAt).getTime() - new Date(a.reviewedAt ?? a.submittedAt).getTime()),
    [chapters],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / CARD_PAGE_SIZE));
  const paged      = sorted.slice((page - 1) * CARD_PAGE_SIZE, page * CARD_PAGE_SIZE);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  if (!chapters.length) return <Text size="sm" c="dimmed" ta="center" py={40}>No chapters approved yet.</Text>;
  return (
    <Stack gap="md">
      {paged.map((ch, i) => (
        <Paper key={ch.id} withBorder p="lg" radius="md" bg="white" style={{ borderLeft: '4px solid #2f9e44' }}>
          <Group justify="space-between" wrap="nowrap" mb="md">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <Box style={{ width: 26, height: 26, borderRadius: '50%', background: '#e6fcf5', border: '2px solid #2f9e44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text size="xs" fw={800} c="green.7">#{(page - 1) * CARD_PAGE_SIZE + i + 1}</Text>
              </Box>
              <Avatar color={nameToColor(ch.studentName)} radius="xl" size="md">{getInitials(ch.studentName)}</Avatar>
              <Box style={{ minWidth: 0 }}>
                <Group gap="xs" wrap="nowrap" mb={2}>
                  <Text size="sm" fw={700} lineClamp={1}>{ch.studentName}</Text>
                  <Badge variant="light" color={degreeBadgeColor(ch.degreeLevel)} size="xs" radius="sm">{ch.degreeLevel}</Badge>
                </Group>
                <Text size="xs" c="dimmed" lineClamp={1}>{ch.projectTitle}</Text>
              </Box>
            </Group>
            <ThemeIcon size={32} radius="xl" color="green" variant="light" style={{ flexShrink: 0 }}>
              <LuCircleCheck size={16} />
            </ThemeIcon>
          </Group>
          <Divider mb="md" />
          <Group justify="space-between" mb="sm" wrap="nowrap">
            <Group gap="xs">
              <LuFileText size={14} color="#2f9e44" />
              <Text size="sm" fw={600}>{ch.sectionTitle}</Text>
            </Group>
            <Badge variant="light" color="green" size="sm" radius="sm" leftSection={<LuCircleCheck size={10} />}>Approved</Badge>
          </Group>
          <Group gap="xl" mb={ch.supervisorComment ? 'md' : 0} wrap="wrap">
            <Group gap="xs">
              <LuCalendar size={12} color="#adb5bd" />
              <Text size="xs" c="dimmed">Approved {ch.reviewedAt ? formatDate(ch.reviewedAt) : '—'}</Text>
            </Group>
            <Text size="xs" c="dimmed">Submitted {formatDate(ch.submittedAt)}</Text>
            <Text size="xs" c="dimmed">{ch.department}</Text>
          </Group>
          {ch.supervisorComment && (
            <Paper p="sm" radius="sm" mt="sm" style={{ background: '#f6fef9', border: '1px solid #b2f2bb' }}>
              <Text size="xs" c="dimmed" fw={600} mb={2}>Supervisor note:</Text>
              <Text size="xs">{ch.supervisorComment}</Text>
            </Paper>
          )}
        </Paper>
      ))}
      {totalPages > 1 && (
        <Group justify="flex-end">
          <Pagination total={totalPages} value={page} onChange={setPage} color="brand" radius="md" size="sm" />
        </Group>
      )}
    </Stack>
  );
}

// ── Org hierarchy table (College → Provost / Faculty → Dean / Dept → HOD / ──
// ── Students → project topic + supervisor) ──────────────────────────────────

function StudentTopicTable({ rows }: { rows: { id: string; name: string; projectTitle: string; supervisorName: string }[] }) {
  if (!rows.length) {
    return <Text size="xs" c="dimmed" ta="center" py="sm">No students in this department yet.</Text>;
  }
  return (
    <Table verticalSpacing={6} fz="xs" highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Student</Table.Th>
          <Table.Th>Project Topic</Table.Th>
          <Table.Th>Supervisor</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map(st => (
          <Table.Tr key={st.id}>
            <Table.Td>{st.name}</Table.Td>
            <Table.Td>{st.projectTitle}</Table.Td>
            <Table.Td>
              {st.supervisorName === 'Unassigned'
                ? <Badge variant="light" color="gray" size="sm" radius="sm">Unassigned</Badge>
                : st.supervisorName}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function FacultyAccordionItem({ faculty }: { faculty: OrgFacultyRow }) {
  return (
    <Accordion.Item value={faculty.id}>
      <Accordion.Control icon={<LuLayers size={14} color="#4263eb" />}>
        <Group justify="space-between" wrap="nowrap" pr="md">
          <Text fw={600} size="sm">{faculty.name}</Text>
          <Text size="xs" c="dimmed">Dean: <Text component="span" fw={600} c="dark">{faculty.deanName}</Text> · {faculty.deanEmail}</Text>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        {faculty.departments.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py="sm">No departments under this faculty yet.</Text>
        ) : (
          <Stack gap="md">
            {faculty.departments.map(dept => (
              <Paper key={dept.id} withBorder p="sm" radius="sm" bg="gray.0">
                <Group justify="space-between" mb="xs" wrap="nowrap">
                  <Group gap={6}>
                    <LuBuilding2 size={13} color="#0c8599" />
                    <Text fw={600} size="sm">{dept.name}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">HOD: <Text component="span" fw={600} c="dark">{dept.hodName}</Text> · {dept.hodEmail}</Text>
                </Group>
                <StudentTopicTable rows={dept.students} />
              </Paper>
            ))}
          </Stack>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function OrgHierarchyTable({ colleges, directFaculties }: { colleges: OrgCollegeRow[]; directFaculties: OrgFacultyRow[] }) {
  if (!colleges.length && !directFaculties.length) {
    return <Text size="sm" c="dimmed" ta="center" py={40}>No colleges or faculties set up for this institution yet.</Text>;
  }
  return (
    <Stack gap="md">
      {directFaculties.length > 0 && (
        <Paper withBorder radius="md" p="sm" bg="orange.0" style={{ borderColor: '#ffd8a8' }}>
          <Group gap={6} mb="xs">
            <LuBuilding2 size={14} color="#e67700" />
            <Text fw={700} size="sm" c="orange.9">Faculties directly under Institution</Text>
            <Badge size="xs" color="orange" variant="light">{directFaculties.length}</Badge>
          </Group>
          <Accordion variant="contained" radius="sm" multiple>
            {directFaculties.map(faculty => <FacultyAccordionItem key={faculty.id} faculty={faculty} />)}
          </Accordion>
        </Paper>
      )}
      {colleges.length > 0 && (
        <Accordion variant="separated" radius="md" multiple defaultValue={colleges.map(c => c.id)}>
          {colleges.map(college => (
            <Accordion.Item key={college.id} value={college.id}>
              <Accordion.Control icon={<LuLandmark size={16} color="#7950f2" />}>
                <Group justify="space-between" wrap="nowrap" pr="md">
                  <Text fw={700} size="sm">{college.name}</Text>
                  <Text size="xs" c="dimmed">Provost: <Text component="span" fw={600} c="dark">{college.provostName}</Text> · {college.provostEmail}</Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                {college.faculties.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="sm">No faculties under this college yet.</Text>
                ) : (
                  <Accordion variant="contained" radius="sm" multiple>
                    {college.faculties.map(faculty => <FacultyAccordionItem key={faculty.id} faculty={faculty} />)}
                  </Accordion>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Stack>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const user            = useAppSelector(s => s.auth.user);
  const institutionName = user?.institutionName ?? 'Institution';
  const institutionId   = user?.institutionId;

  const [data,    setData]    = useState<Awaited<ReturnType<typeof fetchDashboardData>> | null>(null);
  const [loading, setLoading] = useState(true);

  const [orgData,    setOrgData]    = useState<OrgHierarchyData>({ colleges: [], directFaculties: [] });
  const [orgLoading, setOrgLoading] = useState(true);

  const [activityPage, setActivityPage] = useState(1);
  const [progressPage, setProgressPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchDashboardData(institutionId)
      .then(setData)
      .catch(err => showerrornotification({ message: err.message || 'Failed to load dashboard data.' }))
      .finally(() => setLoading(false));
  }, [institutionId]);

  useEffect(() => {
    if (!institutionId) { setOrgLoading(false); return; }
    setOrgLoading(true);
    fetchOrgHierarchyTable(institutionId)
      .then(setOrgData)
      .catch(err => showerrornotification({ message: err.message || 'Failed to load institution structure.' }))
      .finally(() => setOrgLoading(false));
  }, [institutionId]);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const approvalRate = data && data.allSubmissions.length > 0
    ? Math.round((data.approvedCount / data.allSubmissions.length) * 100)
    : 0;

  const activityFeed   = data?.activityFeed ?? [];
  const activityPages  = Math.max(1, Math.ceil(activityFeed.length / CARD_PAGE_SIZE));
  const pagedActivity  = activityFeed.slice((activityPage - 1) * CARD_PAGE_SIZE, activityPage * CARD_PAGE_SIZE);

  const studentProgress = useMemo(
    () => [...(data?.studentProgress ?? [])].sort((a, b) => b.progress - a.progress),
    [data?.studentProgress],
  );
  const progressPages = Math.max(1, Math.ceil(studentProgress.length / CARD_PAGE_SIZE));
  const pagedProgress = studentProgress.slice((progressPage - 1) * CARD_PAGE_SIZE, progressPage * CARD_PAGE_SIZE);

  useEffect(() => { setActivityPage(p => Math.min(p, activityPages)); }, [activityPages]);
  useEffect(() => { setProgressPage(p => Math.min(p, progressPages)); }, [progressPages]);

  return (
    <Box p="xl">
      {/* ── Header ── */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>{institutionName}</Title>
          <Text size="sm" c="dimmed">
            Institution-wide research overview
            {institutionId && <Text component="span" size="xs" c="dimmed"> · ID: {institutionId}</Text>}
          </Text>
        </Box>
        <Group gap="xs" align="center">
          <LuCalendar size={14} color="#adb5bd" />
          <Text size="sm" c="dimmed">{today}</Text>
        </Group>
      </Group>

      {loading ? (
        <Group justify="center" py={80}><Loader size="md" /></Group>
      ) : (
        <Stack gap="xl">

          {/* ── KPI cards (mirrors SupervisorOverview layout) ── */}
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }}>
            {[
              { icon: LuUsers,         label: 'Total Students',     value: data?.totalStudents ?? 0,        color: 'brand',  sub: `${data?.degreeBreakdown.phd ?? 0} PhD · ${data?.degreeBreakdown.masters ?? 0} MSc · ${data?.degreeBreakdown.ug ?? 0} UG` },
              { icon: LuLandmark,      label: 'Colleges',           value: data?.totalColleges ?? 0,        color: 'grape',  sub: 'Institution-wide structure' },
              { icon: LuLayers,        label: 'Faculties',          value: data?.totalFaculties ?? 0,       color: 'indigo', sub: 'Across all colleges' },
              { icon: LuBuilding2,     label: 'Departments',        value: data?.totalDepartments ?? 0,     color: 'cyan',   sub: 'Across all faculties' },
              { icon: LuTrendingUp,    label: 'Avg Progress',       value: `${data?.avgProgress ?? 0}%`,    color: 'teal',   sub: 'Chapters approved vs submitted' },
              { icon: LuCircleCheck,   label: 'Chapters Approved',  value: data?.approvedCount ?? 0,        color: 'green',  sub: `${data?.reviewedCount ?? 0} reviewed total` },
              { icon: LuTriangleAlert, label: 'Pending Review',     value: data?.pendingCount ?? 0,         color: (data?.pendingCount ?? 0) > 0 ? 'orange' : 'green', sub: 'Awaiting supervisor review' },
              { icon: LuRotateCcw,     label: 'Needs Revision',     value: data?.revisionCount ?? 0,        color: 'red',    sub: 'Chapters flagged for changes' },
              { icon: LuFolder,        label: 'Active Projects',    value: data?.activeProjects ?? 0,       color: 'violet', sub: 'Students with submissions' },
              { icon: LuFileText,      label: 'Total Submitted',    value: data?.allSubmissions.length ?? 0, color: 'blue',  sub: 'All chapters ever submitted' },
              { icon: LuActivity,      label: 'Total Reviewed',     value: data?.reviewedCount ?? 0,        color: 'grape',  sub: 'Approved + revision combined' },
            ].map(({ icon: Icon, label, value, color, sub }) => (
              <Paper key={label} withBorder p="lg" radius="md" bg="white">
                <Group justify="space-between" mb="sm">
                  <ThemeIcon size={42} radius="md" color={color} variant="light"><Icon size={20} /></ThemeIcon>
                  <LuActivity size={14} color="#ced4da" />
                </Group>
                <Text fw={800} lh={1} mb={4} style={{ fontSize: 30 }}>{value}</Text>
                <Text size="sm" c="dimmed" fw={500}>{label}</Text>
                {sub && <Text size="xs" c="dimmed" mt={6}>{sub}</Text>}
              </Paper>
            ))}
          </SimpleGrid>

          {/* ── Chapter reviews + Approval ring (mirrors SupervisorOverview) ── */}
          <SimpleGrid cols={{ base: 1, md: 2 }}>

            {/* Chapter review breakdown */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Group gap="xs" mb="md">
                <LuBookOpen size={16} color="#4c6ef5" />
                <Text fw={600}>Chapter Reviews — Institution Wide</Text>
              </Group>
              <Divider mb="md" />
              <Stack gap="md">
                {[
                  { label: 'Total Submitted', value: data?.allSubmissions.length ?? 0, color: '#3b5bdb', icon: LuFileText      },
                  { label: 'Reviewed',        value: data?.reviewedCount ?? 0,         color: '#7950f2', icon: LuActivity      },
                  { label: 'Approved',        value: data?.approvedCount ?? 0,         color: '#2f9e44', icon: LuCircleCheck   },
                  { label: 'Needs Revision',  value: data?.revisionCount ?? 0,         color: '#e03131', icon: LuTriangleAlert },
                  { label: 'Pending',         value: data?.pendingCount ?? 0,          color: '#f08c00', icon: LuClock         },
                ].map(({ label, value, color, icon: Icon }) => (
                  <Group key={label} justify="space-between" align="center">
                    <Group gap="xs">
                      <Icon size={14} style={{ color }} />
                      <Text size="sm" c="dimmed">{label}</Text>
                    </Group>
                    <Badge variant="light" size="sm" radius="sm" style={{ background: `${color}18`, color }}>{value}</Badge>
                  </Group>
                ))}
              </Stack>
            </Paper>

            {/* Approval rate ring */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Group gap="xs" mb="md">
                <LuGraduationCap size={16} color="#4c6ef5" />
                <Text fw={600}>Approval Rate</Text>
              </Group>
              <Divider mb="md" />
              <Group justify="center" align="center" gap="xl" mt="sm">
                <RingProgress
                  size={160} thickness={26} roundCaps
                  sections={
                    (data?.allSubmissions.length ?? 0) === 0
                      ? [{ value: 100, color: '#e9ecef' }]
                      : [
                          { value: (data!.approvedCount / data!.allSubmissions.length) * 100, color: '#2f9e44', tooltip: `Approved: ${data!.approvedCount}` },
                          { value: (data!.revisionCount / data!.allSubmissions.length) * 100, color: '#e03131', tooltip: `Needs Revision: ${data!.revisionCount}` },
                          { value: (data!.pendingCount  / data!.allSubmissions.length) * 100, color: '#f08c00', tooltip: `Pending: ${data!.pendingCount}` },
                        ]
                  }
                  label={
                    <Box ta="center">
                      <Text fw={800} size="lg" lh={1}>{(data?.allSubmissions.length ?? 0) === 0 ? '—' : `${approvalRate}%`}</Text>
                      <Text size="xs" c="dimmed">approved</Text>
                    </Box>
                  }
                />
                <Stack gap="md">
                  {[
                    { label: 'Approved',       color: '#2f9e44', count: data?.approvedCount ?? 0 },
                    { label: 'Needs Revision', color: '#e03131', count: data?.revisionCount ?? 0 },
                    { label: 'Pending',        color: '#f08c00', count: data?.pendingCount  ?? 0 },
                  ].map(({ label, color, count }) => (
                    <Group key={label} gap="xs" wrap="nowrap">
                      <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <Text size="sm" c="dimmed" style={{ minWidth: 100 }}>{label}</Text>
                      <Text size="sm" fw={700}>{count}</Text>
                    </Group>
                  ))}
                </Stack>
              </Group>
            </Paper>

          </SimpleGrid>

          {/* ── Chapter tracker (all submissions) ── */}
          <Paper withBorder p="lg" radius="md" bg="white">
            <Group justify="space-between" mb="md">
              <Box>
                <Text fw={700} size="md">Submitted Chapters</Text>
                <Text size="xs" c="dimmed">All chapters from this institution — pending, approved, under revision</Text>
              </Box>
              <LuTrendingUp size={16} color="#ced4da" />
            </Group>
            <ChapterTable rows={data?.allSubmissions ?? []} />
          </Paper>

          {/* ── Approved chapters (mirrors SupervisorApprovals) ── */}
          <Paper withBorder p="lg" radius="md" bg="white">
            <Group justify="space-between" mb="md">
              <Box>
                <Text fw={700} size="md">Approved Chapters</Text>
                <Text size="xs" c="dimmed">
                  {(data?.approvedChapters ?? []).length} chapter{(data?.approvedChapters ?? []).length !== 1 ? 's' : ''} approved across {new Set((data?.approvedChapters ?? []).map(c => c.studentId)).size} student{new Set((data?.approvedChapters ?? []).map(c => c.studentId)).size !== 1 ? 's' : ''} · most recently reviewed first
                </Text>
              </Box>
              <ThemeIcon size={32} radius="xl" color="green" variant="light">
                <LuCircleCheck size={16} />
              </ThemeIcon>
            </Group>
            <ApprovedList chapters={data?.approvedChapters ?? []} />
          </Paper>

          {/* ── Recent activity + Student details (mirrors SupervisorOverview bottom row) ── */}
          <SimpleGrid cols={{ base: 1, md: 2 }}>

            {/* Recent activity */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Group gap="xs" mb="md">
                <LuClock size={16} color="#4c6ef5" />
                <Text fw={600}>Recent Activity</Text>
              </Group>
              <Divider mb="md" />
              {activityFeed.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">No activity yet.</Text>
              ) : (
                <Stack gap="sm">
                  <Stack gap={0}>
                    {pagedActivity.map((ev: ActivityEvent, i: number) => (
                      <Group key={i} justify="space-between" py="xs" wrap="nowrap" style={{ borderBottom: '1px solid #f1f3f5' }}>
                        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                          <ActivityDot type={ev.type} />
                          <Box style={{ minWidth: 0 }}>
                            {/* actorName = student for submitted, supervisor for approved/revision — mirrors StudentDashboard */}
                            <Group gap={6} wrap="nowrap">
                              <Text size="sm" fw={600} lineClamp={1}>{ev.actorName}</Text>
                              <Badge variant="light" color="gray" size="xs" radius="sm" style={{ flexShrink: 0 }}>{ev.department}</Badge>
                            </Group>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {ev.actorName} {ev.action} &quot;{ev.sectionTitle}&quot;
                            </Text>
                          </Box>
                        </Group>
                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{ev.time}</Text>
                      </Group>
                    ))}
                  </Stack>
                  {activityPages > 1 && (
                    <Group justify="flex-end">
                      <Pagination total={activityPages} value={activityPage} onChange={setActivityPage} color="brand" radius="md" size="sm" />
                    </Group>
                  )}
                </Stack>
              )}
            </Paper>

            {/* Student details with progress bars (mirrors SupervisorOverview) */}
            <Paper withBorder p="lg" radius="md" bg="white">
              <Group gap="xs" mb="md">
                <LuUsers size={16} color="#4c6ef5" />
                <Text fw={600}>Student Progress</Text>
              </Group>
              <Divider mb="md" />
              {studentProgress.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">No students found for this institution.</Text>
              ) : (
                <Stack gap="sm">
                  <Stack gap="lg">
                    {pagedProgress.map((st: StudentProgress) => (
                      <Box key={st.id}>
                        <Group justify="space-between" mb={6} wrap="nowrap">
                          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                            <Avatar color={nameToColor(st.name)} radius="xl" size="sm">{getInitials(st.name)}</Avatar>
                            <Box style={{ minWidth: 0 }}>
                              <Text size="sm" fw={600} lineClamp={1}>{st.name}</Text>
                              <Text size="xs" c="dimmed" lineClamp={1}>{st.projectTitle}</Text>
                            </Box>
                          </Group>
                          <Badge variant="dot" color={degreeBadgeColor(st.degreeLevel)} size="xs" style={{ flexShrink: 0 }}>
                            {st.degreeLevel}
                          </Badge>
                        </Group>
                        <Progress
                          value={st.progress}
                          color={st.progress >= 70 ? 'green' : st.progress >= 40 ? 'orange' : 'blue'}
                          size="xs" radius="xl"
                        />
                        <Group justify="space-between" mt={4}>
                          <Text size="xs" c="dimmed">{st.approvedCount} approved</Text>
                          {st.pendingCount  > 0 && <Text size="xs" c="orange.7">{st.pendingCount} pending</Text>}
                          {st.rejectedCount > 0 && <Text size="xs" c="red.7">{st.rejectedCount} revision</Text>}
                          <Text size="xs" fw={600}>{st.progress}%</Text>
                        </Group>
                      </Box>
                    ))}
                  </Stack>
                  {progressPages > 1 && (
                    <Group justify="flex-end">
                      <Pagination total={progressPages} value={progressPage} onChange={setProgressPage} color="brand" radius="md" size="sm" />
                    </Group>
                  )}
                </Stack>
              )}
            </Paper>

          </SimpleGrid>

          {/* ── Dept bar + Status donut ── */}
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Paper withBorder p="lg" radius="md" bg="white">
              <Text fw={600} mb="md">Submissions by Department</Text>
              <BarChart data={data?.submissionsByDept ?? []} />
            </Paper>
            <Paper withBorder p="lg" radius="md" bg="white">
              <Text fw={600} mb="md">Project Status Breakdown</Text>
              {(data?.statusBreakdown ?? []).length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py={40}>No projects yet.</Text>
              ) : (
                <Group justify="center" align="center" gap="xl" mt="sm">
                  <RingProgress size={140} thickness={26}
                    sections={(data?.statusBreakdown ?? []).map((s: StatusSlice) => ({ value: s.pct, color: s.color }))}
                  />
                  <Stack gap={8}>
                    {(data?.statusBreakdown ?? []).map(({ label, count, color }: StatusSlice) => (
                      <Group key={label} gap="xs" wrap="nowrap">
                        <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>{label}</Text>
                        <Text size="xs" fw={700}>{count}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Group>
              )}
            </Paper>
          </SimpleGrid>

          {/* ── Alerts ── */}
          {(data?.alerts ?? []).length > 0 && (
            <Paper withBorder p="lg" radius="md" bg="white">
              <Text fw={600} mb="md">Alerts</Text>
              {(data?.alerts ?? []).map((alert, i) => (
                <Box key={i} py="sm" style={{ borderTop: i > 0 ? '1px solid #f1f3f5' : undefined }}>
                  <Group gap="sm" align="flex-start" wrap="nowrap">
                    <Badge color={alert.severity === 'critical' ? 'red' : 'yellow'} radius="sm" size="sm" variant="filled" style={{ flexShrink: 0, marginTop: 2 }}>
                      {alert.severity}
                    </Badge>
                    <Box>
                      <Text size="sm">{alert.message}</Text>
                      <Text size="xs" c="dimmed" mt={2}>{alert.time}</Text>
                    </Box>
                  </Group>
                </Box>
              ))}
            </Paper>
          )}

          {/* ── Institution org structure: Colleges → Faculties → Departments → Students ── */}
          <Paper withBorder p="lg" radius="md" bg="white">
            <Group justify="space-between" mb="md">
              <Box>
                <Text fw={700} size="md">Institution Structure</Text>
                <Text size="xs" c="dimmed">
                  Colleges led by their Provost, Faculties by their Dean, Departments by their HOD —
                  with every student's project topic and assigned supervisor
                </Text>
              </Box>
              <ThemeIcon size={32} radius="xl" color="violet" variant="light">
                <LuLandmark size={16} />
              </ThemeIcon>
            </Group>
            <Divider mb="md" />
            {orgLoading ? (
              <Group justify="center" py={40}><Loader size="sm" /></Group>
            ) : (
              <OrgHierarchyTable colleges={orgData.colleges} directFaculties={orgData.directFaculties} />
            )}
          </Paper>

        </Stack>
      )}
    </Box>
  );
}
