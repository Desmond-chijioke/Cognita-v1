import { useState } from 'react';
import {
  Avatar, Badge, Box, Button, Divider, Group,
  Paper, Select, Stack, Text, Textarea, TextInput,
  ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuActivity, LuMail, LuMessageSquare, LuUserPlus,
} from 'react-icons/lu';
import {
  COLLABORATORS, ACTIVITIES, DISCUSSION_THREADS,
} from '../studentData';
import type { CollaboratorRole } from '../studentData';

// ── helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_COLOR: Record<CollaboratorRole, string> = {
  owner:    'brand',
  editor:   'teal',
  reviewer: 'violet',
  viewer:   'gray',
};

// ── page ──────────────────────────────────────────────────────────────────────

export default function StudentCollaboration() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState<string | null>('viewer');

  // reply state: threadId → reply text; and threadId → show textarea
  const [replyTexts,  setReplyTexts]  = useState<Record<string, string>>({});
  const [replyOpen,   setReplyOpen]   = useState<Record<string, boolean>>({});

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    notifications.show({
      title:   'Invite sent',
      message: `Invite sent to ${inviteEmail}`,
      color:   'green',
    });
    setInviteEmail('');
    setInviteRole('viewer');
  }

  function toggleReply(threadId: string) {
    setReplyOpen(prev => ({ ...prev, [threadId]: !prev[threadId] }));
  }

  return (
    <Box p="xl">

      {/* ── Header ── */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>
          Collaboration
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Manage your research team, track activity, and discuss your thesis in real time.
        </Text>
      </Box>

      <Stack gap="lg">

        {/* ── Invite collaborator ── */}
        <Paper withBorder radius="md" p="lg" bg="white">
          <Group gap="sm" mb="md" wrap="nowrap">
            <ThemeIcon size={36} radius="md" color="brand" variant="light">
              <LuUserPlus size={17} />
            </ThemeIcon>
            <Box>
              <Text fw={700} size="md" lh={1.2}>Invite a Collaborator</Text>
              <Text size="xs" c="dimmed">Share your thesis with a colleague or co-researcher.</Text>
            </Box>
          </Group>
          <Divider mb="md" />
          <Group gap="sm" wrap="wrap">
            <TextInput
              placeholder="colleague@university.ac.ng"
              leftSection={<LuMail size={14} />}
              value={inviteEmail}
              onChange={e => setInviteEmail(e.currentTarget.value)}
              style={{ flex: '1 1 260px', minWidth: 0 }}
              radius="md"
            />
            <Select
              value={inviteRole}
              onChange={setInviteRole}
              data={[
                { value: 'viewer',   label: 'Viewer'   },
                { value: 'editor',   label: 'Editor'   },
                { value: 'reviewer', label: 'Reviewer' },
              ]}
              radius="md"
              style={{ minWidth: 140 }}
            />
            <Button
              color="brand"
              leftSection={<LuUserPlus size={15} />}
              onClick={handleInvite}
              radius="md"
            >
              Send Invite
            </Button>
          </Group>
        </Paper>

        {/* ── Team Members ── */}
        <Paper withBorder radius="md" p="lg" bg="white">
          <Text fw={700} size="md" mb="md">Team Members</Text>
          <Stack gap={0}>
            {COLLABORATORS.map((collab, idx) => (
              <Group
                key={collab.id}
                justify="space-between"
                py={12}
                wrap="nowrap"
                style={idx < COLLABORATORS.length - 1
                  ? { borderBottom: '1px solid #f1f3f5' }
                  : undefined}
              >
                <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <Avatar color={collab.color} radius="xl" size="md">
                    {getInitials(collab.name)}
                  </Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} lh={1.2}>{collab.name}</Text>
                    <Text size="xs" c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {collab.email}
                    </Text>
                  </Box>
                </Group>
                <Group gap="sm" align="center" style={{ flexShrink: 0 }}>
                  <Badge
                    color={ROLE_COLOR[collab.role]}
                    variant="light"
                    size="sm"
                    style={{ textTransform: 'capitalize' }}
                  >
                    {collab.role}
                  </Badge>
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    Active {collab.lastActive}
                  </Text>
                </Group>
              </Group>
            ))}
          </Stack>
        </Paper>

        {/* ── Activity Feed ── */}
        <Paper withBorder radius="md" p="lg" bg="white">
          <Text fw={700} size="md" mb="md">Activity Feed</Text>
          <Stack gap={0}>
            {ACTIVITIES.slice(0, 6).map((act, idx) => (
              <Group
                key={act.id}
                justify="space-between"
                py={10}
                wrap="nowrap"
                style={idx < Math.min(6, ACTIVITIES.length) - 1
                  ? { borderBottom: '1px solid #f8f9fa' }
                  : undefined}
              >
                <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <ThemeIcon size={28} radius="xl" color="brand" variant="light">
                    <LuActivity size={13} />
                  </ThemeIcon>
                  <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Text span fw={600} size="sm">{act.user}</Text>
                    {' '}{act.action}{' '}
                    <Text span size="sm" c="dimmed">{act.target}</Text>
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" style={{ flexShrink: 0, marginLeft: 8 }}>
                  {act.timestamp}
                </Text>
              </Group>
            ))}
          </Stack>
        </Paper>

        {/* ── Discussion Threads ── */}
        <Paper withBorder radius="md" p="lg" bg="white">
          <Text fw={700} size="md" mb="md">Discussion Threads</Text>
          <Stack gap="md">
            {DISCUSSION_THREADS.map(thread => (
              <Paper key={thread.id} withBorder radius="md" p="md" bg="#fafafa">

                {/* Thread header */}
                <Group justify="space-between" mb="xs" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <Avatar color="brand" radius="xl" size="sm">
                      {getInitials(thread.user)}
                    </Avatar>
                    <Box>
                      <Group gap={6} wrap="nowrap">
                        <Text size="sm" fw={600}>{thread.user}</Text>
                        <Badge variant="outline" size="xs" color="brand">
                          {thread.section}
                        </Badge>
                      </Group>
                    </Box>
                  </Group>
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {thread.timestamp}
                  </Text>
                </Group>

                {/* Thread body */}
                <Text size="sm" mb="sm" lh={1.6}>{thread.text}</Text>

                {/* Replies */}
                {thread.replies.length > 0 && (
                  <Stack
                    gap="xs"
                    mb="sm"
                    style={{
                      borderLeft: '2px solid #3b5bdb',
                      paddingLeft: 12,
                      marginLeft: 4,
                    }}
                  >
                    {thread.replies.map(reply => (
                      <Box key={reply.id}>
                        <Group gap={6} mb={2} wrap="nowrap">
                          <Text size="xs" fw={600}>{reply.user}</Text>
                          <Text size="xs" c="dimmed">{reply.timestamp}</Text>
                        </Group>
                        <Text size="sm" lh={1.55}>{reply.text}</Text>
                      </Box>
                    ))}
                  </Stack>
                )}

                {/* Reply input */}
                {replyOpen[thread.id] && (
                  <Box mb="xs">
                    <Textarea
                      placeholder="Write a reply…"
                      value={replyTexts[thread.id] ?? ''}
                      onChange={e =>
                        setReplyTexts(prev => ({ ...prev, [thread.id]: e.currentTarget.value }))
                      }
                      rows={2}
                      radius="md"
                      mb="xs"
                    />
                    <Group gap="xs">
                      <Button
                        size="xs"
                        color="brand"
                        onClick={() => {
                          setReplyTexts(prev => ({ ...prev, [thread.id]: '' }));
                          setReplyOpen(prev => ({ ...prev, [thread.id]: false }));
                          notifications.show({
                            title:   'Reply posted',
                            message: 'Your reply has been added.',
                            color:   'green',
                          });
                        }}
                        disabled={!replyTexts[thread.id]?.trim()}
                      >
                        Post Reply
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="gray"
                        onClick={() => toggleReply(thread.id)}
                      >
                        Cancel
                      </Button>
                    </Group>
                  </Box>
                )}

                {/* Reply button */}
                <Button
                  size="xs"
                  variant="subtle"
                  color="brand"
                  leftSection={<LuMessageSquare size={12} />}
                  onClick={() => toggleReply(thread.id)}
                >
                  Reply
                </Button>

              </Paper>
            ))}
          </Stack>
        </Paper>

      </Stack>
    </Box>
  );
}
