import { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Divider, Group, Paper, Progress,
  SimpleGrid, Stack, Tabs, Text, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  LuShield, LuDownload, LuCircleCheck, LuTriangleAlert,
  LuX, LuBot, LuChevronDown, LuChevronUp, LuExternalLink,
} from 'react-icons/lu';
import { PROJECT, SIMILARITY_SECTIONS } from '../studentData';

function simRisk(v: number) {
  return v <= 20 ? { label: 'Acceptable', color: '#2f9e44' }
       : v <= 35 ? { label: 'Borderline',  color: '#f08c00' }
       :           { label: 'Critical',    color: '#e03131' };
}
function aiRisk(v: number) {
  return v <= 20 ? { label: 'Low',      color: '#2f9e44' }
       : v <= 45 ? { label: 'Moderate', color: '#f08c00' }
       :           { label: 'High',     color: '#e03131' };
}

function DonutRing({ value, color }: { value: number; color: string }) {
  const r = 44, cx = 56, cy = 56;
  const circumference = 2 * Math.PI * r;
  const dash = Math.min(value / 100, 1) * circumference;
  return (
    <svg width={112} height={112} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f3f5" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" />
    </svg>
  );
}

const overallSim = Math.round(
  SIMILARITY_SECTIONS.reduce((a, s) => a + s.similarity, 0) / SIMILARITY_SECTIONS.filter(s => s.similarity > 0).length || PROJECT.similarityIndex
);
const overallAi = Math.round(
  SIMILARITY_SECTIONS.reduce((a, s) => a + s.aiScore, 0) / SIMILARITY_SECTIONS.filter(s => s.aiScore > 0).length || PROJECT.aiDetectionScore
);

export default function StudentPlagiarism() {
  const [scanning,     setScanning]     = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [expandedSim,  setExpandedSim]  = useState<string | null>(null);
  const [expandedAi,   setExpandedAi]   = useState<string | null>(null);

  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) { clearInterval(id); setScanning(false); setScanProgress(0); notifications.show({ title: 'Scan complete', message: 'Integrity report updated.', color: 'green' }); return 0; }
        return p + 4;
      });
    }, 120);
    return () => clearInterval(id);
  }, [scanning]);

  const simColor  = simRisk(overallSim).color;
  const aiColor   = aiRisk(overallAi).color;

  return (
    <Box p="xl">
      <Group justify="space-between" align="flex-start" mb="xl" wrap="wrap" gap="sm">
        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Integrity Report</Title>
          <Text size="sm" c="dimmed" mt={4}>Similarity index and AI detection analysis for your full document.</Text>
        </Box>
        <Group gap="sm">
          <Text size="xs" c="dimmed">Last scanned 5 days ago</Text>
          <Button variant="light" color="brand" leftSection={<LuDownload size={14} />}
            onClick={() => notifications.show({ title: 'Report downloaded', message: 'Integrity report PDF saved.', color: 'brand' })}>
            Download Report
          </Button>
          <Button color="brand" leftSection={<LuShield size={14} />} loading={scanning}
            onClick={() => { setScanning(true); setScanProgress(0); }}>
            Run Full Scan
          </Button>
        </Group>
      </Group>

      {/* ── Scan progress ── */}
      {scanning && (
        <Paper withBorder p="md" radius="md" mb="xl" style={{ borderLeft: '4px solid #3b5bdb' }}>
          <Text size="sm" fw={600} mb="xs">Scanning document… {scanProgress}%</Text>
          <Progress value={scanProgress} color="brand" size="md" radius="xl" animated />
        </Paper>
      )}

      {/* ── Score cards ── */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="xl">

        {/* Similarity */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <Group gap="xl" align="center" wrap="nowrap">
            <Box style={{ position: 'relative', flexShrink: 0 }}>
              <DonutRing value={overallSim} color={simColor} />
              <Box style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text fw={800} style={{ fontSize: 22, color: simColor }}>{overallSim}%</Text>
              </Box>
            </Box>
            <Box style={{ flex: 1 }}>
              <Text fw={700} size="lg" mb={4}>Similarity Index</Text>
              <Badge variant="light" size="sm" mb="sm" style={{ background: simColor + '20', color: simColor }}>
                {simRisk(overallSim).label}
              </Badge>
              <Text size="xs" c="dimmed" mb="sm">{PROJECT.wordCount.toLocaleString()} words checked · {SIMILARITY_SECTIONS.flatMap(s => s.sources ?? []).length} matching sources</Text>
              <Stack gap={4}>
                {[{ label: '≤ 20%  Safe',       color: '#2f9e44' }, { label: '21–35%  Borderline', color: '#f08c00' }, { label: '> 35%   Critical',  color: '#e03131' }].map(({ label, color }) => (
                  <Group key={label} gap="xs">
                    <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <Text size="xs" c="dimmed">{label}</Text>
                  </Group>
                ))}
              </Stack>
            </Box>
          </Group>
        </Paper>

        {/* AI detection */}
        <Paper withBorder p="xl" radius="md" bg="white">
          <Group gap="xl" align="center" wrap="nowrap">
            <Box style={{ position: 'relative', flexShrink: 0 }}>
              <DonutRing value={overallAi} color={aiColor} />
              <Box style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text fw={800} style={{ fontSize: 22, color: aiColor }}>{overallAi}%</Text>
              </Box>
            </Box>
            <Box style={{ flex: 1 }}>
              <Text fw={700} size="lg" mb={4}>AI Detection Score</Text>
              <Badge variant="light" size="sm" mb="sm" style={{ background: aiColor + '20', color: aiColor }}>
                {aiRisk(overallAi).label}
              </Badge>
              <Text size="xs" c="dimmed" mb="sm">Reflects AI-assisted writing involvement across document</Text>
              <Stack gap={4}>
                {[{ label: '≤ 20%  Low',       color: '#2f9e44' }, { label: '21–45%  Moderate', color: '#f08c00' }, { label: '> 45%   High',     color: '#e03131' }].map(({ label, color }) => (
                  <Group key={label} gap="xs">
                    <Box style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <Text size="xs" c="dimmed">{label}</Text>
                  </Group>
                ))}
              </Stack>
            </Box>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* ── Section breakdown ── */}
      <Tabs defaultValue="similarity">
        <Tabs.List mb="lg">
          <Tabs.Tab value="similarity" leftSection={<LuShield size={14} />}>Similarity Index</Tabs.Tab>
          <Tabs.Tab value="ai"         leftSection={<LuBot    size={14} />}>AI Detection</Tabs.Tab>
        </Tabs.List>

        {/* Similarity tab */}
        <Tabs.Panel value="similarity">
          <Paper withBorder p="sm" radius="md" mb="md" style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}>
            <Text size="xs" c="dimmed">
              Scores above <strong>20%</strong> require explanation or citation. Above <strong>35%</strong> may result in submission rejection. Quoted text should always be cited.
            </Text>
          </Paper>
          <Stack gap="sm">
            {SIMILARITY_SECTIONS.map(sec => {
              const { color } = simRisk(sec.similarity);
              const isOpen = expandedSim === sec.id;
              return (
                <Paper key={sec.id} withBorder p="md" radius="md" bg="white"
                  style={{ cursor: 'pointer' }} onClick={() => setExpandedSim(isOpen ? null : sec.id)}>
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      <ThemeIcon size={26} radius="xl" variant="light"
                        color={sec.similarity <= 20 ? 'green' : sec.similarity <= 35 ? 'orange' : 'red'}
                        style={{ flexShrink: 0 }}>
                        {sec.similarity <= 20 ? <LuCircleCheck size={13} /> : sec.similarity <= 35 ? <LuTriangleAlert size={13} /> : <LuX size={13} />}
                      </ThemeIcon>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500}>{sec.section}</Text>
                        <Group gap="sm" mt={4}>
                          <Progress value={(sec.similarity / 40) * 100} color={sec.similarity <= 20 ? 'green' : sec.similarity <= 35 ? 'orange' : 'red'} size="xs" radius="xl" style={{ width: 120 }} />
                          <Text size="xs" fw={700} style={{ color }}>{sec.similarity}%</Text>
                        </Group>
                      </Box>
                    </Group>
                    {isOpen ? <LuChevronUp size={16} color="#adb5bd" /> : <LuChevronDown size={16} color="#adb5bd" />}
                  </Group>
                  {isOpen && sec.sources && sec.sources.length > 0 && (
                    <Box mt="md" pt="md" style={{ borderTop: '1px solid #f1f3f5' }}>
                      <Text size="xs" fw={600} c="dimmed" mb="xs">MATCHING SOURCES</Text>
                      <Stack gap="xs">
                        {sec.sources.map((src, i) => (
                          <Group key={i} gap="sm" justify="space-between" wrap="nowrap">
                            <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>{src.title}</Text>
                            <Group gap="xs" style={{ flexShrink: 0 }}>
                              <Badge size="xs" variant="light" color="orange">{src.match}% match</Badge>
                              <LuExternalLink size={12} color="#adb5bd" style={{ cursor: 'pointer' }} />
                            </Group>
                          </Group>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </Tabs.Panel>

        {/* AI detection tab */}
        <Tabs.Panel value="ai">
          <Paper withBorder p="sm" radius="md" mb="md" style={{ background: '#f8f9ff', border: '1px dashed #748ffc' }}>
            <Text size="xs" c="dimmed">
              Scores above <strong>20%</strong> indicate significant AI involvement. Sections above <strong>45%</strong> should be substantially rewritten in your own words.
            </Text>
          </Paper>
          <Stack gap="sm">
            {SIMILARITY_SECTIONS.map(sec => {
              const { color } = aiRisk(sec.aiScore);
              const isOpen = expandedAi === sec.id;
              return (
                <Paper key={sec.id} withBorder p="md" radius="md" bg="white"
                  style={{ cursor: 'pointer' }} onClick={() => setExpandedAi(isOpen ? null : sec.id)}>
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      <ThemeIcon size={26} radius="xl" variant="light"
                        color={sec.aiScore <= 20 ? 'green' : sec.aiScore <= 45 ? 'orange' : 'red'}
                        style={{ flexShrink: 0 }}>
                        {sec.aiScore <= 20 ? <LuCircleCheck size={13} /> : <LuBot size={13} />}
                      </ThemeIcon>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500}>{sec.section}</Text>
                        <Group gap="sm" mt={4}>
                          <Progress value={(sec.aiScore / 50) * 100} color={sec.aiScore <= 20 ? 'green' : sec.aiScore <= 45 ? 'orange' : 'red'} size="xs" radius="xl" style={{ width: 120 }} />
                          <Text size="xs" fw={700} style={{ color }}>{sec.aiScore}%</Text>
                        </Group>
                      </Box>
                    </Group>
                    {isOpen ? <LuChevronUp size={16} color="#adb5bd" /> : <LuChevronDown size={16} color="#adb5bd" />}
                  </Group>
                  {isOpen && (
                    <Box mt="md" pt="md" style={{ borderTop: '1px solid #f1f3f5' }}>
                      <Text size="xs" c="dimmed">
                        {sec.aiScore <= 20
                          ? 'This section appears to be primarily original writing with minimal AI involvement.'
                          : sec.aiScore <= 45
                          ? 'This section shows characteristics of AI-assisted paraphrasing. Review for overly formulaic sentence structures and ensure the ideas are expressed in your own voice.'
                          : 'This section has a high probability of AI-generated content. It should be substantially rewritten to reflect your own analysis and understanding.'}
                      </Text>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* ── Legend ── */}
      <Paper withBorder p="sm" radius="md" mt="lg" style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}>
        <Group gap="xl" wrap="wrap">
          {[
            { icon: LuCircleCheck,   color: '#2f9e44', label: 'Safe — within acceptable thresholds' },
            { icon: LuTriangleAlert, color: '#f08c00', label: 'Borderline — review recommended' },
            { icon: LuX,             color: '#e03131', label: 'Critical — revision required' },
          ].map(({ icon: Icon, color, label }) => (
            <Group key={label} gap="xs">
              <Icon size={13} style={{ color }} />
              <Text size="xs" c="dimmed">{label}</Text>
            </Group>
          ))}
        </Group>
      </Paper>

      <Divider my="xl" />
    </Box>
  );
}
