import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Box, Button, Group, Modal, Paper, Progress,
  SimpleGrid, Stack, Table, Text, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuDatabase, LuUpload, LuActivity, LuFileSpreadsheet,
  LuFileText, LuArchive, LuEye, LuTrash, LuCircleCheck,
} from 'react-icons/lu';
import { DATA_FILES } from '../studentData';
import type { DataFile } from '../studentData';

function fileIcon(type: string) {
  if (type.includes('csv') || type.includes('spreadsheet') || type.includes('excel'))
    return { icon: LuFileSpreadsheet, color: 'teal' };
  if (type.includes('zip') || type.includes('archive'))
    return { icon: LuArchive, color: 'orange' };
  return { icon: LuFileText, color: 'red' };
}

const PREVIEW_COLS = ['PatientID', 'Age', 'SystolicBP', 'HeartRate', 'Temp_C', 'Sepsis'];
const PREVIEW_ROWS = [
  ['P-0001', '42', '128', '98',  '37.4', '0'],
  ['P-0002', '67', '145', '112', '38.9', '1'],
  ['P-0003', '55', '119', '88',  '37.1', '0'],
  ['P-0004', '38', '162', '124', '39.5', '1'],
  ['P-0005', '71', '108', '76',  '36.8', '0'],
];

export default function StudentDataFiles() {
  const navigate = useNavigate();
  const [files, setFiles]         = useState<DataFile[]>(DATA_FILES);
  const [previewFile, setPreviewFile] = useState<DataFile | null>(null);
  const [isDragging, setIsDragging]   = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    notifications.show({ title: 'File uploaded', message: 'Dataset uploaded successfully.', color: 'green' });
  };

  const handleRemove = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    notifications.show({ title: 'File removed', message: 'File removed from your library.', color: 'orange' });
  };

  const csvCount = files.filter(f => f.type.includes('csv')).length;

  return (
    <Box p="xl">
      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Data & Files</Title>
          <Text size="sm" c="dimmed" mt={4}>Upload and manage your research datasets and supporting files.</Text>
        </Box>
        <Button color="brand" variant="light" leftSection={<LuActivity size={14} />}
          onClick={() => navigate('/app/analysis')}>
          Go to Analysis Studio
        </Button>
      </Group>

      {/* ── Dataset status ── */}
      <Paper withBorder p="lg" mb="xl" radius="md"
        style={{ borderLeft: '4px solid #3b5bdb', background: '#f8f9ff' }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <ThemeIcon size={44} radius="md" color="brand" variant="light" style={{ flexShrink: 0 }}>
              <LuDatabase size={22} />
            </ThemeIcon>
            <Box>
              <Group gap="xs" mb={4}>
                <Text fw={700} size="md">Primary Dataset</Text>
                <Badge color="green" variant="light" size="sm" leftSection={<LuCircleCheck size={10} />}>
                  {csvCount} datasets uploaded
                </Badge>
              </Group>
              <Group gap="xl">
                <Text size="xs" c="dimmed">Total rows: <strong style={{ color: '#1c1c1e' }}>10,630</strong></Text>
                <Text size="xs" c="dimmed">Features: <strong style={{ color: '#1c1c1e' }}>47</strong></Text>
                <Text size="xs" c="dimmed">Avg. missing data: <strong style={{ color: '#f08c00' }}>13.8%</strong></Text>
              </Group>
            </Box>
          </Group>
          <Box style={{ minWidth: 140, flexShrink: 0 }}>
            <Text size="xs" c="dimmed" mb={4}>Dataset completeness</Text>
            <Progress value={80} color="brand" size="sm" radius="xl" />
            <Text size="xs" c="dimmed" mt={4}>80%</Text>
          </Box>
        </Group>
      </Paper>

      {/* ── Upload zone ── */}
      <Paper
        withBorder p="xl" radius="md" mb="xl" ta="center"
        style={{
          border: isDragging ? '2px dashed #3b5bdb' : '2px dashed #dee2e6',
          background: isDragging ? '#f0f4ff' : 'white',
          transition: 'all 0.2s',
          cursor: 'pointer',
        }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => notifications.show({ title: 'File uploaded', message: 'Dataset uploaded successfully.', color: 'green' })}
      >
        <ThemeIcon size={56} radius="xl" color="gray" variant="light" mx="auto" mb="md">
          <LuUpload size={26} />
        </ThemeIcon>
        <Text fw={600} size="md" mb={4}>Drop CSV or Excel files here</Text>
        <Text size="sm" c="dimmed" mb="lg">Supports .csv, .xlsx, .xls up to 50 MB</Text>
        <Button variant="outline" color="brand" size="sm">Browse Files</Button>
      </Paper>

      {/* ── Files grid ── */}
      <Text fw={600} mb="md">{files.length} files in your library</Text>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {files.map(file => {
          const { icon: Icon, color } = fileIcon(file.type);
          return (
            <Paper key={file.id} withBorder p="md" radius="md" bg="white"
              style={{ transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,91,219,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
              <Group gap="sm" mb="sm" wrap="nowrap">
                <ThemeIcon size={38} radius="md" color={color} variant="light" style={{ flexShrink: 0 }}>
                  <Icon size={18} />
                </ThemeIcon>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600} lineClamp={1}>{file.name}</Text>
                  <Group gap="xs" mt={2}>
                    <Badge size="xs" variant="light" color="gray">{file.size}</Badge>
                    <Text size="xs" c="dimmed">{file.uploadedAt}</Text>
                  </Group>
                </Box>
              </Group>
              <Text size="xs" c="dimmed" lineClamp={2} mb="md">{file.description}</Text>
              <Group gap="xs">
                <Button size="xs" variant="subtle" leftSection={<LuEye size={11} />}
                  onClick={() => setPreviewFile(file)}>
                  Preview
                </Button>
                <Button size="xs" variant="subtle" color="red" leftSection={<LuTrash size={11} />}
                  onClick={() => handleRemove(file.id)}>
                  Remove
                </Button>
              </Group>
            </Paper>
          );
        })}
      </SimpleGrid>

      {/* ── Preview modal ── */}
      <Modal
        opened={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.name ?? 'File Preview'}
        size="xl"
      >
        {previewFile && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">{previewFile.description}</Text>
            <Text size="xs" fw={600} c="dimmed">SHOWING FIRST 5 ROWS</Text>
            <Paper withBorder radius="md" style={{ overflow: 'auto' }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr style={{ background: '#f8f9fa' }}>
                    {PREVIEW_COLS.map(c => (
                      <Table.Th key={c}><Text size="xs" fw={600} c="dimmed">{c}</Text></Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {PREVIEW_ROWS.map((row, i) => (
                    <Table.Tr key={i}>
                      {row.map((cell, j) => (
                        <Table.Td key={j}><Text size="xs">{cell}</Text></Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={() => setPreviewFile(null)}>Close</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
