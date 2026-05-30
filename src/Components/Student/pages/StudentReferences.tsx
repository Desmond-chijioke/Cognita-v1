import { useState } from 'react';
import {
  Box,
  Title,
  Text,
  Group,
  Button,
  Paper,
  TextInput,
  Table,
  Badge,
  ActionIcon,
  Modal,
  Textarea,
  Stack,
  Divider,
  Loader,
  Card,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  LuLink,
  LuFileText,
  LuShield,
  LuSearch,
  LuExternalLink,
  LuTrash,
  LuTriangleAlert,
} from 'react-icons/lu';
import { STUDENT_REFERENCES } from '../studentData';
import type { Reference } from '../studentData';

export default function StudentReferences() {
  const [search, setSearch] = useState('');
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [doiOpen, { open: openDoi, close: closeDoi }] = useDisclosure(false);
  const [bibtexOpen, { open: openBibtex, close: closeBibtex }] = useDisclosure(false);

  const [doiInput, setDoiInput] = useState('');
  const [doiLoading, setDoiLoading] = useState(false);
  const [doiResult, setDoiResult] = useState<null | {
    title: string;
    authors: string;
    year: number;
    journal: string;
  }>(null);

  const [bibtexInput, setBibtexInput] = useState('');
  const [refs, setRefs] = useState<Reference[]>(STUDENT_REFERENCES);

  const filtered = refs.filter(r => {
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.authors.some(a => a.toLowerCase().includes(q)) ||
      r.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  const citedCount = refs.filter(r => r.cited).length;
  const uncitedCount = refs.filter(r => !r.cited).length;

  function handleRemove(id: string) {
    setRefs(prev => prev.filter(r => r.id !== id));
    notifications.show({ message: 'Reference removed.', color: 'red' });
  }

  function handleDoiLookup() {
    if (!doiInput.trim()) return;
    setDoiLoading(true);
    setDoiResult(null);
    setTimeout(() => {
      setDoiLoading(false);
      setDoiResult({
        title: 'Advances in Privacy-Preserving Federated Learning',
        authors: 'Chen, X., Liu, Y., Wang, Z.',
        year: 2023,
        journal: 'IEEE Transactions on Neural Networks and Learning Systems',
      });
    }, 1400);
  }

  function handleAddFromDoi() {
    if (!doiResult) return;
    const newRef: Reference = {
      id: `r_doi_${Date.now()}`,
      title: doiResult.title,
      authors: doiResult.authors.split(', '),
      year: doiResult.year,
      journal: doiResult.journal,
      doi: doiInput.trim(),
      cited: false,
      status: 'valid',
      tags: [],
    };
    setRefs(prev => [...prev, newRef]);
    notifications.show({ message: 'Reference added to library.', color: 'teal' });
    closeDoi();
    setDoiInput('');
    setDoiResult(null);
  }

  function handleImportBibtex() {
    if (!bibtexInput.trim()) return;
    notifications.show({ message: '3 references imported successfully.', color: 'teal' });
    closeBibtex();
    setBibtexInput('');
  }

  function formatAuthors(authors: string[]) {
    if (authors.length === 0) return '—';
    if (authors.length === 1) return authors[0];
    return `${authors[0]} et al.`;
  }

  return (
    <Box p="xl">
      {/* Page Header */}
      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Title order={2} mb={4}>References</Title>
          <Text c="dimmed" size="sm">
            Manage your citation library, verify DOIs, and maintain bibliographic integrity.
          </Text>
        </Box>
        <Group gap="sm">
          <Button
            leftSection={<LuLink size={16} />}
            variant="light"
            color="brand"
            onClick={openDoi}
          >
            Add via DOI
          </Button>
          <Button
            leftSection={<LuFileText size={16} />}
            variant="light"
            onClick={openBibtex}
          >
            Import BibTeX
          </Button>
          <Button
            leftSection={<LuShield size={16} />}
            variant="outline"
            onClick={() => setShowIntegrity(v => !v)}
          >
            Integrity Check
          </Button>
        </Group>
      </Group>

      {/* Integrity Panel */}
      {showIntegrity && (
        <Paper
          withBorder
          p="md"
          mb="lg"
          style={{ borderLeft: '4px solid #fd7e14' }}
        >
          <Stack gap="xs">
            <Group gap="xs">
              <LuTriangleAlert size={16} color="#fd7e14" />
              <Text size="sm" fw={500}>2 uncited references</Text>
            </Group>
            <Group gap="xs">
              <LuTriangleAlert size={16} color="#fd7e14" />
              <Text size="sm" fw={500}>1 reference with missing DOI</Text>
            </Group>
            <Text size="xs" c="dimmed">
              All references should be cited in the document and have a valid DOI.
            </Text>
          </Stack>
        </Paper>
      )}

      {/* Toolbar */}
      <Group justify="space-between" mb="md">
        <TextInput
          placeholder="Search by title, author, or tag…"
          leftSection={<LuSearch size={16} />}
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          style={{ width: 360 }}
        />
        <Text size="xs" c="dimmed">
          {refs.length} references · {citedCount} cited · {uncitedCount} uncited
        </Text>
      </Group>

      {/* Table */}
      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Authors</Table.Th>
              <Table.Th>Year</Table.Th>
              <Table.Th>Journal</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Cited</Table.Th>
              <Table.Th>DOI</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Text c="dimmed" size="sm" ta="center" py="xl">
                    No references match your search.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filtered.map(ref => (
                <Table.Tr key={ref.id}>
                  <Table.Td style={{ maxWidth: 260 }}>
                    <Text size="sm" fw={500} lineClamp={2}>
                      {ref.title}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">{formatAuthors(ref.authors)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="xs">{ref.year}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="xs"
                      c="dimmed"
                      lineClamp={1}
                      style={{ maxWidth: 160 }}
                    >
                      {ref.journal}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {ref.status === 'valid' ? (
                      <Badge color="green" variant="light" size="xs">Valid</Badge>
                    ) : (
                      <Badge color="red" variant="light" size="xs">Missing DOI</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {ref.cited ? (
                      <Badge color="teal" variant="light" size="xs">Cited</Badge>
                    ) : (
                      <Badge color="gray" variant="light" size="xs">Uncited</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {ref.doi ? (
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        component="a"
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <LuExternalLink size={14} />
                      </ActionIcon>
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => handleRemove(ref.id)}
                    >
                      <LuTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Add via DOI Modal */}
      <Modal opened={doiOpen} onClose={closeDoi} title="Add Reference via DOI" size="md">
        <Stack gap="md">
          <TextInput
            label="DOI"
            placeholder="10.1000/xyz123"
            value={doiInput}
            onChange={e => setDoiInput(e.currentTarget.value)}
          />
          <Button
            leftSection={
              doiLoading ? <Loader size={14} color="white" /> : <LuSearch size={16} />
            }
            color="brand"
            onClick={handleDoiLookup}
            disabled={doiLoading || !doiInput.trim()}
          >
            {doiLoading ? 'Looking up…' : 'Look Up'}
          </Button>

          {doiResult && (
            <>
              <Divider />
              <Card withBorder radius="md" p="md">
                <Text size="sm" fw={600} mb={4}>{doiResult.title}</Text>
                <Text size="xs" c="dimmed" mb={2}>{doiResult.authors}</Text>
                <Text size="xs" c="dimmed">
                  {doiResult.journal} · {doiResult.year}
                </Text>
              </Card>
              <Button color="brand" onClick={handleAddFromDoi}>
                Add to Library
              </Button>
            </>
          )}
        </Stack>
      </Modal>

      {/* Import BibTeX Modal */}
      <Modal opened={bibtexOpen} onClose={closeBibtex} title="Import BibTeX" size="lg">
        <Stack gap="md">
          <Textarea
            rows={8}
            placeholder={`Paste BibTeX entries here…\n@article{mcmahan2017,...}`}
            value={bibtexInput}
            onChange={e => setBibtexInput(e.currentTarget.value)}
          />
          <Button
            color="brand"
            onClick={handleImportBibtex}
            disabled={!bibtexInput.trim()}
          >
            Import References
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
