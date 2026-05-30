import { useState } from 'react';
import {
  Box, Button, Group, Paper, SimpleGrid, Stack,
  Text, Textarea, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuTable, LuImage, LuActivity, LuDownload,
  LuPenLine, LuClipboard,
} from 'react-icons/lu';
import { PROJECT } from '../studentData';

interface ResultItem {
  id:    string;
  title: string;
  type:  'table' | 'figure';
}

const TABLES: ResultItem[] = [
  { id: 'table1', title: 'Table 1: Model Accuracy Comparison',      type: 'table' },
  { id: 'table2', title: 'Table 2: Communication Rounds',           type: 'table' },
  { id: 'table3', title: 'Table 3: Privacy Budget Analysis',        type: 'table' },
];

const FIGURES: ResultItem[] = [
  { id: 'fig1', title: 'Figure 1: FedCliniq Architecture Diagram',  type: 'figure' },
  { id: 'fig2', title: 'Figure 2: Convergence Curves per Hospital', type: 'figure' },
];

const ALL_ITEMS = [...TABLES, ...FIGURES];

export default function StudentResults() {
  const [selected,  setSelected]  = useState('table1');
  const [captions,  setCaptions]  = useState<Record<string, string>>(
    Object.fromEntries(ALL_ITEMS.map(i => [i.id, '']))
  );

  const current = ALL_ITEMS.find(i => i.id === selected)!;
  const wordPct  = Math.round((PROJECT.wordCount / PROJECT.targetWordCount) * 100);

  return (
    <Box p="xl">
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Results Builder</Title>
        <Text size="sm" c="dimmed" mt={4}>Manage tables and figures, edit captions, and insert results into your document.</Text>
      </Box>

      {/* ── Summary ── */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        {[
          {
            label: 'Thesis Completion',
            value: `${wordPct}%`,
            sub: `${PROJECT.wordCount.toLocaleString()} / ${PROJECT.targetWordCount.toLocaleString()} words`,
            color: '#3b5bdb',
            icon: LuClipboard,
          },
          {
            label: 'Tables',
            value: `${TABLES.length}`,
            sub: 'results tables',
            color: '#0c8599',
            icon: LuTable,
          },
          {
            label: 'Figures',
            value: `${FIGURES.length}`,
            sub: 'result figures',
            color: '#7950f2',
            icon: LuImage,
          },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <Paper key={label} withBorder p="lg" radius="md" bg="white">
            <Group gap="md" wrap="nowrap">
              <ThemeIcon size={44} radius="md" variant="light" style={{ background: color + '15', flexShrink: 0 }}>
                <Icon size={20} color={color} />
              </ThemeIcon>
              <Box>
                <Text fw={800} size="xl" lh={1} style={{ color }}>{value}</Text>
                <Text size="xs" fw={500} c="dimmed" mt={4}>{label}</Text>
                <Text size="xs" c="dimmed">{sub}</Text>
              </Box>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      {/* ── Main layout ── */}
      <Group align="flex-start" gap="md" wrap="nowrap">

        {/* Left nav */}
        <Paper withBorder p="md" radius="md" bg="white" style={{ width: 260, flexShrink: 0 }}>
          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed" mb={4} style={{ letterSpacing: '0.05em' }}>TABLES</Text>
            {TABLES.map(t => (
              <Box
                key={t.id}
                px="sm" py={8}
                style={{
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: selected === t.id ? '#eef2ff' : 'transparent',
                  borderLeft: selected === t.id ? '3px solid #3b5bdb' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                onClick={() => setSelected(t.id)}
              >
                <Group gap="sm" wrap="nowrap">
                  <LuTable size={14} color={selected === t.id ? '#3b5bdb' : '#adb5bd'} />
                  <Text size="xs" fw={selected === t.id ? 600 : 400} style={{ color: selected === t.id ? '#3b5bdb' : '#495057' }} lineClamp={2}>
                    {t.title}
                  </Text>
                </Group>
              </Box>
            ))}

            <Text size="xs" fw={700} c="dimmed" mt="sm" mb={4} style={{ letterSpacing: '0.05em' }}>FIGURES</Text>
            {FIGURES.map(f => (
              <Box
                key={f.id}
                px="sm" py={8}
                style={{
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: selected === f.id ? '#eef2ff' : 'transparent',
                  borderLeft: selected === f.id ? '3px solid #3b5bdb' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                onClick={() => setSelected(f.id)}
              >
                <Group gap="sm" wrap="nowrap">
                  <LuImage size={14} color={selected === f.id ? '#3b5bdb' : '#adb5bd'} />
                  <Text size="xs" fw={selected === f.id ? 600 : 400} style={{ color: selected === f.id ? '#3b5bdb' : '#495057' }} lineClamp={2}>
                    {f.title}
                  </Text>
                </Group>
              </Box>
            ))}
          </Stack>
        </Paper>

        {/* Right editor panel */}
        <Paper withBorder p="xl" radius="md" bg="white" style={{ flex: 1 }}>
          <Text fw={700} size="lg" mb="lg">{current.title}</Text>

          {/* Visualization placeholder */}
          <Box
            mb="xl"
            style={{
              height: 260,
              background: '#f8f9fa',
              border: '1.5px dashed #dee2e6',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <ThemeIcon size={56} radius="xl" color="gray" variant="light">
              {current.type === 'table' ? <LuTable size={26} /> : <LuActivity size={26} />}
            </ThemeIcon>
            <Text size="sm" c="dimmed">[{current.type === 'table' ? 'Table' : 'Figure'} Placeholder]</Text>
            <Button size="xs" variant="light" color="brand" leftSection={<LuActivity size={12} />}
              onClick={() => notifications.show({ title: 'Analysis Studio', message: 'Navigating to Analysis Studio to import result.', color: 'brand' })}>
              Import from Analysis Studio
            </Button>
          </Box>

          {/* Caption */}
          <Text size="sm" fw={600} mb="xs">Caption</Text>
          <Textarea
            placeholder={`Enter caption for ${current.title}…`}
            value={captions[selected]}
            onChange={e => setCaptions(prev => ({ ...prev, [selected]: e.target.value }))}
            rows={2}
            mb="lg"
            styles={{ input: { background: '#f8f9fa' } }}
          />

          {/* Actions */}
          <Group gap="sm">
            <Button color="brand" leftSection={<LuPenLine size={14} />}
              onClick={() => notifications.show({ title: 'Result inserted', message: `${current.title} inserted into Chapter 4: Results & Analysis.`, color: 'green' })}>
              Insert into Document
            </Button>
            <Button variant="light" leftSection={<LuDownload size={14} />}
              onClick={() => notifications.show({ title: 'Export started', message: `Exporting ${current.title} as PNG.`, color: 'brand' })}>
              Export as PNG
            </Button>
          </Group>
        </Paper>
      </Group>
    </Box>
  );
}
