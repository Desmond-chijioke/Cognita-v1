export interface InstitutionFormValues {
  institutionEmail: string;
  password:         string;
  confirmPassword:  string;
  phone:            string;
  institutionName:  string;
  institutionType:  string;
}

export type SignupStep = 'form' | 'otp' | 'success';

export const INSTITUTION_TYPES = [
  { value: 'University',           label: 'University' },
  { value: 'Polytechnic',          label: 'Polytechnic' },
  { value: 'College of Education', label: 'College of Education' },
  { value: 'Monotechnic',          label: 'Monotechnic' },
  { value: 'Secondary School',     label: 'Secondary School' },
  { value: 'Primary School',       label: 'Primary School' },
  { value: 'International School', label: 'International School' },
  { value: 'Research Institute',   label: 'Research Institute' },
  { value: 'Other',                label: 'Other' },
];
