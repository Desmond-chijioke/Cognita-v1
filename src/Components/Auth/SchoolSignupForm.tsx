import { useState } from 'react';
import {
  Anchor, Box, Button, Loader, PasswordInput,
  Select, Stack, Text, TextInput, Title,
} from '@mantine/core';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import type { InstitutionFormValues } from './signup.types';
import { INSTITUTION_TYPES } from './signup.types';
import { showsucessnotification, showerrornotification } from '../../helper/notificationhelper';
import { signUpInstitution } from '../../supabase/auth';

interface Props {
  onNext: (values: InstitutionFormValues) => void;
}

export default function SchoolSignupForm({ onNext }: Props) {
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  
  const [institutionEmail, setInstitutionEmail] = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [phone,            setPhone]            = useState('');
  const [institutionName,  setInstitutionName]  = useState('');
  const [institutionType,  setInstitutionType]  = useState('');

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
     
      if (institutionName.trim().length < 2)        errs.institutionName  = 'Institution name is required';
    if (!institutionType)                         errs.institutionType  = 'Please select an institution type';
    if (!/^\S+@\S+\.\S+$/.test(institutionEmail)) errs.institutionEmail = 'Enter a valid institutional email';
    if (phone.trim().length < 7)                  errs.phone            = 'Enter a valid phone number';
    if (password.length < 8)                      errs.password         = 'Password must be at least 8 characters';
    if (password !== confirmPassword)             errs.confirmPassword  = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showerrornotification({ message: 'Please fix the errors in the form before proceeding.' });
      return;
    }

    setLoading(true);
    try {
      await signUpInstitution({
       
        adminPassword:    password,
        institutionName:  institutionName.trim(),
        institutionEmail: institutionEmail.trim().toLowerCase(),
        institutionType,
        phone:            phone.trim(),
      });

      setLoading(false);
      showsucessnotification({ message: 'Institution account created! Redirecting…' });
      onNext(
        { institutionEmail, password, confirmPassword, phone, institutionName, institutionType },
      );
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      showerrornotification({ message: msg });
    }
  };

  return (
    <Box style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
      <Stack gap={2} mb="xl">
        <Title order={2} style={{ fontFamily: 'Playfair Display, serif', letterSpacing: '-0.01em' }}>
          Register your Institution
        </Title>
        <Text size="sm" c="dimmed">
          Create your institution's admin account in one simple step.
        </Text>
      </Stack>

      <Stack gap="md">

        <TextInput
          label="Institution Name"
          placeholder="e.g. University of Lagos"
          size="md"
          required
          value={institutionName}
          onChange={e => setInstitutionName(e.target.value)}
          error={errors.institutionName}
        />

        <Select
          label="Institution Type"
          placeholder="Select type"
          size="md"
          required
          data={INSTITUTION_TYPES}
          value={institutionType}
          onChange={v => setInstitutionType(v ?? '')}
          error={errors.institutionType}
        />

        <TextInput
          label="Institutional Email"
          placeholder="admin@yourinstitution.edu"
          type="email"
          required
          size="md"
          value={institutionEmail}
          onChange={e => setInstitutionEmail(e.target.value)}
          error={errors.institutionEmail}
        />

        <TextInput
          label="Phone Number"
          placeholder="+234 800 000 0000"
          type="tel"
          size="md"
          required
          value={phone}
          onChange={e => setPhone(e.target.value)}
          error={errors.phone}
        />

        <PasswordInput
          label="Password"
          placeholder="Min. 8 characters"
          size="md"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          error={errors.password}
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="Repeat password"
          size="md"
          required
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />

        <Button
          color="brand"
          size="md"
          fullWidth
          rightSection={loading ? <Loader size={14} color="white" /> : <FaArrowRight size={13} />}
          onClick={handleSubmit}
          loading={loading}
          mt="xs"
        >
          Create Account
        </Button>

        <Text size="sm" c="dimmed" ta="center">
          Already have an account?{' '}
          <Anchor component={Link as any} to="/login" size="sm" c="brand.7" fw={600}>
            Sign in
          </Anchor>
        </Text>
      </Stack>
    </Box>
  );
}
