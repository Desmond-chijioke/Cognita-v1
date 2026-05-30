import { Box, Button, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { LuCircleCheck } from 'react-icons/lu';

interface Props {
  institutionName: string;
  email: string;
}

export default function SignupSuccess({ institutionName, email }: Props) {
  const navigate = useNavigate();

  return (
    <Box style={{ maxWidth: 420, width: '100%', margin: '0 auto', textAlign: 'center' }}>
      <Stack align="center" gap="lg">
        <ThemeIcon size={80} radius="xl" color="green" variant="light">
          <LuCircleCheck size={40} />
        </ThemeIcon>

        <Box>
          <Title order={2} style={{ fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>
            Account Created!
          </Title>
          <Text size="sm" c="dimmed">
            <strong style={{ color: '#1c1c1e' }}>{institutionName}</strong> has been registered successfully.
          </Text>
          <Text size="sm" c="dimmed" mt={4}>
            You can now sign in with <strong style={{ color: '#1c1c1e' }}>{email}</strong>
          </Text>
        </Box>

        <Box
          style={{
            background: '#f0f4ff',
            border: '1px solid #c5d2fb',
            borderRadius: 12,
            padding: '1rem 1.5rem',
            width: '100%',
          }}
        >
          <Text size="sm" c="dimmed" ta="center">
            Your institution admin account is active. Set up your departments, invite staff, and start managing your institution.
          </Text>
        </Box>

        <Button
          color="brand"
          size="md"
          fullWidth
          onClick={() => navigate('/login')}
        >
          Go to Login
        </Button>
      </Stack>
    </Box>
  );
}
