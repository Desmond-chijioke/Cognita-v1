import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Text, Title, Paper, Group, Stack, Badge,
  Switch, SimpleGrid, ThemeIcon, Table, Accordion,
} from '@mantine/core';
import { FiCheck, FiX, FiStar } from 'react-icons/fi';
import { MdSchool, MdOutlineAccountBalance } from 'react-icons/md';

const individualPlans = [
  {
    name: 'Cognita Basic',
    monthly: 7500,
    annual: 75000,
    tagline: 'For students exploring research tools',
    features: [
      '1 active project',
      '30 AI credits per month (10 base + 20 daily bonus)',
      'Structured academic editor',
      'Manual reference manager',
      'Basic DOCX export',
      'Descriptive statistics',
      '5MB dataset limit',
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Cognita Pro',
    monthly: 22000,
    annual: 220000,
    tagline: 'For serious researchers & postgraduate students',
    features: [
      'Unlimited projects',
      '80 AI credits per month (50 base + 30 daily bonus)',
      'Full section builder',
      'Unlimited AI reviewer mode',
      'Rewrite suggestions',
      'Regression, ANOVA, statistics tools',
      'Citation integrity checker',
      'Advanced export (DOCX, PDF, LaTeX)',
      'Collaboration (up to 3 users)',
      '100MB dataset upload',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Cognita Premium',
    monthly: 45000,
    annual: 450000,
    tagline: 'For advanced research & grant applications',
    features: [
      'Everything in Pro',
      '180 AI credits per month (150 base + 30 daily bonus)',
      'Plagiarism similarity checks (monthly credits)',
      'AI coherence scoring',
      'Grant proposal templates',
      'Journal-specific formatting',
      'Unlimited collaborators',
      'Priority AI processing',
      'Ethics & risk alerts',
    ],
    cta: 'Go Premium',
    popular: false,
  },
];

const institutionalPlans = [
  {
    name: 'Department Plan',
    price: '₦50,000',
    priceSuffix: 'per user/year',
    note: 'Minimum 25 users • Billed annually',
    features: [
      'Pro access for all users',
      '1,000 AI credits per user/year (400 base + 600 daily bonus)',
      'Institutional dashboard',
      'Integrity monitoring',
      'AI usage tracking',
      'Department analytics',
      'Compliance indicators',
    ],
    cta: 'Request Department Demo',
    icon: MdOutlineAccountBalance,
  },
  {
    name: 'University Plan',
    price: 'Custom Pricing',
    priceSuffix: 'On demand',
    note: 'Agreement with Platinum Edu-Tech Sales Team',
    features: [
      'Premium access for all users',
      'University-wide dashboard',
      'AI governance controls',
      'Research output analytics',
      'Grant tracking',
      'Custom thesis templates',
      'Audit logs & compliance tools',
      'Priority support',
    ],
    cta: 'Contact Sales',
    icon: MdSchool,
  },
];

const comparisonData = [
  { feature: 'AI Reviewer', basic: 'Limited', pro: 'Unlimited', premium: 'Advanced', institution: 'Unlimited + Governance' },
  { feature: 'Statistics', basic: 'Basic', pro: 'Full', premium: 'Full', institution: 'Full' },
  { feature: 'Plagiarism', basic: false, pro: false, premium: 'Limited', institution: 'Full' },
  { feature: 'Collaboration', basic: false, pro: 'Limited', premium: 'Unlimited', institution: 'Unlimited' },
  { feature: 'Institution Dashboard', basic: false, pro: false, premium: false, institution: true },
  { feature: 'AI Governance', basic: false, pro: false, premium: false, institution: true },
];

const faqs = [
  { q: 'Can I switch plans anytime?', a: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, the remaining balance is credited to your account.' },
  { q: 'Do students get discounts?', a: 'Students with a valid .edu email address receive an additional 15% off any paid plan. Contact our support team with your university email for verification.' },
  { q: 'Is institutional pricing customizable?', a: 'Absolutely. Institutional plans are fully customizable based on the number of users, departments, and specific compliance needs. Contact our sales team for a tailored quote.' },
  { q: 'Does Cognita replace SPSS and Turnitin?', a: 'Cognita integrates statistical analysis and plagiarism checking into one platform, reducing the need for separate tools. While it covers most common use cases, some specialized analyses may still require dedicated software.' },
  { q: 'Is data secure?', a: 'Yes. All data is encrypted at rest and in transit. We comply with GDPR and institutional data governance standards. Your research data is never used for training AI models.' },
];

function ComparisonCell({ value }: { value: string | boolean }) {
  if (value === true) return <FiCheck size={16} color="var(--mantine-color-brand-7)" style={{ margin: '0 auto', display: 'block' }} />;
  if (value === false) return <FiX size={16} color="var(--mantine-color-gray-4)" style={{ margin: '0 auto', display: 'block' }} />;
  return <Text size="sm" ta="center">{value as string}</Text>;
}

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* ── Individual Plans ── */}
      <Box component="section" id="pricing" style={{ maxWidth: 1200, margin: '0 auto', padding: '6rem 1.5rem' }}>
        <Box ta="center" mb="3rem">
          <Title order={2} style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            Simple, Transparent Pricing
          </Title>
          <Text c="dimmed" maw={560} mx="auto">
            Choose a plan that fits your research journey — from student thesis to institutional research governance.
          </Text>
        </Box>

        {/* Billing toggle */}
        <Group justify="center" gap="sm" mb="3rem">
          <Text size="sm" fw={500} c={!annual ? 'dark' : 'dimmed'}>Monthly</Text>
          <Switch checked={annual} onChange={e => setAnnual(e.currentTarget.checked)} color="brand" />
          <Text size="sm" fw={500} c={annual ? 'dark' : 'dimmed'}>Annual</Text>
          {annual && <Badge color="accent" variant="light" size="sm">Save 20%</Badge>}
        </Group>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" style={{ alignItems: 'start' }}>
          {individualPlans.map((plan) => {
            const price = annual ? plan.annual : plan.monthly;
            const period = annual ? '/year' : '/mo';
            return (
              <Paper
                key={plan.name}
                withBorder
                radius="xl"
                p="xl"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  border: plan.popular ? '2px solid var(--mantine-color-brand-5)' : undefined,
                  boxShadow: plan.popular ? '0 8px 32px rgba(59,91,219,0.15)' : undefined,
                  transform: plan.popular ? 'scale(1.03)' : undefined,
                  zIndex: plan.popular ? 1 : undefined,
                }}
              >
                {plan.popular && (
                  <Badge
                    color="brand"
                    style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <FiStar size={11} /> Most Popular
                  </Badge>
                )}
                <Text fw={700} size="xl" style={{ fontFamily: 'Playfair Display, serif' }} mb={4}>{plan.name}</Text>
                <Text size="sm" c="dimmed" mb="lg">{plan.tagline}</Text>
                <Group align="baseline" gap={4} mb="lg">
                  <Text fw={800} style={{ fontSize: '2.25rem', letterSpacing: '-0.02em' }}>₦{price.toLocaleString()}</Text>
                  {price > 0 && <Text size="sm" c="dimmed">{period}</Text>}
                </Group>
                <Stack gap="xs" mb="xl" style={{ flex: 1 }}>
                  {plan.features.map(f => (
                    <Group key={f} gap="xs" align="flex-start" wrap="nowrap">
                      <FiCheck size={15} color="var(--mantine-color-brand-7)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <Text size="sm">{f}</Text>
                    </Group>
                  ))}
                </Stack>
                <Button
                  fullWidth
                  variant={plan.popular ? 'filled' : 'outline'}
                  color="brand"
                  radius="md"
                  onClick={() => navigate('/signup')}
                >
                  {plan.cta}
                </Button>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Box>

      {/* ── Institutional Plans ── */}
      <Box
        component="section"
        style={{ background: 'var(--mantine-color-gray-0)', borderTop: '1px solid var(--mantine-color-gray-2)' }}
      >
        <Box style={{ maxWidth: 1000, margin: '0 auto', padding: '6rem 1.5rem' }}>
          <Box ta="center" mb="3rem">
            <Badge
              color="accent"
              variant="light"
              size="lg"
              mb="md"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <MdOutlineAccountBalance size={14} /> Institutional
            </Badge>
            <Title order={2} style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', letterSpacing: '-0.01em', marginBottom: '0.75rem' }}>
              For Universities & Research Institutions
            </Title>
            <Text c="dimmed" maw={480} mx="auto">
              Govern, monitor, and elevate research output across your institution.
            </Text>
          </Box>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" style={{ maxWidth: 720, margin: '0 auto' }}>
            {institutionalPlans.map(plan => (
              <Paper key={plan.name} withBorder radius="xl" p="xl" style={{ display: 'flex', flexDirection: 'column' }}>
                <ThemeIcon size={44} radius="lg" variant="light" color="accent" mb="md">
                  <plan.icon size={20} />
                </ThemeIcon>
                <Text fw={700} size="xl" style={{ fontFamily: 'Playfair Display, serif' }} mb={4}>{plan.name}</Text>
                <Group align="baseline" gap={4} mb={4}>
                  <Text fw={700} size="xl">{plan.price}</Text>
                  {plan.priceSuffix && <Text size="sm" c="dimmed">{plan.priceSuffix}</Text>}
                </Group>
                {plan.note && <Text size="xs" c="dimmed" mb="lg">{plan.note}</Text>}
                <Stack gap="xs" mb="xl" style={{ flex: 1 }}>
                  {plan.features.map(f => (
                    <Group key={f} gap="xs" align="flex-start" wrap="nowrap">
                      <FiCheck size={15} color="var(--mantine-color-brand-7)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <Text size="sm">{f}</Text>
                    </Group>
                  ))}
                </Stack>
                <Button variant="outline" color="brand" radius="md" fullWidth>{plan.cta}</Button>
              </Paper>
            ))}
          </SimpleGrid>
        </Box>
      </Box>

      {/* ── Comparison Table ── */}
      <Box style={{ maxWidth: 1000, margin: '0 auto', padding: '6rem 1.5rem' }}>
        <Title order={2} ta="center" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '2.5rem' }}>
          Compare Plans
        </Title>
        <Paper withBorder radius="xl" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover>
            <Table.Thead style={{ background: 'var(--mantine-color-gray-0)' }}>
              <Table.Tr>
                <Table.Th>Feature</Table.Th>
                <Table.Th ta="center">Basic</Table.Th>
                <Table.Th ta="center">Pro</Table.Th>
                <Table.Th ta="center">Premium</Table.Th>
                <Table.Th ta="center">Institution</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {comparisonData.map(row => (
                <Table.Tr key={row.feature}>
                  <Table.Td fw={500}>{row.feature}</Table.Td>
                  <Table.Td><ComparisonCell value={row.basic} /></Table.Td>
                  <Table.Td><ComparisonCell value={row.pro} /></Table.Td>
                  <Table.Td><ComparisonCell value={row.premium} /></Table.Td>
                  <Table.Td><ComparisonCell value={row.institution} /></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </Box>

      {/* ── FAQ ── */}
      <Box style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem 6rem' }}>
        <Title order={2} ta="center" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '2.5rem' }}>
          Frequently Asked Questions
        </Title>
        <Accordion variant="separated" radius="lg">
          {faqs.map((faq, i) => (
            <Accordion.Item key={i} value={`faq-${i}`}>
              <Accordion.Control fw={500}>{faq.q}</Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.7 }}>{faq.a}</Text>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Box>
    </>
  );
}
