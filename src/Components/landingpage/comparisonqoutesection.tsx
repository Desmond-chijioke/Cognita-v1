import { Box, Text, Title, Paper, Stack } from '@mantine/core';

const quotes = [
  { tool: 'Zotero', line: 'Zotero manages papers.', cognita: 'Cognita manages thinking.' },
  { tool: 'Turnitin', line: 'Turnitin checks similarity.', cognita: 'Cognita builds originality into writing.' },
  { tool: 'SPSS', line: 'SPSS analyzes data.', cognita: 'Cognita connects data to reasoning and conclusions.' },
];

export default function ComparisonQuotesSection() {
  return (
    <Box
      component="section"
      style={{
        background: 'linear-gradient(135deg, var(--mantine-color-brand-8) 0%, var(--mantine-color-brand-7) 100%)',
      }}
    >
      <Box style={{ maxWidth: 860, margin: '0 auto', padding: '6rem 1.5rem' }}>
        <Box ta="center" mb="3.5rem">
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            style={{ letterSpacing: '0.12em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}
          >
            Cognita vs Everything Else
          </Text>
          <Title
            order={2}
            c="white"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)', letterSpacing: '-0.01em' }}
          >
            Beyond Point Solutions
          </Title>
        </Box>

        <Stack gap="md">
          {quotes.map((q) => (
            <Paper
              key={q.tool}
              radius="xl"
              p="xl"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <Text size="lg" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '0.25rem' }}>
                "{q.line}"
              </Text>
              <Text
                fw={600}
                size="xl"
                c="white"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                "{q.cognita}"
              </Text>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
