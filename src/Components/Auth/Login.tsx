import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Anchor, Box, Button, Center, Image,
  PasswordInput, Stack, Text, TextInput, Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAppDispatch } from '../../Redux/hooks';
import { loginSuccess } from '../../Redux/slices/authSlice';
import Logo from '../../assets/cognita-logo.png';
import heroBg from '../../assets/hero-bg.jpg';
import { ROLE_HOME } from '../../Route/types';
import { showsucessnotification } from '../../helper/notificationhelper';
import { signInSupabase } from '../../supabase/auth';
import { saveSession, clearSession } from '../../helper/storage';

export function fullyear() {
  return new Date().getFullYear();
}

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email:    v => (!v ? 'Email is required' : null),
      password: v => (!v ? 'Password is required' : v.length < 8 ? 'Minimum 8 characters' : null),
    },
  });

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    form.clearErrors();

    const email    = form.values.email.trim().toLowerCase();
    const password = form.values.password;

    if (!email)              { form.setFieldError('email',    'Email is required');    return; }
    if (!password)           { form.setFieldError('password', 'Password is required'); return; }
    if (password.length < 8) { form.setFieldError('password', 'Minimum 8 characters'); return; }

    setLoading(true);

   

    try {
      const result = await signInSupabase(email, password);

      if (!result) {
        form.setFieldError('password', 'Incorrect email or password');
        return;
      }

      const { profile, accessToken, refreshToken } = result;

      // Save profile + tokens into ONE key — Supabase never writes sb-* itself
      saveSession({
        id:               profile.id,
        name:             profile.name,
        email:            profile.email,
        role:             profile.role,
        institutionId:    profile.institution_id    ?? undefined,
        institutionName:  profile.institution_name  ?? undefined,
        institutionEmail: profile.institution_email ?? undefined,
        departmentName:   profile.department_name   ?? undefined,
        supervisorId:     profile.supervisor_id     ?? undefined,
        supervisorName:   profile.supervisor_name   ?? undefined,
        supervisorEmail:  profile.supervisor_email  ?? undefined,
        accessToken,
        refreshToken,
      });

      // Sync to Redux
      dispatch(loginSuccess({
        role:             profile.role,
        email:            profile.email,
        id:               profile.id,
        name:             profile.name,
        institutionId:    profile.institution_id    ?? undefined,
        institutionName:  profile.institution_name  ?? undefined,
        institutionEmail: profile.institution_email ?? undefined,
        departmentName:   profile.department_name   ?? undefined,
        supervisorId:     profile.supervisor_id     ?? undefined,
        supervisorName:   profile.supervisor_name   ?? undefined,
        supervisorEmail:  profile.supervisor_email  ?? undefined,
      }));

      showsucessnotification({ message: `Welcome back, ${profile.name}!` });
      navigate(ROLE_HOME[profile.role] ?? '/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'PROFILE_NOT_FOUND') {
        form.setFieldError('email',
          'Account found but profile is missing — please re-register your institution to restore access.',
        );
      } else {
        form.setFieldError('password', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Left panel ── */}
      <Box visibleFrom="md" style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
        <Box style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <Box style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(30,58,138,0.88) 0%, rgba(47,74,194,0.82) 50%, rgba(12,133,153,0.78) 100%)' }} />
        <Box style={{ position: 'absolute', top: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(147,197,253,0.15)', filter: 'blur(60px)' }} />
        <Box style={{ position: 'absolute', bottom: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(196,181,253,0.18)', filter: 'blur(60px)' }} />

        <Box style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2.5rem' }}>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Image src={Logo} alt="Cognita" w={40} h={40} style={{ objectFit: 'contain' }} />
            <Text fw={700} size="xl" c="white" style={{ fontFamily: 'Playfair Display, serif' }}>Cognita</Text>
          </Box>

          <Box>
            <Text c="white" fw={800} style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontFamily: 'Playfair Display, serif', lineHeight: 1.15, marginBottom: '1rem' }}>
              The Complete Research Operating System
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, maxWidth: 380, fontSize: '1rem' }}>
              From literature review to final submission — manage your entire academic research journey in one place.
            </Text>
            <Box style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
              {['Universities', 'Research Institutes', 'Postgraduate Programs'].map(t => (
                <Box key={t} style={{ padding: '0.375rem 0.875rem', borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', fontWeight: 500 }}>
                  {t}
                </Box>
              ))}
            </Box>
          </Box>

          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
            © {fullyear()} Cognita · Academic Research Platform
          </Text>
        </Box>
      </Box>

      {/* ── Right panel: form ── */}
      <Box style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2.5rem 2rem', background: 'white', overflowY: 'auto', margin: '0 auto' }}>

        <Box hiddenFrom="md">
          <Center mb="xl">
            <Stack align="center" gap="xs">
              <Image src={Logo} alt="Cognita" w={48} h={48} style={{ objectFit: 'contain' }} />
              <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Cognita</Title>
              <Text size="sm" c="dimmed">Academic Research Platform</Text>
            </Stack>
          </Center>
        </Box>

        <Box style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
          <Stack gap={4} mb="xl">
            <Title order={2} style={{ fontFamily: 'Playfair Display, serif', letterSpacing: '-0.01em' }}>
              Welcome back
            </Title>
            <Text size="sm" c="dimmed">Sign in to continue to your workspace</Text>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Institutional email"
                placeholder="you@institution.edu"
                type="email"
                size="md"
                {...form.getInputProps('email')}
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                size="md"
                {...form.getInputProps('password')}
              />

              <Button type="submit" fullWidth size="md" radius="md" color="brand" mt={4} loading={loading}>
                Log In
              </Button>

              <Text size="sm" ta="center" c="dimmed">
                Don't have an account?{' '}
                <Anchor component={Link as any} to="/signup" size="sm" c="brand.7" fw={600}>
                  Sign up
                </Anchor>
              </Text>
              <Text size="sm" ta="center" c="dimmed">
                <Anchor component={Link as any} to="/forgot-password" size="sm" c="brand.7" fw={600}>
                  Forgot password?
                </Anchor>
              </Text>
            </Stack>
          </form>
        </Box>
      </Box>
    </Box>
  );
}
