import { useState } from 'react';
import { Box, Center, Image, Stack, Text, Title } from '@mantine/core';
import Logo from '../../assets/cognita-logo.png';
import AuthHeroPanel from './AuthHeroPanel';
import SchoolSignupForm from './SchoolSignupForm';
// import OtpVerification from './OtpVerification'; // disabled — email confirmation off
import SignupSuccess from './SignupSuccess';
import type { InstitutionFormValues, SignupStep } from './signup.types';

const HERO_FEATURES = [
  { text: 'Centralised student & staff management' },
  { text: 'AI-powered academic insights' },
  { text: 'Real-time performance dashboards' },
  { text: 'Secure, role-based access control' },
  { text: 'Integrated communication tools' },
];

export default function Signup() {
  const [step,       setStep]       = useState<SignupStep>('form');
  const [formValues, setFormValues] = useState<InstitutionFormValues | null>(null);

  // OTP step skipped — go straight to success after account creation
  const handleFormNext = (values: InstitutionFormValues) => {
    setFormValues(values);
    setStep('success');
  };

  // const handleOtpSuccess = () => {
  //   setStep('success');
  // };

  return (
    <Box style={{ display: 'flex', minHeight: '100vh' }}>
      <AuthHeroPanel
        headline="Empower Your Institution with Cognita"
        subheadline="Join hundreds of institutions worldwide,managing academics, staff, and students on one intelligent platform."
        features={HERO_FEATURES}
        tagline={`© ${new Date().getFullYear()} Cognita · School Management Platform`}
      />

      <Box
        style={{
          width: '100%',
          maxWidth: 580,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '2.5rem 2rem',
          background: 'white',
          overflowY: 'auto',
          margin: '0 auto',
        }}
      >
        {/* Mobile logo */}
        <Box hiddenFrom="md">
          <Center mb="xl">
            <Stack align="center" gap="xs">
              <Image src={Logo} alt="Cognita" w={48} h={48} style={{ objectFit: 'contain' }} />
              <Title order={2} style={{ fontFamily: 'Playfair Display, serif' }}>Cognita</Title>
              <Text size="sm" c="dimmed">Institutional Management Platform</Text>
            </Stack>
          </Center>
        </Box>

        {step === 'form' && (
          <SchoolSignupForm onNext={handleFormNext} />
        )}

        {/* OTP verification step disabled — email confirmation turned off in Supabase
        {step === 'otp' && (
          <OtpVerification
            email={formValues?.institutionEmail ?? ''}
            institutionName={formValues?.institutionName ?? 'Your school'}
            onSuccess={() => setStep('success')}
            onBack={() => setStep('form')}
          />
        )} */}

        {step === 'success' && (
          <SignupSuccess
            institutionName={formValues?.institutionName ?? 'Your school'}
            email={formValues?.institutionEmail ?? ''}
          />
        )}
      </Box>
    </Box>
  );
}
