import { supabase } from './client';

export interface DBReference {
  id:             string;
  user_id:        string;
  institution_id: string;
  title:          string;
  authors:        string[];
  year:           number | null;
  journal:        string | null;
  doi:            string | null;
  tags:           string[];
  cited:          boolean;
  created_at:     string;
}

export type NewReference = Omit<DBReference, 'id' | 'user_id' | 'institution_id' | 'created_at'>;

export async function fetchRefs(userId: string): Promise<DBReference[]> {
  const { data, error } = await supabase
    .from('student_references')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchRefs:', error.message); return []; }
  return (data ?? []) as DBReference[];
}

export async function addRef(
  userId:        string,
  institutionId: string,
  ref:           NewReference,
): Promise<DBReference | null> {
  const { data, error } = await supabase
    .from('student_references')
    .insert({ ...ref, user_id: userId, institution_id: institutionId })
    .select()
    .single();
  if (error) { console.error('addRef:', error.message); return null; }
  return data as DBReference;
}

export async function deleteRef(refId: string): Promise<void> {
  await supabase.from('student_references').delete().eq('id', refId);
}

export async function updateRef(refId: string, patch: Partial<DBReference>): Promise<void> {
  await supabase.from('student_references').update(patch).eq('id', refId);
}

// ── CrossRef DOI lookup (free, no key required) ───────────────────────────────

interface CrossRefAuthor { family?: string; given?: string }
interface CrossRefMessage {
  title?:             string[];
  author?:            CrossRefAuthor[];
  published?:         { 'date-parts': number[][] };
  'published-print'?: { 'date-parts': number[][] };
  'published-online'?:{ 'date-parts': number[][] };
  'container-title'?: string[];
  DOI?:               string;
}

export interface DOIResult {
  title:   string;
  authors: string[];
  year:    number | null;
  journal: string | null;
  doi:     string;
}

export async function lookupDOI(rawDoi: string): Promise<DOIResult> {
  const doi = rawDoi.replace(/^https?:\/\/doi\.org\//i, '').trim();
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`DOI not found (HTTP ${res.status}). Check the DOI and try again.`);

  const json = await res.json() as { message: CrossRefMessage };
  const msg  = json.message;

  const title   = msg.title?.[0] ?? 'Untitled';
  const authors = (msg.author ?? []).map(a =>
    [a.family, a.given].filter(Boolean).join(', '),
  );
  const year =
    msg.published?.['date-parts']?.[0]?.[0] ??
    msg['published-print']?.['date-parts']?.[0]?.[0] ??
    msg['published-online']?.['date-parts']?.[0]?.[0] ??
    null;
  const journal = msg['container-title']?.[0] ?? null;

  return { title, authors, year: year ?? null, journal, doi };
}

// ── BibTeX parser ─────────────────────────────────────────────────────────────
// Handles the most common field encodings: {value} and "value"

export function parseBibtex(input: string): NewReference[] {
  const results: NewReference[] = [];
  // Match each @type{key, ...} block
  const entryRegex = /@\w+\s*\{[^@]*/g;
  const entries = input.match(entryRegex) ?? [];

  for (const entry of entries) {
    const fields: Record<string, string> = {};
    // Match field = {value} or field = "value"
    const fieldRe = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/g;
    let m: RegExpExecArray | null;
    while ((m = fieldRe.exec(entry)) !== null) {
      fields[m[1].toLowerCase()] = (m[2] ?? m[3] ?? '').trim();
    }
    if (!fields.title) continue;

    const authorsRaw = fields.author ?? '';
    const authors = authorsRaw
      ? authorsRaw.split(/\s+and\s+/i).map(a => a.trim()).filter(Boolean)
      : [];
    const year = parseInt(fields.year ?? '') || null;

    results.push({
      title:   fields.title,
      authors,
      year,
      journal: fields.journal ?? fields.booktitle ?? null,
      doi:     fields.doi ?? null,
      tags:    [],
      cited:   false,
    });
  }
  return results;
}
