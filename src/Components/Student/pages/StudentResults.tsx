import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionIcon, Box, Button, Group, Loader, Modal, Paper,
  Stack, Text, TextInput, Title, Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  LuPlus, LuTrash2, LuDownload, LuPencil, LuCheck, LuX, LuTable,
} from 'react-icons/lu';
import { useAppSelector } from '../../../Redux/hooks';
import {
  fetchResultTables, createResultTable, saveResultTable, deleteResultTable,
} from '../../../supabase/resultTables';
import type { DBResultTable } from '../../../supabase/resultTables';

// ── Helpers ───────────────────────────────────────────────────────────────────

function exportCSV(table: DBResultTable) {
  const rows = [table.headers, ...table.rows];
  const csv  = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `${table.name}.csv` });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Cell input styled as a table cell ────────────────────────────────────────

function Cell({
  value, onChange, isHeader = false, placeholder = '',
}: {
  value: string; onChange: (v: string) => void;
  isHeader?: boolean; placeholder?: string;
}) {
  return (
    <Box
      component="input"
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.currentTarget.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        minWidth: 100,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontSize: isHeader ? 13 : 13,
        fontWeight: isHeader ? 700 : 400,
        color: isHeader ? '#1c2840' : '#343a40',
        padding: '6px 8px',
        fontFamily: 'inherit',
      }}
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudentResults() {
  const user = useAppSelector(s => s.auth.user);

  const [tables,        setTables]        = useState<DBResultTable[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeId,      setActiveId]      = useState<string | null>(null);
  const [hoveredRow,    setHoveredRow]    = useState<number | null>(null);
  const [hoveredCol,    setHoveredCol]    = useState<number | null>(null);
  const [renamingTable, setRenamingTable] = useState(false);
  const [renameVal,     setRenameVal]     = useState('');
  const [newTableOpen,  { open: openNewTable, close: closeNewTable }] = useDisclosure(false);
  const [newName,       setNewName]       = useState('');
  const [creating,      setCreating]      = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = tables.find(t => t.id === activeId) ?? null;

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    fetchResultTables(user.id).then(rows => {
      setTables(rows);
      if (rows.length) setActiveId(rows[0].id);
    }).finally(() => setLoading(false));
  }, [user?.id]);

  // ── Debounced save ────────────────────────────────────────────────────────
  const scheduleSave = useCallback((id: string, patch: Partial<Pick<DBResultTable, 'name' | 'headers' | 'rows'>>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveResultTable(id, patch), 800);
  }, []);

  // ── Mutate helpers ────────────────────────────────────────────────────────
  const mutate = useCallback((id: string, updater: (t: DBResultTable) => DBResultTable) => {
    setTables(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = updater(t);
      scheduleSave(id, { name: next.name, headers: next.headers, rows: next.rows });
      return next;
    }));
  }, [scheduleSave]);

  const updateCell = (row: number, col: number, val: string) => {
    if (!activeId) return;
    mutate(activeId, t => {
      const rows = t.rows.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? val : c) : r);
      return { ...t, rows };
    });
  };

  const updateHeader = (col: number, val: string) => {
    if (!activeId) return;
    mutate(activeId, t => ({
      ...t,
      headers: t.headers.map((h, i) => i === col ? val : h),
    }));
  };

  const addRow = () => {
    if (!activeId || !active) return;
    mutate(activeId, t => ({
      ...t,
      rows: [...t.rows, Array(t.headers.length).fill('')],
    }));
  };

  const addColumn = () => {
    if (!activeId || !active) return;
    mutate(activeId, t => ({
      ...t,
      headers: [...t.headers, `Column ${t.headers.length + 1}`],
      rows:    t.rows.map(r => [...r, '']),
    }));
  };

  const deleteRow = (row: number) => {
    if (!activeId) return;
    mutate(activeId, t => ({ ...t, rows: t.rows.filter((_, i) => i !== row) }));
  };

  const deleteColumn = (col: number) => {
    if (!activeId) return;
    mutate(activeId, t => ({
      ...t,
      headers: t.headers.filter((_, i) => i !== col),
      rows:    t.rows.map(r => r.filter((_, i) => i !== col)),
    }));
  };

  const renameTable = () => {
    if (!activeId || !renameVal.trim()) return;
    mutate(activeId, t => ({ ...t, name: renameVal.trim() }));
    setRenamingTable(false);
  };

  // ── Create table ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newName.trim() || !user?.id) return;
    setCreating(true);
    const created = await createResultTable(user.id, user.institutionId ?? '', newName.trim());
    if (created) {
      setTables(prev => [...prev, created]);
      setActiveId(created.id);
      notifications.show({ message: `Table "${created.name}" created.`, color: 'teal' });
      closeNewTable();
      setNewName('');
    } else {
      notifications.show({ title: 'Could not create table', message: 'The database table may not exist yet. Run the SQL setup in Supabase first.', color: 'red' });
    }
    setCreating(false);
  };

  // ── Delete table ──────────────────────────────────────────────────────────
  const handleDeleteTable = async (id: string) => {
    await deleteResultTable(id);
    setTables(prev => {
      const next = prev.filter(t => t.id !== id);
      setActiveId(next.length ? next[0].id : null);
      return next;
    });
    notifications.show({ message: 'Table deleted.', color: 'red' });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <Box p="xl" ta="center"><Loader color="brand" /></Box>;

  return (
    <Box p="xl">
      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Title order={2}>Results Builder</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Create and edit data tables for your research results. Tables auto-save as you type.
          </Text>
        </Box>
        <Button leftSection={<LuPlus size={16} />} color="brand" onClick={openNewTable}>
          New Table
        </Button>
      </Group>

      {tables.length === 0 ? (
        <Paper withBorder radius="md" p="xl" ta="center">
          <LuTable size={40} color="#ced4da" style={{ margin: '0 auto 12px' }} />
          <Text fw={600} mb={4}>No result tables yet</Text>
          <Text size="sm" c="dimmed" mb="md">Click "New Table" to create your first results table.</Text>
          <Button leftSection={<LuPlus size={14} />} color="brand" onClick={openNewTable}>New Table</Button>
        </Paper>
      ) : (
        <Group align="flex-start" gap="md" wrap="nowrap">

          {/* ── Sidebar ── */}
          <Paper withBorder p="md" radius="md" style={{ width: 220, flexShrink: 0 }}>
            <Text size="xs" fw={700} c="dimmed" mb="sm" style={{ letterSpacing: '0.05em' }}>TABLES</Text>
            <Stack gap={4}>
              {tables.map(t => (
                <Group key={t.id} gap={4} wrap="nowrap"
                  style={{
                    borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                    background: activeId === t.id ? '#eef2ff' : 'transparent',
                    borderLeft: activeId === t.id ? '3px solid #3b5bdb' : '3px solid transparent',
                  }}
                  onClick={() => setActiveId(t.id)}
                >
                  <LuTable size={13} color={activeId === t.id ? '#3b5bdb' : '#adb5bd'} style={{ flexShrink: 0 }} />
                  <Text size="xs" fw={activeId === t.id ? 600 : 400} truncate style={{ flex: 1, color: activeId === t.id ? '#3b5bdb' : '#495057' }}>
                    {t.name}
                  </Text>
                  <ActionIcon size="xs" variant="subtle" color="red"
                    onClick={e => { e.stopPropagation(); handleDeleteTable(t.id); }}>
                    <LuTrash2 size={11} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </Paper>

          {/* ── Editor ── */}
          {active && (
            <Paper withBorder radius="md" style={{ flex: 1, overflow: 'hidden' }}>
              {/* Table header bar */}
              <Group justify="space-between" px="md" py="sm"
                style={{ borderBottom: '1px solid #f1f3f5' }}>
                <Group gap="xs">
                  {renamingTable ? (
                    <Group gap="xs">
                      <TextInput size="xs" value={renameVal}
                        onChange={e => setRenameVal(e.currentTarget.value)}
                        onKeyDown={e => { if (e.key === 'Enter') renameTable(); if (e.key === 'Escape') setRenamingTable(false); }}
                        style={{ width: 200 }} autoFocus />
                      <ActionIcon size="sm" color="brand" variant="light" onClick={renameTable}><LuCheck size={13} /></ActionIcon>
                      <ActionIcon size="sm" color="gray" variant="light" onClick={() => setRenamingTable(false)}><LuX size={13} /></ActionIcon>
                    </Group>
                  ) : (
                    <Group gap={6}>
                      <Text fw={600} size="sm">{active.name}</Text>
                      <ActionIcon size="xs" variant="subtle" color="gray"
                        onClick={() => { setRenameVal(active.name); setRenamingTable(true); }}>
                        <LuPencil size={12} />
                      </ActionIcon>
                    </Group>
                  )}
                  <Text size="xs" c="dimmed">
                    {active.rows.length} rows · {active.headers.length} columns
                  </Text>
                </Group>
                <Group gap="xs">
                  <Button size="xs" variant="light" leftSection={<LuPlus size={12} />} onClick={addRow}>Add Row</Button>
                  <Button size="xs" variant="light" leftSection={<LuPlus size={12} />} onClick={addColumn}>Add Column</Button>
                  <Tooltip label="Export CSV" withArrow>
                    <ActionIcon size="sm" variant="light" color="brand" onClick={() => exportCSV(active)}>
                      <LuDownload size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              {/* Editable table */}
              <Box style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      {/* Row number header */}
                      <th style={{ width: 40, padding: '6px 8px', borderRight: '1px solid #dee2e6', color: '#adb5bd', fontSize: 12 }}>#</th>
                      {active.headers.map((h, ci) => (
                        <th
                          key={ci}
                          style={{
                            borderRight: ci < active.headers.length - 1 ? '1px solid #dee2e6' : undefined,
                            position: 'relative',
                            minWidth: 120,
                          }}
                          onMouseEnter={() => setHoveredCol(ci)}
                          onMouseLeave={() => setHoveredCol(null)}
                        >
                          <Group gap={2} wrap="nowrap">
                            <Cell value={h} onChange={v => updateHeader(ci, v)} isHeader placeholder={`Column ${ci + 1}`} />
                            {hoveredCol === ci && active.headers.length > 1 && (
                              <ActionIcon size="xs" variant="subtle" color="red" style={{ flexShrink: 0, marginRight: 4 }}
                                onClick={() => deleteColumn(ci)}>
                                <LuX size={11} />
                              </ActionIcon>
                            )}
                          </Group>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {active.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        style={{ borderBottom: '1px solid #f1f3f5', background: hoveredRow === ri ? '#f8f9ff' : 'white' }}
                        onMouseEnter={() => setHoveredRow(ri)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {/* Row number + delete */}
                        <td style={{ width: 40, padding: '0 8px', borderRight: '1px solid #f1f3f5', textAlign: 'center' }}>
                          {hoveredRow === ri && active.rows.length > 1 ? (
                            <ActionIcon size="xs" variant="subtle" color="red" onClick={() => deleteRow(ri)}>
                              <LuX size={11} />
                            </ActionIcon>
                          ) : (
                            <Text size="xs" c="dimmed">{ri + 1}</Text>
                          )}
                        </td>
                        {row.map((cell, ci) => (
                          <td key={ci}
                            style={{ borderRight: ci < row.length - 1 ? '1px solid #f1f3f5' : undefined }}>
                            <Cell value={cell} onChange={v => updateCell(ri, ci, v)} placeholder="—" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )}
        </Group>
      )}

      {/* New table modal */}
      <Modal opened={newTableOpen} onClose={closeNewTable} title="Create New Table" size="sm">
        <Stack gap="md">
          <TextInput label="Table name" placeholder="e.g. Table 1: Model Accuracy Comparison"
            value={newName} onChange={e => setNewName(e.currentTarget.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
          <Button color="brand" loading={creating} disabled={!newName.trim()} onClick={handleCreate}>
            Create Table
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
