import { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Checkbox, Divider, Group, Paper, Progress,
  Radio, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuFileText, LuFile, LuCode, LuDownload,
  LuCircleCheck, LuClock, LuSettings,
} from 'react-icons/lu';
import { PROJECT, EXPORT_HISTORY } from '../studentData';
import type { ExportFormat, CitationStyle, ExportRecord } from '../studentData';

const FORMATS: { id: ExportFormat; label: string; ext: string; icon: React.ElementType; color: string }[] = [
  { id: 'docx',  label: 'Microsoft Word',  ext: '.docx', icon: LuFileText, color: '#2b6cb0' },
  { id: 'pdf',   label: 'PDF Document',    ext: '.pdf',  icon: LuFile,     color: '#e03131' },
  { id: 'latex', label: 'LaTeX Source',    ext: '.tex',  icon: LuCode,     color: '#2f9e44' },
];

const STATUS_TEXTS = ['Compiling document…', 'Formatting citations…', 'Embedding figures…', 'Finalising output…'];

export default function StudentExport() {
  const [selected,       setSelected]       = useState<ExportFormat>('pdf');
  const [citationStyle,  setCitationStyle]  = useState<CitationStyle>('apa');
  const [includeCover,   setIncludeCover]   = useState(true);
  const [includeToc,     setIncludeToc]     = useState(true);
  const [includeFigures, setIncludeFigures] = useState(true);
  const [exporting,      setExporting]      = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [done,           setDone]           = useState(false);
  const [statusIdx,      setStatusIdx]      = useState(0);
  const [history,        setHistory]        = useState<ExportRecord[]>(EXPORT_HISTORY);

  useEffect(() => {
    if (!exporting) return;
    const prog = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(prog); return 100; }
        return p + 3;
      });
    }, 75);
    const stat = setInterval(() => setStatusIdx(i => (i + 1) % STATUS_TEXTS.length), 700);
    return () => { clearInterval(prog); clearInterval(stat); };
  }, [exporting]);

  useEffect(() => {
    if (progress >= 100 && exporting) {
      setTimeout(() => { setExporting(false); setDone(true); }, 300);
    }
  }, [progress, exporting]);

  const fmt = FORMATS.find(f => f.id === selected)!;
  const fileName = `${PROJECT.shortTitle}_Draft_v${history.length + 1}${fmt.ext}`;

  const handleGenerate = () => {
    setDone(false);
    setProgress(0);
    setStatusIdx(0);
    setExporting(true);
  };

  const handleDownload = () => {
    const newRecord: ExportRecord = {
      id:           `ex${Date.now()}`,
      format:       selected,
      citationStyle,
      fileName,
      createdAt:    'Just now',
    };
    setHistory(prev => [newRecord, ...prev]);
    setDone(false);
    notifications.show({ title: 'Download started', message: `${fileName} saved to your downloads.`, color: 'green' });
  };

  return (
    <Box p="xl">
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Export Center</Title>
        <Text size="sm" c="dimmed" mt={4}>Generate your thesis in Word, PDF, or LaTeX with your preferred citation style.</Text>
      </Box>

      {/* ── Format selection ── */}
      <Text fw={600} mb="md">Select Format</Text>
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        {FORMATS.map(f => (
          <Paper
            key={f.id}
            withBorder p="xl" radius="md" ta="center"
            style={{
              cursor: 'pointer',
              border: selected === f.id ? `2px solid #3b5bdb` : '1px solid #dee2e6',
              background: selected === f.id ? '#f0f4ff' : 'white',
              transition: 'all 0.15s',
            }}
            onClick={() => setSelected(f.id)}
          >
            <ThemeIcon size={52} radius="xl" variant="light" mx="auto"
              style={{ background: f.color + '18' }}>
              <f.icon size={24} color={f.color} />
            </ThemeIcon>
            <Text fw={700} mt="md" mb={6}>{f.label}</Text>
            <Badge variant="light" size="sm" style={{ background: f.color + '18', color: f.color }}>{f.ext}</Badge>
          </Paper>
        ))}
      </SimpleGrid>

      {/* ── Export options ── */}
      <Paper withBorder p="xl" radius="md" mb="xl" bg="white">
        <Group gap="sm" mb="lg">
          <ThemeIcon size={36} radius="md" color="brand" variant="light"><LuSettings size={17} /></ThemeIcon>
          <Box>
            <Text fw={700}>Export Options</Text>
            <Text size="xs" c="dimmed">Customise your output</Text>
          </Box>
        </Group>
        <Divider mb="lg" />

        <Text size="sm" fw={500} mb="sm">Citation Style</Text>
        <Radio.Group value={citationStyle} onChange={v => setCitationStyle(v as CitationStyle)} mb="lg">
          <Group gap="md">
            <Radio value="apa"     label="APA 7th Edition" color="brand" />
            <Radio value="ieee"    label="IEEE"            color="brand" />
            <Radio value="chicago" label="Chicago"         color="brand" />
          </Group>
        </Radio.Group>

        <Text size="sm" fw={500} mb="sm">Include in Export</Text>
        <Group gap="lg">
          <Checkbox label="Cover page"         checked={includeCover}   onChange={e => setIncludeCover(e.currentTarget.checked)}   color="brand" />
          <Checkbox label="Table of contents"  checked={includeToc}     onChange={e => setIncludeToc(e.currentTarget.checked)}     color="brand" />
          <Checkbox label="Embed figures inline" checked={includeFigures} onChange={e => setIncludeFigures(e.currentTarget.checked)} color="brand" />
        </Group>
      </Paper>

      {/* ── Generate / progress / done ── */}
      <Paper withBorder p="xl" radius="md" mb="xl" bg="white">
        {!exporting && !done && (
          <Stack gap="md" align="center">
            <Group gap="xl">
              {[
                { label: 'Words',      value: PROJECT.wordCount.toLocaleString() },
                { label: 'Sections',   value: '9' },
                { label: 'References', value: '12' },
              ].map(({ label, value }) => (
                <Box key={label} ta="center">
                  <Text fw={800} size="xl" style={{ color: '#3b5bdb' }}>{value}</Text>
                  <Text size="xs" c="dimmed">{label}</Text>
                </Box>
              ))}
            </Group>
            <Divider style={{ width: '100%' }} />
            <Button color="brand" size="lg" leftSection={<LuDownload size={16} />} fullWidth onClick={handleGenerate}>
              Generate Export
            </Button>
          </Stack>
        )}

        {exporting && (
          <Stack gap="md">
            <Text size="sm" fw={600}>{STATUS_TEXTS[statusIdx]}</Text>
            <Progress value={progress} color="brand" size="lg" radius="xl" animated />
            <Text size="sm" fw={700} ta="center">{progress}%</Text>
          </Stack>
        )}

        {done && (
          <Stack gap="md" align="center">
            <ThemeIcon size={56} radius="xl" color="green" variant="light">
              <LuCircleCheck size={28} />
            </ThemeIcon>
            <Text fw={700} size="lg">Export ready!</Text>
            <Text size="sm" c="dimmed">{fileName}</Text>
            <Button color="green" size="md" leftSection={<LuDownload size={15} />} onClick={handleDownload}>
              Download {fmt.ext}
            </Button>
            <Button variant="subtle" color="gray" size="sm" onClick={() => setDone(false)}>
              Generate another
            </Button>
          </Stack>
        )}
      </Paper>

      {/* ── Export history ── */}
      <Paper withBorder p="xl" radius="md" bg="white">
        <Group gap="sm" mb="lg">
          <ThemeIcon size={36} radius="md" color="brand" variant="light"><LuClock size={17} /></ThemeIcon>
          <Box>
            <Text fw={700}>Export History</Text>
            <Text size="xs" c="dimmed">{history.length} previous exports</Text>
          </Box>
        </Group>
        <Divider mb="md" />
        {history.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="lg">No exports yet.</Text>
        ) : (
          <Stack gap="sm">
            {history.map(rec => {
              const f = FORMATS.find(x => x.id === rec.format) ?? FORMATS[1];
              return (
                <Group key={rec.id} justify="space-between" wrap="nowrap" py="xs"
                  style={{ borderBottom: '1px solid #f1f3f5' }}>
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon size={32} radius="md" variant="light" style={{ background: f.color + '18', flexShrink: 0 }}>
                      <f.icon size={15} color={f.color} />
                    </ThemeIcon>
                    <Box>
                      <Text size="sm" fw={600}>{rec.fileName}</Text>
                      <Group gap="xs" mt={2}>
                        <Badge size="xs" variant="light" style={{ background: f.color + '18', color: f.color }}>{rec.format.toUpperCase()}</Badge>
                        <Badge size="xs" variant="light" color="gray">{rec.citationStyle.toUpperCase()}</Badge>
                        <Text size="xs" c="dimmed">{rec.createdAt}</Text>
                      </Group>
                    </Box>
                  </Group>
                  <Button size="compact-xs" variant="subtle" leftSection={<LuDownload size={11} />}
                    onClick={() => notifications.show({ title: 'Download started', message: `${rec.fileName} downloading.`, color: 'brand' })}>
                    Download
                  </Button>
                </Group>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
