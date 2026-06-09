import { Badge, Box, Button, Checkbox, Group, Paper, Stack, Text } from '@mantine/core';
import { LuFileText } from 'react-icons/lu';
import type { DBSubmission } from '../../supabase/submissions';

// ── Reusable "pick which submitted chapters to analyse" panel ─────────────────
// Used by the AI integrity / review / analysis pages so the student controls
// exactly what gets sent to the AI rather than always scanning everything.

interface ChapterPickerProps {
  submissions: DBSubmission[];
  selected:    Set<string>;
  onChange:    (next: Set<string>) => void;
  multiple?:   boolean;
  title?:      string;
  description?: string;
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function ChapterPicker({
  submissions, selected, onChange, multiple = true,
  title = 'Choose chapters to analyse',
  description = 'Select which of your submitted chapters the AI should look at.',
}: ChapterPickerProps) {
  const toggle = (id: string) => {
    if (multiple) {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id); else next.add(id);
      onChange(next);
    } else {
      onChange(selected.has(id) ? new Set() : new Set([id]));
    }
  };

  if (submissions.length === 0) {
    return (
      <Paper withBorder p="lg" radius="md" ta="center" style={{ background: '#f8f9fa' }}>
        <Text size="sm" c="dimmed">You haven't submitted any chapters yet — submit content in the Editor first.</Text>
      </Paper>
    );
  }

  return (
    <Box>
      <Group justify="space-between" align="flex-start" mb="sm">
        <Box>
          <Text size="sm" fw={600}>{title}</Text>
          <Text size="xs" c="dimmed">{description}</Text>
        </Box>
        {multiple && (
          <Group gap={6}>
            <Button size="compact-xs" variant="subtle" onClick={() => onChange(new Set(submissions.map(s => s.section_id)))}>
              Select all
            </Button>
            <Button size="compact-xs" variant="subtle" color="gray" onClick={() => onChange(new Set())}>
              Clear
            </Button>
          </Group>
        )}
      </Group>
      <Stack gap={6}>
        {submissions.map(s => {
          const checked = selected.has(s.section_id);
          return (
            <Paper key={s.section_id} withBorder p="sm" radius="md"
              onClick={() => toggle(s.section_id)}
              style={{
                cursor: 'pointer',
                background: checked ? '#f0f4ff' : 'white',
                border: checked ? '1.5px solid #3b5bdb' : undefined,
              }}>
              <Group gap="sm" wrap="nowrap">
                <Checkbox
                  checked={checked}
                  onChange={() => toggle(s.section_id)}
                  onClick={e => e.stopPropagation()}
                  radius={multiple ? 'sm' : 'xl'}
                  color="brand"
                />
                <LuFileText size={15} color="#748ffc" style={{ flexShrink: 0 }} />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={500} truncate>{s.section_title}</Text>
                </Box>
                <Badge variant="light" size="xs" color="gray">{wordCount(s.content)} words</Badge>
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
