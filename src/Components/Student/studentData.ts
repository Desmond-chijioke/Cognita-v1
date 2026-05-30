// ── Types ──────────────────────────────────────────────────────────────────────

export type SectionStatus    = 'completed' | 'in-progress' | 'needs-revision' | 'not-started';
export type RefStatus        = 'valid' | 'missing-doi';
export type IssueSeverity    = 'critical' | 'major' | 'minor' | 'suggestion';
export type CollaboratorRole = 'owner' | 'editor' | 'reviewer' | 'viewer';
export type ExportFormat     = 'docx' | 'pdf' | 'latex';
export type CitationStyle    = 'apa' | 'ieee' | 'chicago';

export interface Section {
  id:                 string;
  key:                string;
  title:              string;
  content:            string;
  wordCount:          number;
  order:              number;
  parentKey?:         string;
  mandatory:          boolean;
  enabled:            boolean;
  approved:           boolean;
  supervisorComment?: string;
  status:             SectionStatus;
}

export interface Reference {
  id:      string;
  title:   string;
  authors: string[];
  year:    number;
  journal: string;
  doi:     string;
  cited:   boolean;
  status:  RefStatus;
  tags:    string[];
}

export interface ReviewScore {
  category: string;
  score:    number;
  maxScore: number;
}

export interface ReviewIssue {
  id:           string;
  sectionId:    string;
  sectionTitle: string;
  severity:     IssueSeverity;
  message:      string;
  suggestion?:  string;
}

export interface Collaborator {
  id:         string;
  name:       string;
  email:      string;
  role:       CollaboratorRole;
  lastActive: string;
  color:      string;
}

export interface ActivityItem {
  id:        string;
  user:      string;
  action:    string;
  target:    string;
  timestamp: string;
}

export interface ChecklistItem {
  id:      string;
  label:   string;
  checked: boolean;
}

export interface DataFile {
  id:          string;
  name:        string;
  type:        string;
  size:        string;
  uploadedAt:  string;
  description: string;
}

export interface AnalysisAssumption {
  label: string;
  met:   boolean;
  note?: string;
}

export interface AnalysisResult {
  id:              string;
  title:           string;
  testType:        string;
  status:          'completed' | 'pending';
  summary:         string;
  pValue?:         number;
  statistic?:      string;
  statValue?:      number;
  effectSize?:     string;
  effectValue?:    number;
  ci?:             string;
  interpretation?: string;
  plainLanguage?:  string;
  draftText?:      string;
  assumptions?:    AnalysisAssumption[];
  createdAt:       string;
}

export interface ExportRecord {
  id:            string;
  format:        ExportFormat;
  citationStyle: CitationStyle;
  fileName:      string;
  createdAt:     string;
}

export interface Message {
  id:         string;
  from:       'student' | 'supervisor';
  authorName: string;
  text:       string;
  time:       string;
}

export interface CommentReply {
  id:        string;
  user:      string;
  text:      string;
  timestamp: string;
}

export interface DiscussionThread {
  id:        string;
  user:      string;
  section:   string;
  text:      string;
  timestamp: string;
  replies:   CommentReply[];
}

export interface SimilaritySection {
  id:         string;
  section:    string;
  similarity: number;
  aiScore:    number;
  sources?:   { url: string; match: number; title: string }[];
}

// ── Student Profile ─────────────────────────────────────────────────────────────

export const STUDENT_PROFILE = {
  name:            'Amara Osei',
  email:           'a.osei@university.ac.ng',
  matricNo:        'PHD/CS/2021/001',
  department:      'Computer Science',
  institution:     'University of Lagos',
  degreeLevel:     'PhD',
  supervisor:      'Dr. Adebayo Ogundimu',
  supervisorEmail: 'a.ogundimu@university.ac.ng',
  supervisorDept:  'Computer Science',
  supervisorTitle: 'Senior Lecturer & Research Supervisor',
};

// ── Project ─────────────────────────────────────────────────────────────────────

export const PROJECT = {
  title:           'FedCliniq: Privacy-Preserving Federated Learning for Clinical Prediction in African Hospitals',
  shortTitle:      'FedCliniq',
  discipline:      'Computer Science — Machine Learning',
  targetOutput:    'PhD Thesis',
  targetJournal:   'Journal of Biomedical Informatics',
  projectType:     'PhD',
  status:          'In Progress',
  createdAt:       'Jan 2024',
  deadline:        '2026-11-15',
  wordCount:       4282,
  targetWordCount: 80000,
  progress:        34,
  integrityScore:  88,
  similarityIndex: 7,
  aiDetectionScore: 15,
};

// ── Sections ────────────────────────────────────────────────────────────────────

export const STUDENT_SECTIONS: Section[] = [
  {
    id: 's1', key: 'abstract', title: 'Abstract', order: 1,
    mandatory: true, enabled: true, approved: true,
    status: 'completed', wordCount: 312,
    supervisorComment: 'Well structured abstract. Please tighten the contribution list to three bullet points in the final version.',
    content: `This thesis investigates the application of federated learning paradigms to clinical prediction tasks in resource-constrained healthcare environments across sub-Saharan Africa. Existing machine learning solutions for clinical decision support rely on centralised data repositories that are incompatible with patient privacy regulations and institutional data-sharing constraints prevalent across the region.

We propose FedCliniq, a privacy-preserving federated learning framework designed to enable collaborative model training across geographically distributed hospitals without transmitting raw patient data. The framework integrates differential privacy noise injection, secure aggregation protocols, and an adaptive communication scheduler that reduces bandwidth consumption by up to 62% compared to baseline FedAvg implementations.

Experimental evaluation across three hospitals in Lagos, Accra, and Nairobi demonstrates that FedCliniq achieves a diagnostic accuracy of 91.3% for sepsis prediction, within 2.1 percentage points of a centralised baseline trained on pooled data. The framework introduces a novel heterogeneous aggregation strategy that accommodates significant differences in local dataset size, class distribution, and data quality — challenges specific to African healthcare contexts.

This work contributes (i) a domain-adapted federated architecture for clinical NLP and tabular data, (ii) a benchmark dataset of de-identified patient records from three participating institutions, and (iii) a reproducible experimental pipeline released as open-source software.`,
  },
  {
    id: 's2', key: 'chapter1', title: 'Chapter 1: Introduction', order: 2,
    mandatory: true, enabled: true, approved: false,
    status: 'completed', wordCount: 1840,
    content: `1.1 Background and Motivation

Artificial intelligence and machine learning have transformed clinical decision support across high-income healthcare settings, enabling early detection of conditions ranging from sepsis to diabetic retinopathy with accuracy exceeding that of specialist clinicians. However, the deployment of such systems in sub-Saharan Africa remains disproportionately limited — not primarily due to algorithmic deficiencies, but due to structural barriers surrounding clinical data access, privacy governance, and institutional interoperability.

Hospitals across Lagos, Accra, Nairobi, and Johannesburg generate millions of patient records annually, yet these datasets remain siloed within individual institutions. Data-sharing agreements across hospitals are rare, and where they exist, they are constrained by national health data regulations, patient consent frameworks, and the technical overhead of securely transferring sensitive records. The consequence is that model developers are unable to assemble the large, diverse datasets required to train robust clinical predictors for the African patient population.

1.2 Problem Statement

The central problem addressed by this thesis is the tension between two imperatives that are individually well-established but mutually conflicting in practice: (i) the need for large, diverse training datasets to build generalisable clinical machine learning models, and (ii) the legal and ethical obligation to protect patient data privacy and prevent institutional data sovereignty violations.

Centralised learning — wherein all training data is aggregated into a single repository before model training — resolves the data diversity problem but violates privacy obligations. Conversely, purely local model training protects privacy but produces models that overfit to local data distributions and fail to generalise across patient populations.

1.3 Research Objectives

This thesis pursues four primary objectives:

1. To design and implement a federated learning framework adapted to the clinical and infrastructural constraints of African hospitals, with explicit support for heterogeneous data distributions, intermittent connectivity, and differential privacy guarantees.

2. To develop a novel aggregation strategy — Heterogeneous Federated Aggregation (HFA) — that accounts for unequal dataset sizes, class imbalances, and data quality disparities across participating institutions.

3. To evaluate the proposed framework against centralised and baseline federated baselines across three real-world hospital datasets, measuring diagnostic accuracy, communication overhead, and privacy leakage.

4. To release the framework, benchmark datasets, and experimental code as open-source resources to facilitate reproducibility and adoption by the African AI research community.

1.4 Significance of the Study

This work advances the state of the art in three respects. First, it addresses a gap in the federated learning literature: existing frameworks (FedAvg, FedProx, SCAFFOLD) have been designed and benchmarked primarily on datasets from North American and European healthcare systems, and perform poorly under the non-IID conditions characteristic of African hospital data. Second, the proposed differential privacy integration is calibrated to the sensitivity of clinical tabular data. Third, the multi-institutional benchmark dataset introduced by this work represents the first publicly available federated clinical dataset from sub-Saharan Africa.`,
  },
  {
    id: 's3', key: 'chapter2', title: 'Chapter 2: Literature Review', order: 3,
    mandatory: true, enabled: true, approved: false,
    status: 'in-progress', wordCount: 1240,
    supervisorComment: 'Good coverage. You need to discuss DP-FL for tabular data specifically — the imaging literature dominates your review but your work is on tabular clinical records.',
    content: `2.1 Federated Learning: Foundations and Evolution

Federated learning was formally introduced by McMahan et al. (2017) as a communication-efficient approach to training deep neural networks across distributed mobile devices without centralising user data. The canonical FedAvg algorithm proceeds by selecting a random subset of clients at each global round, broadcasting the current global model weights to selected clients, allowing each client to perform several steps of local stochastic gradient descent on their private data, and aggregating the resulting local model updates via weighted averaging.

Subsequent work has extended this foundation in several directions. Li et al. (2020) introduced FedProx, which adds a proximal term to the local objective to limit the divergence between local and global models — a critical correction for heterogeneous (non-IID) data distributions. Karimireddy et al. (2020) proposed SCAFFOLD, which addresses client drift through variance reduction via control variates. Both methods demonstrate improved convergence under data heterogeneity, though at the cost of increased communication and memory overhead.

2.2 Privacy-Preserving Federated Learning

While federated learning avoids raw data transmission, it does not provide formal privacy guarantees: gradient updates can leak sensitive information about training examples through gradient inversion attacks (Geiping et al., 2020) and membership inference attacks (Shokri et al., 2017). Two primary countermeasures have emerged:

Differential privacy (DP) adds calibrated Gaussian or Laplacian noise to gradient updates, providing a formal (ε, δ)-DP guarantee. Abadi et al. (2016) proposed the DP-SGD algorithm, which clips per-sample gradients before noise addition to bound sensitivity. The privacy-utility tradeoff is governed by the noise multiplier σ: higher σ provides stronger privacy at the cost of model accuracy.

Secure aggregation protocols (Bonawitz et al., 2017) use cryptographic masking to ensure that the server learns only the aggregate of client updates, not individual client contributions. This provides protection against a semi-honest server without the accuracy cost of DP, but introduces significant communication and computation overhead.

2.3 Clinical Applications of Federated Learning

Several recent works have applied federated learning to clinical prediction tasks. Rieke et al. (2020) provide a comprehensive survey of federated learning in medical imaging, demonstrating competitive performance with centralised baselines on brain tumour segmentation and COVID-19 chest X-ray classification. Dayan et al. (2021) report a federated model for COVID-19 prognosis trained across 20 hospitals in five countries, achieving a mean AUC of 0.82 — within 3% of a centralised model trained on pooled data.

Tabular clinical data presents distinct challenges not addressed by the imaging literature. Missing values, heterogeneous feature distributions, and class imbalance require specialised preprocessing and modelling strategies. Silva et al. (2022) address missing data in federated clinical tabular learning through locally-trained imputation models, though their approach requires homogeneous feature spaces across clients — an assumption that does not hold in our multi-institutional African context.`,
  },
  {
    id: 's4', key: 'chapter3', title: 'Chapter 3: Methodology', order: 4,
    mandatory: true, enabled: true, approved: false,
    status: 'in-progress', wordCount: 890,
    content: `3.1 Research Design

This thesis adopts a design science research (DSR) methodology (Hevner et al., 2004), which frames the research as the iterative design, implementation, and evaluation of an artefact — in this case, the FedCliniq framework — intended to solve a real-world problem in a defined application domain. The DSR approach is appropriate because the primary contribution of this work is not a theoretical proposition but a working technical system, and its evaluation is conducted through both technical benchmarking and contextual assessment.

The framework development proceeds in three phases: (i) requirements elicitation through structured interviews with clinical informatics staff at the three participating hospitals; (ii) iterative prototyping and internal evaluation against synthetic federated datasets; and (iii) final evaluation against real de-identified patient data under a data-sharing agreement approved by all three institutional ethics boards.

3.2 Dataset Description

The primary evaluation dataset comprises de-identified patient records from three hospitals: Lagos University Teaching Hospital (LUTH, n = 4,820), Korle-Bu Teaching Hospital, Accra (KBTH, n = 3,140), and Kenyatta National Hospital, Nairobi (KNH, n = 2,670). Each dataset contains 47 clinical features (vital signs, laboratory values, comorbidities) and a binary sepsis label (Sepsis-3 criteria, Singer et al., 2016).

The three datasets exhibit significant distribution shift: mean patient age at LUTH (38.2 years) differs substantially from KNH (44.7 years); class prevalence (sepsis positive) ranges from 11.3% at KBTH to 18.7% at LUTH. Missing data rates range from 8.2% (KNH) to 23.4% (LUTH), reflecting differences in data entry practices and available equipment.

3.3 FedCliniq Architecture

FedCliniq consists of four components: a central aggregation server, hospital-side client agents, a differential privacy module, and an adaptive communication scheduler. The aggregation server coordinates training rounds and performs Heterogeneous Federated Aggregation (HFA). Each client agent runs local training, applies DP noise, and communicates compressed gradient updates to the server.`,
  },
  {
    id: 's5', key: 'chapter4', title: 'Chapter 4: Results & Analysis', order: 5,
    mandatory: true, enabled: true, approved: false,
    status: 'not-started', wordCount: 0, content: '',
  },
  {
    id: 's6', key: 'chapter5', title: 'Chapter 5: Discussion', order: 6,
    mandatory: true, enabled: true, approved: false,
    status: 'not-started', wordCount: 0, content: '',
  },
  {
    id: 's7', key: 'chapter6', title: 'Chapter 6: Conclusion', order: 7,
    mandatory: true, enabled: true, approved: false,
    status: 'not-started', wordCount: 0, content: '',
  },
  {
    id: 's8', key: 'bibliography', title: 'Bibliography', order: 8,
    mandatory: true, enabled: true, approved: false,
    status: 'not-started', wordCount: 0, content: '',
  },
  {
    id: 's9', key: 'appendix', title: 'Appendix', order: 9,
    mandatory: false, enabled: true, approved: false,
    status: 'not-started', wordCount: 0, content: '',
  },
];

// ── References ─────────────────────────────────────────────────────────────────

export const STUDENT_REFERENCES: Reference[] = [
  {
    id: 'r1',
    title: 'Communication-Efficient Learning of Deep Networks from Decentralized Data',
    authors: ['McMahan, B.', 'Moore, E.', 'Ramage, D.', 'Hampson, S.', "y Arcas, B. A."],
    year: 2017, journal: 'AISTATS', doi: '10.48550/arXiv.1602.05629',
    cited: true, status: 'valid', tags: ['federated learning', 'FedAvg'],
  },
  {
    id: 'r2',
    title: 'Federated Optimization in Heterogeneous Networks',
    authors: ['Li, T.', 'Sahu, A. K.', 'Zaheer, M.', 'Sanjabi, M.', 'Talwalkar, A.', 'Smith, V.'],
    year: 2020, journal: 'Proceedings of Machine Learning and Systems',
    doi: '10.48550/arXiv.1812.06127',
    cited: true, status: 'valid', tags: ['FedProx', 'non-IID'],
  },
  {
    id: 'r3',
    title: 'SCAFFOLD: Stochastic Controlled Averaging for Federated Learning',
    authors: ['Karimireddy, S. P.', 'Kale, S.', 'Mohri, M.', 'Reddi, S.', 'Stich, S.', 'Suresh, A. T.'],
    year: 2020, journal: 'ICML', doi: '10.48550/arXiv.1910.06378',
    cited: true, status: 'valid', tags: ['variance reduction', 'client drift'],
  },
  {
    id: 'r4',
    title: 'Deep Learning with Differential Privacy',
    authors: ['Abadi, M.', 'Chu, A.', 'Goodfellow, I.', 'McMahan, H. B.'],
    year: 2016, journal: 'CCS 2016', doi: '10.1145/2976749.2978318',
    cited: true, status: 'valid', tags: ['differential privacy', 'DP-SGD'],
  },
  {
    id: 'r5',
    title: 'Practical Secure Aggregation for Privacy-Preserving Machine Learning',
    authors: ['Bonawitz, K.', 'Ivanov, V.', 'Kreuter, B.'],
    year: 2017, journal: 'CCS 2017', doi: '10.1145/3133956.3133982',
    cited: true, status: 'valid', tags: ['secure aggregation'],
  },
  {
    id: 'r6',
    title: 'Federated Learning in Medicine: Facilitating Multi-Institutional Collaborations Without Sharing Patient Data',
    authors: ['Rieke, N.', 'Hancox, J.', 'Li, W.'],
    year: 2020, journal: 'Scientific Data', doi: '10.1038/s41597-020-00745-2',
    cited: true, status: 'valid', tags: ['medical imaging', 'clinical AI'],
  },
  {
    id: 'r7',
    title: 'Federated Learning for Predicting Clinical Outcomes in Patients Hospitalised with COVID-19',
    authors: ['Dayan, I.', 'Roth, H. R.', 'Zhong, A.'],
    year: 2021, journal: 'Nature Medicine', doi: '10.1038/s41591-021-01506-3',
    cited: true, status: 'valid', tags: ['COVID-19', 'clinical prediction'],
  },
  {
    id: 'r8',
    title: 'Inverting Gradients — How Easy Is It to Break Privacy in Federated Learning?',
    authors: ['Geiping, J.', 'Bauermeister, H.', 'Dröge, H.', 'Moeller, M.'],
    year: 2020, journal: 'NeurIPS 2020', doi: '10.48550/arXiv.2003.14053',
    cited: true, status: 'valid', tags: ['gradient inversion', 'privacy attack'],
  },
  {
    id: 'r9',
    title: 'Membership Inference Attacks Against Machine Learning Models',
    authors: ['Shokri, R.', 'Stronati, M.', 'Song, C.', 'Shmatikov, V.'],
    year: 2017, journal: 'IEEE S&P 2017', doi: '10.1109/SP.2017.41',
    cited: false, status: 'valid', tags: ['membership inference', 'privacy'],
  },
  {
    id: 'r10',
    title: 'The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)',
    authors: ['Singer, M.', 'Deutschman, C. S.', 'Seymour, C. W.'],
    year: 2016, journal: 'JAMA', doi: '10.1001/jama.2016.0287',
    cited: true, status: 'valid', tags: ['sepsis', 'clinical criteria'],
  },
  {
    id: 'r11',
    title: 'Design Science in Information Systems Research',
    authors: ['Hevner, A. R.', 'March, S. T.', 'Park, J.', 'Ram, S.'],
    year: 2004, journal: 'MIS Quarterly', doi: '10.2307/25148625',
    cited: false, status: 'valid', tags: ['design science', 'methodology'],
  },
  {
    id: 'r12',
    title: 'Missing Data Imputation in Federated Learning for Clinical Tabular Data',
    authors: ['Silva, S.', 'Gutman, B.', 'Romero, E.'],
    year: 2022, journal: 'Journal of Biomedical Informatics', doi: '',
    cited: true, status: 'missing-doi', tags: ['missing data', 'tabular'],
  },
];

// ── Review Scores ───────────────────────────────────────────────────────────────

export const REVIEW_SCORES: ReviewScore[] = [
  { category: 'Clarity & Writing',   score: 8,  maxScore: 10 },
  { category: 'Literature Review',    score: 7,  maxScore: 10 },
  { category: 'Methodology',          score: 8,  maxScore: 10 },
  { category: 'Results & Analysis',   score: 4,  maxScore: 10 },
  { category: 'Statistical Rigour',   score: 5,  maxScore: 10 },
  { category: 'Discussion & Impact',  score: 3,  maxScore: 10 },
];

// ── Review Issues ──────────────────────────────────────────────────────────────

export const REVIEW_ISSUES: ReviewIssue[] = [
  {
    id: 'i1', sectionId: 's5', sectionTitle: 'Chapter 4: Results & Analysis',
    severity: 'critical',
    message: 'Chapter 4 is empty. Results and analysis are required before submission.',
    suggestion: 'Transfer your analysis outputs from the Analysis Studio into this section.',
  },
  {
    id: 'i2', sectionId: 's3', sectionTitle: 'Chapter 2: Literature Review',
    severity: 'major',
    message: 'Literature review does not address differential privacy applied to tabular clinical data. Current coverage focuses on imaging tasks.',
    suggestion: 'Add a section covering DP-FL for tabular data, citing Lyu et al. (2022) and Hu et al. (2021).',
  },
  {
    id: 'i3', sectionId: 's4', sectionTitle: 'Chapter 3: Methodology',
    severity: 'major',
    message: 'The adaptive communication scheduler is mentioned in the abstract but not described in the methodology chapter.',
    suggestion: 'Add subsection 3.4 describing the scheduler algorithm, hyperparameters, and interaction with the aggregation server.',
  },
  {
    id: 'i4', sectionId: 's3', sectionTitle: 'Chapter 2: Literature Review',
    severity: 'minor',
    message: 'References r9 and r11 appear in text but are not cited in the reference list.',
    suggestion: 'Ensure all cited works appear in the bibliography and all bibliography entries are cited at least once.',
  },
  {
    id: 'i5', sectionId: 's2', sectionTitle: 'Chapter 1: Introduction',
    severity: 'suggestion',
    message: 'Consider adding a thesis roadmap paragraph at the end of the introduction.',
    suggestion: 'Add a paragraph beginning: "The remainder of this thesis is structured as follows..."',
  },
];

// ── Collaborators ──────────────────────────────────────────────────────────────

export const COLLABORATORS: Collaborator[] = [
  { id: 'c1', name: 'Amara Osei',           email: 'a.osei@university.ac.ng',      role: 'owner',    lastActive: 'Just now',    color: 'blue'   },
  { id: 'c2', name: 'Dr. Adebayo Ogundimu', email: 'a.ogundimu@university.ac.ng',  role: 'reviewer', lastActive: '2 hours ago', color: 'indigo' },
  { id: 'c3', name: 'Kofi Mensah',          email: 'k.mensah@university.ac.ng',    role: 'editor',   lastActive: 'Yesterday',   color: 'teal'   },
  { id: 'c4', name: 'Fatima Al-Rashid',     email: 'f.alrashid@university.ac.ng',  role: 'viewer',   lastActive: '3 days ago',  color: 'violet' },
];

// ── Activities ─────────────────────────────────────────────────────────────────

export const ACTIVITIES: ActivityItem[] = [
  { id: 'a1', user: 'Amara',        action: 'updated',          target: 'Chapter 3: Methodology',       timestamp: '5 min ago'  },
  { id: 'a2', user: 'Dr. Ogundimu', action: 'commented on',     target: 'Chapter 2: Literature Review', timestamp: '2 hrs ago'  },
  { id: 'a3', user: 'Amara',        action: 'ran analysis',     target: 'Federated Accuracy (t-test)',   timestamp: '3 hrs ago'  },
  { id: 'a4', user: 'Kofi',         action: 'edited',           target: 'Chapter 1: Introduction',      timestamp: 'Yesterday'  },
  { id: 'a5', user: 'Dr. Ogundimu', action: 'approved',         target: 'Abstract',                     timestamp: '2 days ago' },
  { id: 'a6', user: 'Amara',        action: 'uploaded',         target: 'LUTH_patient_data.csv',         timestamp: '3 days ago' },
  { id: 'a7', user: 'Fatima',       action: 'viewed',           target: 'Chapter 1: Introduction',      timestamp: '4 days ago' },
  { id: 'a8', user: 'Amara',        action: 'ran integrity scan', target: 'Full document',              timestamp: '5 days ago' },
];

// ── Checklist ──────────────────────────────────────────────────────────────────

export const CHECKLIST: ChecklistItem[] = [
  { id: 'cl1', label: 'Register research topic with department',    checked: true  },
  { id: 'cl2', label: 'Obtain ethics board clearance',             checked: true  },
  { id: 'cl3', label: 'Complete literature review (Chapter 2)',     checked: false },
  { id: 'cl4', label: 'Submit methodology for supervisor approval', checked: false },
  { id: 'cl5', label: 'Upload primary dataset',                    checked: true  },
  { id: 'cl6', label: 'Run statistical analysis',                  checked: false },
  { id: 'cl7', label: 'Complete results chapter (Chapter 4)',       checked: false },
  { id: 'cl8', label: 'Plagiarism check (similarity < 20%)',       checked: false },
  { id: 'cl9', label: 'Final supervisor review and sign-off',      checked: false },
];

// ── Data Files ─────────────────────────────────────────────────────────────────

export const DATA_FILES: DataFile[] = [
  { id: 'df1', name: 'LUTH_patient_data.csv',        type: 'text/csv',        size: '2.4 MB', uploadedAt: '3 days ago', description: 'De-identified patient records from Lagos University Teaching Hospital (n=4,820)' },
  { id: 'df2', name: 'KBTH_patient_data.csv',        type: 'text/csv',        size: '1.8 MB', uploadedAt: '3 days ago', description: 'De-identified patient records from Korle-Bu Teaching Hospital, Accra (n=3,140)' },
  { id: 'df3', name: 'KNH_patient_data.csv',         type: 'text/csv',        size: '1.5 MB', uploadedAt: '3 days ago', description: 'De-identified patient records from Kenyatta National Hospital, Nairobi (n=2,670)' },
  { id: 'df4', name: 'fedcliniq_codebase.zip',       type: 'application/zip', size: '8.1 MB', uploadedAt: '1 week ago', description: 'FedCliniq framework source code and experiment scripts' },
  { id: 'df5', name: 'feature_importance_plots.pdf', type: 'application/pdf', size: '1.2 MB', uploadedAt: '5 days ago', description: 'SHAP feature importance plots for all three hospital models' },
];

// ── Analysis Results ───────────────────────────────────────────────────────────

export const ANALYSIS_RESULTS: AnalysisResult[] = [
  {
    id: 'an1',
    title: 'Federated vs. Centralised Accuracy (t-test)',
    testType: 'Independent Samples t-test',
    status: 'completed',
    summary: 'FedCliniq accuracy (91.3%) was not significantly different from centralised baseline (93.4%) across 10 independent runs.',
    pValue: 0.083, statistic: 't(18)', statValue: 1.82,
    effectSize: "Cohen's d", effectValue: 0.41, ci: '[−0.004, 0.047]',
    interpretation: 'The two-sample t-test (t(18) = 1.82, p = .083) indicates no statistically significant difference between FedCliniq and centralised model accuracy. The 95% CI [−0.004, 0.047] is consistent with a small accuracy deficit.',
    plainLanguage: 'The federated model performed almost as well as the centralised model. The small difference (2.1%) was not large enough to be statistically significant, meaning it could be due to chance.',
    draftText: 'A two-sample independent t-test was conducted to compare the diagnostic accuracy of FedCliniq (M = 91.3%, SD = 1.2%) against the centralised baseline (M = 93.4%, SD = 1.8%) across 10 independent experimental runs. The test revealed no statistically significant difference, t(18) = 1.82, p = .083, d = 0.41, 95% CI [−0.4%, 4.7%]. These results suggest that the federated framework achieves competitive accuracy while preserving patient data privacy.',
    assumptions: [
      { label: 'Independence of observations', met: true },
      { label: 'Normal distribution of accuracy scores', met: true, note: 'Shapiro-Wilk p = .31' },
      { label: 'Homogeneity of variance', met: true, note: "Levene's test p = .49" },
    ],
    createdAt: '3 hrs ago',
  },
  {
    id: 'an2',
    title: 'Communication Round Reduction (Mann-Whitney U)',
    testType: 'Mann-Whitney U Test',
    status: 'completed',
    summary: 'Adaptive scheduler significantly reduced communication rounds (p < .001), achieving 62% bandwidth reduction.',
    pValue: 0.0009, statistic: 'U', statValue: 14,
    effectSize: 'r (rank-biserial)', effectValue: 0.72,
    interpretation: 'The Mann-Whitney U test (U = 14, p < .001, r = .72) indicates a statistically significant and large reduction in communication rounds for FedCliniq compared to FedAvg.',
    plainLanguage: 'The adaptive communication scheduler dramatically reduced data sent between hospitals and the server. This difference was highly statistically significant with a large effect.',
    draftText: 'A Mann-Whitney U test compared communication rounds between FedCliniq adaptive scheduler (Mdn = 38) and baseline FedAvg (Mdn = 100). The test revealed a statistically significant difference, U = 14, p < .001, r = .72, indicating a large reduction in communication overhead attributable to the adaptive scheduler.',
    assumptions: [
      { label: 'Ordinal or continuous measurement', met: true },
      { label: 'Independence of observations', met: true },
      { label: 'Similar distribution shape', met: false, note: 'FedAvg rounds are approximately normal; FedCliniq shows right skew' },
    ],
    createdAt: '3 hrs ago',
  },
];

// ── Similarity / Plagiarism Data ───────────────────────────────────────────────

export const SIMILARITY_SECTIONS: SimilaritySection[] = [
  { id: 'ss1', section: 'Abstract',                      similarity: 4,  aiScore: 8,  sources: [{ title: 'Similar thesis, Univ. of Nairobi 2022', url: '#', match: 4 }] },
  { id: 'ss2', section: 'Chapter 1: Introduction',        similarity: 6,  aiScore: 12, sources: [{ title: 'FL Survey — Kairouz et al. 2021', url: '#', match: 4 }, { title: 'Thesis — A. Diallo 2023', url: '#', match: 2 }] },
  { id: 'ss3', section: 'Chapter 2: Literature Review',   similarity: 14, aiScore: 22, sources: [{ title: 'McMahan et al. 2017 (direct quote)', url: '#', match: 7 }, { title: 'Rieke et al. 2020', url: '#', match: 4 }, { title: 'FL Survey', url: '#', match: 3 }] },
  { id: 'ss4', section: 'Chapter 3: Methodology',         similarity: 8,  aiScore: 18, sources: [{ title: 'Hevner et al. 2004', url: '#', match: 5 }, { title: 'KNH ethics template', url: '#', match: 3 }] },
  { id: 'ss5', section: 'Chapter 4: Results',             similarity: 0,  aiScore: 0  },
  { id: 'ss6', section: 'Chapter 5: Discussion',          similarity: 0,  aiScore: 0  },
];

// ── Messages ───────────────────────────────────────────────────────────────────

export const MESSAGES: Message[] = [
  { id: 'm1', from: 'student',    authorName: 'Amara Osei',           text: 'Good morning Dr. Ogundimu. I have submitted my updated Chapter 2 for your review. I have added the DP-FL tabular section you requested.', time: 'Yesterday, 9:14 AM' },
  { id: 'm2', from: 'supervisor', authorName: 'Dr. Adebayo Ogundimu', text: 'Thank you, Amara. I will review it by end of week. Please also ensure you have addressed the missing sources for citations r9 and r11 — they appear uncited in your reference list.', time: 'Yesterday, 11:32 AM' },
  { id: 'm3', from: 'student',    authorName: 'Amara Osei',           text: 'Understood. I also have a question about the HFA aggregation strategy — should I include the full derivation in Chapter 3 or move it to an appendix?', time: 'Yesterday, 2:05 PM' },
  { id: 'm4', from: 'supervisor', authorName: 'Dr. Adebayo Ogundimu', text: 'Put the full derivation in the Appendix and provide a high-level intuition in Chapter 3. Examiners expect a readable methodology chapter, not a proof. Good progress overall — keep going.', time: 'Yesterday, 4:50 PM' },
  { id: 'm5', from: 'student',    authorName: 'Amara Osei',           text: 'Perfect, thank you! I will have Chapter 3 finalised by Friday.', time: 'Today, 8:30 AM' },
];

// ── Discussion Threads ─────────────────────────────────────────────────────────

export const DISCUSSION_THREADS: DiscussionThread[] = [
  {
    id: 't1', user: 'Dr. Adebayo Ogundimu', section: 'Chapter 2', timestamp: '2 hrs ago',
    text: 'The section on privacy-preserving FL is well written. However, the discussion of secure aggregation should mention the communication overhead cost more explicitly — this is relevant to your contribution.',
    replies: [
      { id: 'r1', user: 'Amara Osei',  text: 'Thank you. I will add a paragraph discussing the overhead tradeoff in section 2.2.',                                   timestamp: '1 hr ago'  },
      { id: 'r2', user: 'Kofi Mensah', text: 'Agreed — the Bonawitz et al. paper has a good breakdown of costs. Worth citing table 2 from that paper.',                timestamp: '45 min ago' },
    ],
  },
  {
    id: 't2', user: 'Kofi Mensah', section: 'Chapter 3', timestamp: '1 day ago',
    text: 'In section 3.2, the description of the KBTH dataset should mention the consent protocol — reviewers will ask about this, especially for cross-border data.',
    replies: [
      { id: 'r3', user: 'Amara Osei', text: 'Good point, I will add the ethics clearance reference numbers in that section.', timestamp: '22 hrs ago' },
    ],
  },
];

// ── Export History ─────────────────────────────────────────────────────────────

export const EXPORT_HISTORY: ExportRecord[] = [
  { id: 'ex1', format: 'pdf',  citationStyle: 'apa', fileName: 'FedCliniq_Draft_v3.pdf',  createdAt: '2 days ago' },
  { id: 'ex2', format: 'docx', citationStyle: 'apa', fileName: 'FedCliniq_Draft_v2.docx', createdAt: '5 days ago' },
];
