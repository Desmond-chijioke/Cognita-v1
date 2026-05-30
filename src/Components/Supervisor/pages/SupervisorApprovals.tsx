import { useState } from 'react';
import {
  Avatar, Badge, Box, Button, Divider, Group, Modal,
  Paper, Stack, Text, Textarea, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuCircleCheck, LuX, LuClock, LuCheckCheck,
  LuTriangleAlert, LuActivity,
} from 'react-icons/lu';

// ── Mock data ──────────────────────────────────────────────────────────────────

type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

interface ApprovalRequest {
  id: string;
  student: string;
  studentColor: string;
  degreeLevel: string;
  requestType: string;
  description: string;
  submittedOn: string;
  status: ApprovalStatus;
  resolution?: string;
}

const INITIAL_REQUESTS: ApprovalRequest[] = [
  { id: 'a1', student: 'Amara Osei',       studentColor: 'blue',   degreeLevel: 'PhD',           requestType: 'Ethics Clearance Approval',  description: 'Requesting approval of the ethics committee clearance document for Phase 2 of data collection involving human subjects.',        submittedOn: '2026-05-24', status: 'Pending' },
  { id: 'a2', student: 'Kofi Mensah',      studentColor: 'teal',   degreeLevel: "Master's",      requestType: 'Topic Change Request',        description: 'Requesting a title amendment from "NLP for Low-Resource Languages" to "Cross-Lingual Transfer for African Languages" to better reflect scope.', submittedOn: '2026-05-23', status: 'Pending' },
  { id: 'a3', student: 'Emeka Okafor',     studentColor: 'orange', degreeLevel: 'Undergraduate', requestType: 'Deadline Extension',          description: 'Requesting a 2-week extension on the project proposal deadline due to a documented medical absence from 12–19 May 2026.',          submittedOn: '2026-05-21', status: 'Pending' },
  { id: 'a4', student: 'Fatima Al-Rashid', studentColor: 'violet', degreeLevel: 'PhD',           requestType: 'Submission Approval',         description: 'Requesting final thesis submission approval. All chapters have been reviewed and compliance check is complete.',                   submittedOn: '2026-05-15', status: 'Approved', resolution: 'Approved. All requirements met. Forwarded to the faculty graduate board.' },
  { id: 'a5', student: 'Taiwo Bakare',     studentColor: 'red',    degreeLevel: "Master's",      requestType: 'Ethics Clearance Approval',  description: 'Ethics clearance for data collection from industry professionals via anonymous survey.',                                             submittedOn: '2026-05-10', status: 'Rejected', resolution: 'Request denied. Ethics form is incomplete — Section 4 (risk assessment) was not filled. Please resubmit.' },
];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function degreeBadgeColor(level: string) {
  return level === 'PhD' ? 'blue' : level === "Master's" ? 'violet' : 'teal';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Box p="md" style={{ borderRadius: 10, background: `${color}10`, border: `1.5px solid ${color}28`, textAlign: 'center' }}>
      <Text fw={800} size="xl" lh={1} style={{ color }}>{value}</Text>
      <Text size="xs" c="dimmed" mt={6} fw={500}>{label}</Text>
    </Box>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisorApprovals() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [feedback, setFeedback]         = useState('');

  const pending  = requests.filter(r => r.status === 'Pending');
  const resolved = requests.filter(r => r.status !== 'Pending');

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'Approved', resolution: 'Approved by supervisor.' } : r
    ));
    notifications.show({ title: 'Request Approved', message: 'The student has been notified.', color: 'green' });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    setRequests(prev => prev.map(r =>
      r.id === rejectTarget
        ? { ...r, status: 'Rejected', resolution: feedback || 'Request rejected by supervisor.' }
        : r
    ));
    notifications.show({ title: 'Request Rejected', message: 'The student has been notified with your feedback.', color: 'red' });
    setRejectTarget(null);
    setFeedback('');
  };

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Approvals</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Review and act on student approval requests for ethics, submissions, and extensions.
        </Text>
      </Box>

      {/* ── Summary chips ── */}
      <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        <SummaryChip value={pending.length}                                    label="Pending"  color="#f08c00" />
        <SummaryChip value={requests.filter(r => r.status === 'Approved').length} label="Approved" color="#2f9e44" />
        <SummaryChip value={requests.filter(r => r.status === 'Rejected').length} label="Rejected" color="#e03131" />
      </Box>

      {/* ── Pending requests ── */}
      {pending.length > 0 ? (
        <Stack gap="md" mb="xl">
          <Group gap="xs">
            <LuClock size={16} color="#f08c00" />
            <Text fw={600} size="sm">Pending Requests</Text>
          </Group>
          {pending.map(req => (
            <Paper
              key={req.id} withBorder p="lg" radius="md"
              style={{ background: '#fff9db', border: '1.5px solid #fab00530' }}
            >
              <Group justify="space-between" wrap="nowrap" mb="md">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Avatar color={req.studentColor} radius="xl" size="md">
                    {getInitials(req.student)}
                  </Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" fw={700}>{req.student}</Text>
                      <Badge variant="light" color={degreeBadgeColor(req.degreeLevel)} size="xs" radius="sm">
                        {req.degreeLevel}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={2}>{req.submittedOn}</Text>
                  </Box>
                </Group>
                <Badge variant="outline" color="orange" size="sm" radius="sm" style={{ flexShrink: 0 }}>
                  {req.requestType}
                </Badge>
              </Group>

              <Text size="sm" mb="md">{req.description}</Text>
              <Divider mb="md" color="orange.2" />

              <Group gap="sm">
                <Button
                  size="sm"
                  color="green"
                  variant="light"
                  leftSection={<LuCircleCheck size={14} />}
                  onClick={() => handleApprove(req.id)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  color="red"
                  variant="light"
                  leftSection={<LuX size={14} />}
                  onClick={() => { setRejectTarget(req.id); setFeedback(''); }}
                >
                  Reject
                </Button>
              </Group>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper
          withBorder p="lg" radius="md" mb="xl"
          style={{ background: '#f4fce3', border: '1.5px solid #94d82d30' }}
        >
          <Group gap="sm">
            <ThemeIcon size={34} radius="md" color="green" variant="light">
              <LuCheckCheck size={16} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={600}>All caught up!</Text>
              <Text size="xs" c="dimmed">No pending approval requests.</Text>
            </Box>
          </Group>
        </Paper>
      )}

      {/* ── Resolved items ── */}
      {resolved.length > 0 && (
        <>
          <Group gap="xs" mb="md">
            <LuActivity size={16} color="#adb5bd" />
            <Text fw={600} size="sm" c="dimmed">Resolved Requests</Text>
          </Group>
          <Stack gap="sm">
            {resolved.map(req => (
              <Paper key={req.id} withBorder p="md" radius="md" bg="white">
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Avatar color={req.studentColor} radius="xl" size="sm">
                      {getInitials(req.student)}
                    </Avatar>
                    <Box style={{ minWidth: 0 }}>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm" fw={600}>{req.student}</Text>
                        <Text size="xs" c="dimmed">·</Text>
                        <Text size="xs" c="dimmed">{req.requestType}</Text>
                      </Group>
                      {req.resolution && (
                        <Text size="xs" c="dimmed" mt={2} lineClamp={2}>{req.resolution}</Text>
                      )}
                    </Box>
                  </Group>
                  <Badge
                    variant="light"
                    color={req.status === 'Approved' ? 'green' : 'red'}
                    size="sm" radius="sm"
                    style={{ flexShrink: 0 }}
                  >
                    {req.status}
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* ── Reject modal ── */}
      <Modal
        opened={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setFeedback(''); }}
        title={
          <Group gap="xs">
            <ThemeIcon size={28} radius="md" color="red" variant="light">
              <LuTriangleAlert size={14} />
            </ThemeIcon>
            <Text fw={700} size="sm">Reject Request</Text>
          </Group>
        }
        centered
        radius="md"
      >
        <Text size="sm" c="dimmed" mb="md">
          Provide a reason for rejecting this request. The student will be notified.
        </Text>
        <Textarea
          label="Feedback / Reason"
          placeholder="Explain why the request is being rejected and what the student should do next…"
          rows={4}
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          mb="lg"
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" size="sm" onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button color="red" size="sm" leftSection={<LuX size={14} />} onClick={handleReject}>
            Confirm Rejection
          </Button>
        </Group>
      </Modal>

    </Box>
  );
}
