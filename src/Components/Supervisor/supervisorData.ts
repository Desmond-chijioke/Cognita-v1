// ── Types ──────────────────────────────────────────────────────────────────────

export type StageStatus      = 'completed' | 'in-progress' | 'not-started' | 'needs-revision';
export type ComplianceStatus = 'Good' | 'Warning' | 'Critical';
export type DegreeLevel      = 'PhD' | "Master's" | 'Undergraduate' | 'Postgraduate';
export type AnalysisStatus   = 'pending' | 'approved' | 'flagged';
export type AlertType        = 'overdue' | 'missing-data' | 'plagiarism-risk' | 'analysis-issue' | 'deadline' | 'milestone';

export interface StudentStage {
  name: string;
  status: StageStatus;
  dueDate?: string;
  supervisorApproved: boolean;
}

export interface StudentSection {
  id: string;
  title: string;
  wordCount: number;
  status: StageStatus;
  approved: boolean;
  supervisorComment?: string;
  content?: string;
}

export interface StudentAnalysis {
  id: string;
  title: string;
  testType: string;
  pValue?: number;
  result?: string;
  aiRecommended: boolean;
  status: AnalysisStatus;
  supervisorNote?: string;
}

export interface FeedbackMessage {
  author: string;
  isStudent: boolean;
  timestamp: string;
  text: string;
}

export interface FeedbackThread {
  id: string;
  subject: string;
  resolved: boolean;
  messages: FeedbackMessage[];
}

export interface StudentAlert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface SupervisedStudent {
  id: string;
  name: string;
  email: string;
  matricNo: string;
  degreeLevel: DegreeLevel;
  projectTitle: string;
  stage: string;
  progress: number;
  similarityIndex: number;
  aiDetectionScore: number;
  integrityScore: number;
  complianceStatus: ComplianceStatus;
  department: string;
  wordCount: number;
  targetWordCount: number;
  deadline: string;
  lastActivity: string;
  color: string;
  stages: StudentStage[];
  sections: StudentSection[];
  analyses: StudentAnalysis[];
  feedbackThreads: FeedbackThread[];
  alerts: StudentAlert[];
}

import { STUDENT_SECTIONS, STUDENT_PROFILE, PROJECT } from '../Student/studentData';

// ── Mock data ──────────────────────────────────────────────────────────────────

export const SUPERVISED_STUDENTS: SupervisedStudent[] = [
  {
    id: '1',
    name:        STUDENT_PROFILE.name,
    email:       STUDENT_PROFILE.email,
    matricNo:    STUDENT_PROFILE.matricNo,
    degreeLevel: STUDENT_PROFILE.degreeLevel as DegreeLevel,
    department:  STUDENT_PROFILE.department,
    color:       'blue',
    projectTitle: PROJECT.title,
    stage:       'Data Collection',
    progress:    PROJECT.progress,
    similarityIndex:  PROJECT.similarityIndex,
    aiDetectionScore: PROJECT.aiDetectionScore,
    integrityScore:   PROJECT.integrityScore,
    complianceStatus: 'Good' as const,
    wordCount:       PROJECT.wordCount,
    targetWordCount: PROJECT.targetWordCount,
    deadline:    PROJECT.deadline,
    lastActivity: '2 days ago',
    stages: [
      { name: 'Research Proposal',       status: 'completed',   dueDate: '2025-11-01', supervisorApproved: true  },
      { name: 'Literature Review',        status: 'completed',   dueDate: '2026-01-15', supervisorApproved: true  },
      { name: 'Methodology Design',       status: 'completed',   dueDate: '2026-02-28', supervisorApproved: true  },
      { name: 'Data Collection',          status: 'in-progress', dueDate: '2026-06-30', supervisorApproved: false },
      { name: 'Data Analysis',            status: 'not-started', dueDate: '2026-07-31', supervisorApproved: false },
      { name: 'Writing Up',               status: 'not-started', dueDate: '2026-08-31', supervisorApproved: false },
      { name: 'Final Submission',         status: 'not-started', dueDate: '2026-09-30', supervisorApproved: false },
    ],
    sections: STUDENT_SECTIONS.map(s => ({
      id:                s.id,
      title:             s.title,
      wordCount:         s.wordCount,
      status:            s.status as StageStatus,
      approved:          s.approved,
      supervisorComment: s.supervisorComment,
      content:           s.content,
    })),
    analyses: [],
    feedbackThreads: [
      {
        id: 'ft1-1', subject: 'Methodology — Dataset Justification', resolved: false,
        messages: [
          { author: 'Dr. Ogundimu', isStudent: false, timestamp: 'May 20, 10:15', text: 'Good structure overall, but Chapter 3 needs a clearer justification for why you chose the NIH-Chest X-ray dataset over CheXpert. Please address this before I can approve.' },
          { author: 'Amara Osei',   isStudent: true,  timestamp: 'May 21, 14:40', text: 'Thank you for the feedback. I will add a comparative analysis of both datasets in Section 3.2 and explain the selection rationale.' },
          { author: 'Dr. Ogundimu', isStudent: false, timestamp: 'May 22, 09:05', text: 'That sounds good. Also check that your preprocessing steps are reproducible — include the exact augmentation parameters you plan to use.' },
        ],
      },
    ],
    alerts: [
      { id: 'al1-1', type: 'milestone', message: 'Methodology chapter submitted — awaiting supervisor approval.', timestamp: 'May 22, 2026', read: true },
      { id: 'al1-2', type: 'deadline',  message: 'Data collection phase due in 35 days (30 Jun 2026).', timestamp: 'May 25, 2026', read: false },
    ],
  },

  {
    id: '2', name: 'Kofi Mensah', email: 'k.mensah@uni.ac', matricNo: 'CS/22/004',
    degreeLevel: "Master's", department: 'Computer Science', color: 'teal',
    projectTitle: 'NLP for Low-Resource African Languages',
    stage: 'Analysis', progress: 78,
    similarityIndex: 19, aiDetectionScore: 14, integrityScore: 88,
    complianceStatus: 'Good',
    wordCount: 24100, targetWordCount: 40000,
    deadline: '2025-12-15', lastActivity: '1 day ago',
    stages: [
      { name: 'Research Proposal',  status: 'completed',   dueDate: '2025-04-01', supervisorApproved: true  },
      { name: 'Literature Review',  status: 'completed',   dueDate: '2025-06-15', supervisorApproved: true  },
      { name: 'Methodology Design', status: 'completed',   dueDate: '2025-08-01', supervisorApproved: true  },
      { name: 'Data Collection',    status: 'completed',   dueDate: '2025-09-30', supervisorApproved: true  },
      { name: 'Analysis',           status: 'in-progress', dueDate: '2025-11-01', supervisorApproved: false },
      { name: 'Writing Up',         status: 'not-started', dueDate: '2025-11-30', supervisorApproved: false },
      { name: 'Final Submission',   status: 'not-started', dueDate: '2025-12-15', supervisorApproved: false },
    ],
    sections: [
      {
        id: 's2-1', title: 'Chapter 1 — Introduction', wordCount: 3800, status: 'completed', approved: true,
        supervisorComment: 'Strong motivation. Well written.',
        content: `1.1 Background\n\nNatural language processing (NLP) has achieved remarkable milestones in high-resource languages — English, Mandarin, Spanish — driven by the availability of large-scale pre-training corpora and computational resources. However, the majority of the world's approximately 7,000 living languages remain severely underrepresented in NLP research, creating a technological divide that mirrors and reinforces existing socioeconomic inequalities.\n\nAfrican languages collectively spoken by over one billion people are particularly marginalised in the NLP landscape. Of the 54 recognised African language families, fewer than 20 have active NLP research communities, and only a handful — Swahili, Amharic, Hausa, Yoruba — have benefited from substantial dataset creation and model development efforts. Languages such as Twi, Igbo, Wolof, and Fula remain largely absent from mainstream NLP benchmarks.\n\n1.2 Problem Statement\n\nCross-lingual transfer learning — the practice of fine-tuning a multilingual pre-trained model on a high-resource language and transferring learned representations to a low-resource target language — offers a promising path toward reducing the data annotation burden for African languages. However, the linguistic typological diversity of African languages (tonal systems, agglutinative morphology, Subject-Object-Verb word order in some families) poses significant challenges for models pre-trained predominantly on Indo-European language data.\n\nThis dissertation investigates whether cross-lingual transfer from closely related African languages outperforms transfer from high-resource European languages, a hypothesis motivated by the linguistic relatedness hypothesis in transfer learning theory.\n\n1.3 Research Questions\n\nThis study addresses three research questions: (RQ1) To what extent do multilingual pre-trained language models support zero-shot and few-shot cross-lingual transfer to Akan (Twi) for named entity recognition and sentiment analysis tasks? (RQ2) Does source language relatedness — measured by linguistic distance metrics — predict cross-lingual transfer effectiveness? (RQ3) What minimum quantity of target language labelled data is required to achieve performance parity with fully supervised models?`,
      },
      {
        id: 's2-2', title: 'Chapter 2 — Literature Review', wordCount: 7200, status: 'completed', approved: true,
        supervisorComment: 'Good survey. Some missing citations flagged.',
        content: `2.1 Multilingual Pre-trained Language Models\n\nThe development of multilingual BERT (mBERT, Devlin et al., 2019) marked a pivotal moment in cross-lingual NLP: a single model pre-trained on 104 languages demonstrated non-trivial zero-shot cross-lingual transfer capabilities despite receiving no explicit cross-lingual supervision. Subsequent models — XLM (Conneau & Lample, 2019), XLM-R (Conneau et al., 2020), mDeBERTa (He et al., 2021) — improved upon mBERT through larger training corpora, cross-lingual masked language modelling objectives, and improved tokenisation strategies.\n\nFor African languages specifically, AfriBERTa (Ogueji et al., 2021) represents the most significant dedicated pre-training effort: a compact BERT model trained on 11 African languages using the CulturaX corpus. Subsequent work by Alabi et al. (2022) introduced AfroXLMR, extending XLM-R with continued pre-training on African language data and demonstrating consistent performance improvements across AfriNLP benchmark tasks.\n\n2.2 Cross-Lingual Transfer for Named Entity Recognition\n\nNamed entity recognition (NER) has served as the primary testbed for cross-lingual transfer evaluation due to the availability of standardised benchmarks such as WikiANN (Pan et al., 2017) and MasakhaNER (Adelani et al., 2021). MasakhaNER, the first large-scale NER dataset covering 10 African languages including Hausa, Igbo, Yoruba, and Swahili, has become the de facto evaluation standard for African NLP.\n\nKey findings from the cross-lingual NER literature include: (1) zero-shot transfer from English to African languages yields F1 scores 15–30 points below fully supervised baselines; (2) few-shot fine-tuning with as few as 100 target language examples recovers a substantial fraction of this gap; and (3) models pre-trained on data that includes the target language consistently outperform those that do not, even when the included data is minimal.\n\n2.3 Linguistic Distance and Transfer Effectiveness\n\nThe relationship between linguistic relatedness and cross-lingual transfer effectiveness has been studied primarily in the European language context. Lauscher et al. (2020) demonstrated a moderate positive correlation between transfer performance and genealogical language similarity, as measured by the URIEL typological database. However, the applicability of these findings to African languages — characterised by complex areal features, extensive contact-induced change, and typological diversity not captured by genealogical metrics — remains understudied.`,
      },
      {
        id: 's2-3', title: 'Chapter 3 — Methodology', wordCount: 5600, status: 'completed', approved: true,
        content: `3.1 Research Design\n\nThis study employs a comparative experimental design to evaluate cross-lingual transfer from multiple source languages to Akan (Twi) across two NLP tasks: named entity recognition (NER) and sentiment analysis. The experimental design controls for model architecture, training procedure, and evaluation protocol, varying only the source language of zero-shot transfer and the quantity of target language fine-tuning data.\n\n3.2 Target Language: Akan (Twi)\n\nTwi is a member of the Central Tano subgroup of the Kwa branch of the Niger-Congo language family, spoken by approximately 9 million people primarily in Ghana. As a tone language with noun class morphology and SVO word order, Twi presents distinct challenges for NLP systems pre-trained on non-tonal languages. The lack of standardised orthography — multiple competing romanisation systems exist — introduces additional noise in the pre-processing pipeline.\n\n3.3 Datasets\n\nFor NER, the GhanaNLP NER dataset (Amponsah-Baah et al., 2023) comprising 4,200 annotated sentences across five entity types (Person, Organisation, Location, Date, Miscellaneous) is used as the target language evaluation set. For sentiment analysis, the AfriSenti-SemEval dataset (Mohammad et al., 2023) Twi split, containing 3,100 tweets annotated for positive, negative, and neutral sentiment, provides the evaluation benchmark.\n\nSource language transfer is evaluated from five languages: English (high-resource, Indo-European), Hausa (high-resource African, Afro-Asiatic), Yoruba (medium-resource African, Niger-Congo), Swahili (medium-resource African, Bantu), and Fante (low-resource African, Kwa — closely related to Twi).\n\n3.4 Models and Transfer Conditions\n\nThree transfer conditions are evaluated: (1) zero-shot, where the model is fine-tuned solely on source language labelled data and evaluated directly on Twi; (2) few-shot, where 50, 100, 200, and 500 Twi examples are added to source language fine-tuning; and (3) fully supervised, where the model is fine-tuned on the complete Twi training split. Models evaluated are mBERT, XLM-R large, and AfriBERTa-large.`,
      },
      {
        id: 's2-4', title: 'Chapter 4 — Experiments', wordCount: 7500, status: 'in-progress', approved: false,
        supervisorComment: 'Baseline comparisons need more detail.',
        content: `4.1 Experimental Setup\n\nAll experiments are conducted using the HuggingFace Transformers library (Wolf et al., 2020) with PyTorch 2.1 as the backend. Training is performed on a single NVIDIA A100 40GB GPU. Hyperparameter optimisation is conducted via grid search on the validation split, with the following search space: learning rate {1×10⁻⁵, 3×10⁻⁵, 5×10⁻⁵}, batch size {16, 32}, and training epochs {3, 5, 10}. The best configuration for each model-task combination is selected based on validation F1 (NER) or macro-F1 (sentiment analysis).\n\n4.2 Baseline Models\n\nThree baseline systems are included for comparison: (1) a BiLSTM-CRF model trained on source language data, representing the pre-transformer state of the art; (2) a random majority-class classifier; and (3) a dictionary-based NER system using the GhanaNLP lexical resource. These baselines contextualise the performance gains attributable specifically to pre-trained transformer representations.\n\nNote: The reviewer has requested the inclusion of GPT-3.5 few-shot results as an additional baseline. These experiments are currently in progress. Preliminary results suggest that GPT-3.5 few-shot (32-shot, English prompt) achieves approximately 0.41 F1 on Twi NER, substantially below fine-tuned XLM-R (0.71 F1 in the 500-shot condition). Full results including multilingual-E5 embeddings will be incorporated in the final version of this chapter.\n\n4.3 Named Entity Recognition Results\n\nTable 4.1 presents zero-shot NER results across all source language and model combinations. Key observations: (1) Fante-to-Twi transfer consistently outperforms English-to-Twi transfer across all models, supporting the linguistic relatedness hypothesis; (2) XLM-R large achieves the highest zero-shot F1 (0.58) in the Fante-source condition, compared to 0.43 in the English-source condition; (3) AfriBERTa yields competitive results in the Hausa- and Yoruba-source conditions but underperforms XLM-R in the Fante condition, likely due to the absence of Fante in its pre-training corpus.`,
      },
      { id: 's2-5', title: 'Chapter 5 — Results & Analysis', wordCount: 0, status: 'not-started', approved: false },
      { id: 's2-6', title: 'Chapter 6 — Conclusion',          wordCount: 0, status: 'not-started', approved: false },
    ],
    analyses: [
      { id: 'an2-1', title: 'BLEU Score Comparison Across Models', testType: 'Comparative benchmarking', pValue: undefined, result: 'mBERT outperforms AfriBERTa by 4.2 BLEU on Twi test set. Results align with hypothesis.', aiRecommended: true,  status: 'approved' },
      { id: 'an2-2', title: 'Statistical Significance Test',       testType: 'Paired t-test',            pValue: 0.03,      result: 'p=0.03 confirms significant improvement. Effect size (Cohen\'s d = 0.68) is moderate.',  aiRecommended: false, status: 'pending'  },
    ],
    feedbackThreads: [
      {
        id: 'ft2-1', subject: 'Chapter 4 — Baseline Comparisons', resolved: false,
        messages: [
          { author: 'Dr. Ogundimu', isStudent: false, timestamp: 'May 23, 11:30', text: 'Chapter 4 is progressing well, but the baseline comparison section needs to include GPT-3.5 few-shot results for completeness. Can you add that?' },
          { author: 'Kofi Mensah',  isStudent: true,  timestamp: 'May 24, 08:15', text: 'Noted. I will run the GPT-3.5 few-shot experiments and add the results to Table 4.3. Should I also include multilingual-e5?' },
          { author: 'Dr. Ogundimu', isStudent: false, timestamp: 'May 24, 09:40', text: 'Yes, include multilingual-e5 as well. That will give a more robust comparison landscape.' },
        ],
      },
    ],
    alerts: [
      { id: 'al2-1', type: 'deadline', message: 'Final submission deadline is in 204 days (15 Dec 2025).', timestamp: 'May 25, 2026', read: false },
    ],
  },

  {
    id: '3', name: 'Fatima Al-Rashid', email: 'f.alrashid@uni.ac', matricNo: 'CS/21/009',
    degreeLevel: 'PhD', department: 'Computer Science', color: 'violet',
    projectTitle: 'Federated Learning Frameworks for Privacy-Preserving AI',
    stage: 'Writing Up', progress: 88,
    similarityIndex: 7, aiDetectionScore: 5, integrityScore: 96,
    complianceStatus: 'Good',
    wordCount: 52000, targetWordCount: 80000,
    deadline: '2026-08-01', lastActivity: 'Today',
    stages: [
      { name: 'Research Proposal',  status: 'completed',   dueDate: '2024-06-01', supervisorApproved: true  },
      { name: 'Literature Review',  status: 'completed',   dueDate: '2024-09-30', supervisorApproved: true  },
      { name: 'Methodology Design', status: 'completed',   dueDate: '2025-01-15', supervisorApproved: true  },
      { name: 'Data Collection',    status: 'completed',   dueDate: '2025-05-30', supervisorApproved: true  },
      { name: 'Analysis',           status: 'completed',   dueDate: '2025-10-01', supervisorApproved: true  },
      { name: 'Writing Up',         status: 'in-progress', dueDate: '2026-06-30', supervisorApproved: false },
      { name: 'Final Submission',   status: 'not-started', dueDate: '2026-08-01', supervisorApproved: false },
    ],
    sections: [
      { id: 's3-1', title: 'Chapter 1 — Introduction',               wordCount: 5200,  status: 'completed',  approved: true,  supervisorComment: 'Excellent. Ready for final thesis.', content: `1.1 Motivation\n\nThe proliferation of machine learning across sensitive domains — healthcare, finance, criminal justice, and national security — has brought the tension between predictive utility and individual privacy to the forefront of AI ethics and governance discourse. Centralised model training, which aggregates raw data from distributed sources into a single training environment, offers computational efficiency but fundamentally conflicts with privacy regulations such as the European Union's General Data Protection Regulation (GDPR) and Nigeria's Data Protection Act (NDPA 2023).\n\nFederated learning (FL), first formalised by McMahan et al. (2017) at Google, offers an alternative paradigm: model parameters — rather than raw data — are shared between participating clients and a central aggregation server. Each client trains on its local dataset and transmits gradient updates; the server aggregates these updates (typically via FedAvg) and returns an improved global model. Raw data never leaves the client's local environment, preserving a fundamental privacy guarantee.\n\n1.2 Research Gap\n\nDespite the theoretical appeal of federated learning, several critical challenges limit its practical deployment. The assumption of independent and identically distributed (IID) data across clients is routinely violated in real-world deployments: clinical datasets across hospitals reflect institution-specific patient demographics, disease prevalence, and imaging protocols. This statistical heterogeneity — termed non-IID data — significantly degrades the convergence properties of FedAvg and its variants.\n\nFurthermore, federated learning is not inherently private: gradient inversion attacks (Zhu et al., 2019) have demonstrated that raw training samples can be reconstructed from shared gradient updates with high fidelity, undermining the central privacy promise. Integrating formal differential privacy (DP) guarantees into the federated learning pipeline — while managing the accuracy-privacy tradeoff — remains an open research problem.\n\n1.3 Objectives\n\nThis dissertation develops and evaluates a federated learning framework incorporating (1) client-adaptive aggregation to handle non-IID data distributions; (2) local differential privacy with formal ε-DP guarantees; and (3) communication-efficient gradient compression. The framework is evaluated on three benchmark FL datasets across healthcare, financial fraud detection, and natural language processing domains.` },
      { id: 's3-2', title: 'Chapter 2 — Literature Review',          wordCount: 12400, status: 'completed',  approved: true,  supervisorComment: 'Thorough and well-cited.',         content: `2.1 Federated Learning: Foundations\n\nThe FedAvg algorithm (McMahan et al., 2017) established the foundational federated learning protocol: in each communication round, the server selects a fraction of available clients, broadcasts the current global model, each selected client performs E local SGD steps, and the server aggregates client updates via weighted averaging. Convergence analyses by Li et al. (2020) established that FedAvg converges to a stationary point under non-IID data with a rate of O(1/T), though the convergence bound degrades substantially as data heterogeneity increases.\n\n2.2 Handling Non-IID Data\n\nThe non-IID challenge has attracted significant research attention. FedProx (Li et al., 2020) introduces a proximal regularisation term to prevent client models from drifting excessively from the global model during local training. SCAFFOLD (Karimireddy et al., 2020) uses control variates to correct for client drift. FedNova (Wang et al., 2020) normalises local updates before aggregation to eliminate objective inconsistency caused by heterogeneous local update counts. Experimental evaluations on CIFAR-10 with Dirichlet-distributed label skew consistently show FedProx and SCAFFOLD outperforming FedAvg by 3–8 percentage points in accuracy.\n\n2.3 Differential Privacy in Federated Learning\n\nFormal differential privacy (Dwork et al., 2006) provides a mathematical framework for quantifying privacy loss: a mechanism M satisfies (ε, δ)-DP if for any two adjacent datasets D and D', Pr[M(D) ∈ S] ≤ e^ε · Pr[M(D') ∈ S] + δ. In the federated context, DP-SGD (Abadi et al., 2016) clips per-example gradients to bound sensitivity and adds calibrated Gaussian noise, providing a per-round privacy guarantee that composes across rounds via the moments accountant.\n\n2.4 Communication Efficiency\n\nFederated learning's communication overhead — transmitting full model gradients per round — constitutes a significant bottleneck in bandwidth-limited deployments. Gradient compression strategies including Top-K sparsification, quantisation (1-bit SGD), and structured random projections have been shown to reduce communication costs by 10–1000× with minimal accuracy degradation. Federated dropout (Caldas et al., 2018) further reduces per-round communication by training sub-networks at each client.` },
      { id: 's3-3', title: 'Chapter 3 — Theoretical Framework',      wordCount: 8600,  status: 'completed',  approved: true,                                                          content: `3.1 Problem Formulation\n\nConsider a federation of K clients, each holding a local dataset Dk of size nk, where the total dataset D = ∪k Dk has size n = Σk nk. The global objective is to minimise F(w) = Σk (nk/n) Fk(w), where Fk(w) = E_{(x,y)~Dk}[ℓ(f(x;w), y)] is the local empirical risk for client k. Under IID conditions, F(w) equals the true population risk; under non-IID conditions, the local objectives Fk may be arbitrarily different, inducing client drift.\n\n3.2 Privacy Framework\n\nWe adopt the local differential privacy (LDP) model, in which each client perturbs its gradient update before transmission, providing privacy guarantees that hold even against a potentially adversarial server. For a gradient update g = ∇Fk(w), the LDP mechanism clips the gradient norm to C (preventing sensitivity unboundedness) and adds Gaussian noise: g̃ = g/max(1, ||g||₂/C) + N(0, σ²C²I). The noise multiplier σ is calibrated to achieve (ε, δ)-DP per round, with total privacy budget tracked via the Rényi differential privacy (RDP) accountant.\n\n3.3 Convergence Analysis\n\nUnder standard assumptions of L-smoothness, bounded gradient variance, and bounded gradient dissimilarity (capturing non-IID degree), we prove that the proposed framework converges at rate O(1/√(KT)) for convex objectives and O(1/T^(2/3)) for non-convex objectives, with explicit dependence on the privacy noise variance σ and the heterogeneity parameter Γ. The key theoretical contribution is a tight analysis of the interaction between differential privacy noise and client drift under non-IID conditions.` },
      { id: 's3-4', title: 'Chapter 4 — System Design & Methodology', wordCount: 9800, status: 'completed',  approved: true,                                                          content: `4.1 System Architecture\n\nThe proposed FedPriv framework consists of three components: (1) a client-side training module that executes local SGD with DP-SGD gradient perturbation; (2) a server-side adaptive aggregation module that weights client contributions based on local validation performance; and (3) a communication-efficient protocol that applies Top-K sparsification before transmission.\n\n4.2 Client-Adaptive Aggregation\n\nStandard FedAvg aggregates client updates with weights proportional to local dataset size, which can cause high-quality clients with small datasets to be overwhelmed by low-quality clients with large datasets. FedPriv introduces a quality-weighted aggregation scheme: each client computes a local validation loss on a small held-out set and transmits it alongside the gradient update. The server computes aggregation weights inversely proportional to validation loss, up-weighting clients with more generalisable local models.\n\n4.3 Communication Protocol\n\nTo reduce communication overhead, FedPriv applies coordinate-wise Top-K sparsification: only the K largest-magnitude gradient coordinates are transmitted per round, with K set to 1% of total parameters. The server maintains an error feedback buffer that accumulates compression errors, ensuring that important gradient directions are not permanently suppressed. This combination of sparsification and error feedback has been shown to preserve convergence guarantees under mild additional assumptions.` },
      { id: 's3-5', title: 'Chapter 5 — Implementation',             wordCount: 7400,  status: 'completed',  approved: true,                                                          content: `5.1 Implementation Environment\n\nFedPriv is implemented in Python 3.10 using PyTorch 2.1 and the Flower federated learning framework (Beutel et al., 2020). Simulated federated experiments are conducted on a single server with 8× NVIDIA A100 40GB GPUs, where each GPU simulates one or more clients. For the healthcare benchmark, 20 simulated clients each hold a partition of the MIMIC-CXR chest radiograph dataset; for the financial fraud benchmark, 50 simulated clients hold partitions of the IEEE-CIS Fraud Detection dataset.\n\n5.2 Non-IID Data Partitioning\n\nData heterogeneity is simulated using a Dirichlet distribution with concentration parameter α to control the degree of label skew: α → ∞ recovers IID partitioning, while α → 0 produces extreme label imbalance where each client holds data from a single class. Experiments are conducted across three heterogeneity levels: mild (α = 1.0), moderate (α = 0.5), and severe (α = 0.1).\n\n5.3 Privacy Budget Allocation\n\nPrivacy budget allocation across training rounds follows the RDP accountant implementation from the TensorFlow Privacy library. For the primary experiments, a total privacy budget of ε = 1.2 with δ = 10⁻⁵ is used — values consistent with the recommendations of the Apple differential privacy team for production deployments. The noise multiplier σ = 1.1 and gradient clipping bound C = 1.0 are calibrated via the PRV accountant to achieve this budget over 100 communication rounds.` },
      {
        id: 's3-6', title: 'Chapter 6 — Results & Discussion', wordCount: 8600, status: 'in-progress', approved: false,
        supervisorComment: 'Near complete. Add limitations section.',
        content: `6.1 Main Results: Healthcare Benchmark\n\nTable 6.1 presents the primary results on the MIMIC-CXR multi-label classification benchmark. FedPriv achieves 97.2% of the centralised (non-private) baseline accuracy under mild heterogeneity (α = 1.0), demonstrating that the quality-weighted aggregation effectively compensates for the accuracy cost of differential privacy noise. Under severe heterogeneity (α = 0.1), FedPriv achieves 94.1% of the centralised baseline, compared to 88.3% for FedAvg with equivalent privacy parameters — a statistically significant improvement (DeLong test, p < 0.01).\n\n6.2 Communication Efficiency\n\nThe Top-K sparsification protocol with K = 1% reduces per-round communication cost by 87× relative to transmitting full gradients, with an accuracy degradation of less than 0.5% across all experimental conditions. Error feedback successfully prevents gradient information loss: without error feedback, accuracy degrades by an additional 2.1% under severe heterogeneity.\n\n6.3 Privacy-Accuracy Tradeoff\n\nFigure 6.3 illustrates the privacy-accuracy tradeoff curve for FedPriv across ε ∈ {0.5, 1.0, 1.2, 2.0, 5.0, ∞}. The curve exhibits a characteristic "knee" at ε ≈ 1.2, below which accuracy degrades rapidly as privacy constraints tighten. At ε = 1.2, the accuracy gap relative to the non-private baseline (ε = ∞) is 2.3%, which we consider acceptable for most clinical deployment contexts given the strong privacy guarantee provided.\n\n6.4 Convergence Behaviour\n\nConvergence plots (Figure 6.4) confirm that FedPriv converges consistently across all heterogeneity levels, while FedAvg with DP exhibits instability under severe heterogeneity — occasional divergence followed by recovery — consistent with the theoretical prediction that client drift and DP noise interact adversarially.\n\n[Note: Limitations section to be added as per supervisor's feedback. Draft outline: (1) simulation vs. real federated deployment limitations; (2) assumption of honest-but-curious server; (3) generalisation to heterogeneous device hardware; (4) scalability beyond 50 clients.]`,
      },
      { id: 's3-7', title: 'Chapter 7 — Conclusion & Future Work', wordCount: 0, status: 'not-started', approved: false },
    ],
    analyses: [
      { id: 'an3-1', title: 'Federated vs Centralised — Accuracy Loss', testType: 'Comparative analysis',         pValue: 0.01, result: 'Federated approach achieves 97.2% of centralised baseline accuracy with full privacy preservation.', aiRecommended: false, status: 'approved' },
      { id: 'an3-2', title: 'Communication Round Efficiency',           testType: 'Convergence analysis',          pValue: undefined, result: 'FedProx converges in 38% fewer rounds than FedAvg on non-IID data distributions.', aiRecommended: true, status: 'approved' },
      { id: 'an3-3', title: 'Privacy Budget Analysis (ε-DP)',           testType: 'Differential privacy analysis', pValue: undefined, result: 'ε = 1.2 achieved with minimal utility degradation (< 2% accuracy drop).', aiRecommended: false, status: 'approved' },
    ],
    feedbackThreads: [
      {
        id: 'ft3-1', subject: 'Chapter 6 — Limitations Section', resolved: false,
        messages: [
          { author: 'Dr. Ogundimu',    isStudent: false, timestamp: 'May 25, 09:00', text: 'Chapter 6 is almost submission-ready. Please add a dedicated limitations section (300–400 words) before I submit the final approval.' },
          { author: 'Fatima Al-Rashid',isStudent: true,  timestamp: 'May 25, 11:20', text: 'Understood. I will add limitations around communication overhead, assumption of honest-but-curious adversaries, and generalisation to heterogeneous devices.' },
        ],
      },
    ],
    alerts: [
      { id: 'al3-1', type: 'milestone', message: 'Chapter 5 approved. 6 of 7 chapters complete.', timestamp: 'May 24, 2026', read: true  },
      { id: 'al3-2', type: 'deadline',  message: 'Writing Up phase due 30 Jun 2026 — 35 days remaining.', timestamp: 'May 25, 2026', read: false },
    ],
  },

  {
    id: '4', name: 'Emeka Okafor', email: 'e.okafor@uni.ac', matricNo: 'CS/23/012',
    degreeLevel: 'Undergraduate', department: 'Computer Science', color: 'orange',
    projectTitle: 'IoT-Based Smart Campus Monitoring System',
    stage: 'Proposal', progress: 30,
    similarityIndex: 34, aiDetectionScore: 41, integrityScore: 58,
    complianceStatus: 'Critical',
    wordCount: 4800, targetWordCount: 15000,
    deadline: '2026-05-30', lastActivity: '5 days ago',
    stages: [
      { name: 'Topic Selection',    status: 'completed',    dueDate: '2026-02-01', supervisorApproved: true  },
      { name: 'Research Proposal',  status: 'in-progress',  dueDate: '2026-04-15', supervisorApproved: false },
      { name: 'Literature Review',  status: 'not-started',  dueDate: '2026-04-30', supervisorApproved: false },
      { name: 'Implementation',     status: 'not-started',  dueDate: '2026-05-15', supervisorApproved: false },
      { name: 'Final Report',       status: 'not-started',  dueDate: '2026-05-30', supervisorApproved: false },
    ],
    sections: [
      {
        id: 's4-1', title: 'Introduction', wordCount: 1800, status: 'needs-revision', approved: false,
        supervisorComment: 'Revise: 3 uncited claims in paragraphs 2–4. High AI detection in this section.',
        content: `1.1 Background\n\nThe Internet of Things (IoT) refers to the network of physical objects embedded with sensors, software, and connectivity capabilities that enable them to collect and exchange data. University campuses are increasingly adopting IoT technologies to enhance operational efficiency, student safety, and resource management. Smart campus systems can monitor energy consumption, manage access control, track occupancy, and provide real-time environmental data to administrators and students.\n\nModern universities face significant challenges in managing large physical infrastructures efficiently. Traditional manual monitoring systems are labour-intensive, prone to human error, and incapable of providing the real-time insights required for proactive facility management. IoT-based smart campus systems offer a solution by automating data collection and enabling intelligent decision-making through connected sensor networks.\n\n1.2 Problem Statement\n\nDespite widespread interest in smart campus initiatives, many institutions lack a comprehensive, integrated monitoring system that combines multiple IoT data streams into a unified management platform. Existing solutions are often siloed — addressing individual problems such as energy monitoring or access control in isolation — without providing a holistic view of campus operations. Furthermore, IoT security vulnerabilities pose significant risks: inadequately secured sensor networks can be exploited to disrupt campus services or compromise student and staff data.\n\nThis project aims to design and implement a prototype IoT-based smart campus monitoring system for the Computer Science department building, integrating temperature, occupancy, energy consumption, and access control data streams into a unified web-based dashboard.\n\n[Note: The introduction requires significant revision. Three claims in paragraphs 2 and 3 require proper citations. The section on IoT security (paragraph 4) was flagged for high AI detection — please rewrite in your own words with proper academic references.]`,
      },
      {
        id: 's4-2', title: 'Literature Review', wordCount: 2200, status: 'in-progress', approved: false,
        supervisorComment: 'Similarity score very high — rephrase or cite sources properly.',
        content: `2.1 IoT in Higher Education\n\nThe application of Internet of Things technology in higher education institutions has gained considerable momentum over the past decade. Researchers have explored IoT deployments for energy management, campus security, classroom monitoring, and student attendance tracking. A systematic review by Kassab et al. (2020) identified 47 IoT-in-education studies and categorised them into four domains: smart learning environments, campus management, student welfare, and administrative efficiency.\n\nEnergy management represents the most mature application area: smart metering systems using low-power wide-area network (LoRaWAN) protocols have been deployed at universities in the UK, Netherlands, and Malaysia, achieving energy savings of 15–30% through automated load scheduling and occupancy-based HVAC control.\n\n2.2 Smart Campus Architectures\n\nSmart campus architectures generally follow a three-tier model: (1) the perception layer, comprising sensors and actuators; (2) the network layer, responsible for data transmission via WiFi, Zigbee, or cellular connectivity; and (3) the application layer, which provides data storage, processing, and user interfaces. Cloud platforms including AWS IoT Core, Microsoft Azure IoT Hub, and Google Cloud IoT are commonly used for scalable data management.\n\n2.3 Security Considerations\n\nIoT security remains a critical concern in campus deployments. [This section requires significant revision — current text is closely paraphrased from NIST IoT security guidelines and several survey papers without adequate citation. Specific sentences flagged: "IoT devices are particularly vulnerable due to limited computational resources that preclude strong encryption" and the following two paragraphs. Please rewrite these using your own analysis of the cited sources.]`,
      },
      {
        id: 's4-3', title: 'Methodology', wordCount: 800, status: 'in-progress', approved: false,
        content: `3.1 System Design Overview\n\nThe proposed smart campus monitoring system consists of four subsystems: (1) an environmental monitoring subsystem using DHT22 temperature/humidity sensors and PIR motion sensors for occupancy detection; (2) an energy monitoring subsystem using PZEM-004T power measurement modules; (3) an access control subsystem using RFID readers and relay-controlled electronic locks; and (4) a central data management subsystem using a Raspberry Pi 4B as a local gateway with MQTT broker.\n\n3.2 Hardware Components\n\nSensor nodes are implemented on ESP32 microcontrollers, selected for their integrated WiFi and Bluetooth capabilities, low power consumption in deep sleep mode (10μA), and GPIO compatibility with the selected sensor modules. The MQTT protocol was selected for sensor-to-gateway communication due to its lightweight publish-subscribe architecture, suitability for bandwidth-constrained environments, and native support in the ESP32 Arduino framework.\n\n[Methodology section is incomplete — hardware selection justification needs to be expanded, and the software architecture section has not yet been drafted. Target word count for complete chapter: 3,500 words.]`,
      },
      { id: 's4-4', title: 'Implementation',     wordCount: 0,    status: 'not-started',    approved: false                                                                                                      },
      { id: 's4-5', title: 'Results',            wordCount: 0,    status: 'not-started',    approved: false                                                                                                      },
      { id: 's4-6', title: 'Conclusion',         wordCount: 0,    status: 'not-started',    approved: false                                                                                                      },
    ],
    analyses: [],
    feedbackThreads: [
      {
        id: 'ft4-1', subject: 'Urgent — Plagiarism and AI Concerns', resolved: false,
        messages: [
          { author: 'Dr. Ogundimu', isStudent: false, timestamp: 'May 20, 08:30', text: 'Emeka, I need to raise a serious concern. Your current draft shows a similarity index of 34% and an AI detection score of 41%. These are both above the acceptable thresholds. You need to substantially revise the Introduction and Literature Review sections before your proposal can be considered.' },
          { author: 'Emeka Okafor', isStudent: true,  timestamp: 'May 21, 16:00', text: 'I apologize, Dr. Ogundimu. I was using AI tools to help me draft sections without realising how heavily I was relying on them. I will rewrite those sections properly.' },
          { author: 'Dr. Ogundimu', isStudent: false, timestamp: 'May 22, 10:15', text: 'I appreciate your honesty. Please rewrite the sections in your own words and ensure all sources are properly cited. Your deadline is approaching — please submit the revised draft by 28 May. I can meet with you on 27 May if you need guidance.' },
        ],
      },
    ],
    alerts: [
      { id: 'al4-1', type: 'plagiarism-risk', message: 'Similarity index 34% exceeds the 25% threshold. Immediate revision required.', timestamp: 'May 20, 2026', read: false },
      { id: 'al4-2', type: 'overdue',         message: 'Research proposal was due 15 Apr 2026 — now 40 days overdue.',                  timestamp: 'May 25, 2026', read: false },
      { id: 'al4-3', type: 'deadline',        message: 'Final report deadline is 30 May 2026 — 5 days remaining.',                      timestamp: 'May 25, 2026', read: false },
    ],
  },

  {
    id: '5', name: 'Ngozi Adeyemi', email: 'n.adeyemi@uni.ac', matricNo: 'CS/23/018',
    degreeLevel: 'Undergraduate', department: 'Computer Science', color: 'green',
    projectTitle: 'Blockchain Technology for Secure Academic Records Management',
    stage: 'Literature Review', progress: 45,
    similarityIndex: 22, aiDetectionScore: 18, integrityScore: 82,
    complianceStatus: 'Good',
    wordCount: 7200, targetWordCount: 15000,
    deadline: '2026-05-30', lastActivity: 'Yesterday',
    stages: [
      { name: 'Topic Selection',   status: 'completed',   dueDate: '2026-02-01', supervisorApproved: true  },
      { name: 'Research Proposal', status: 'completed',   dueDate: '2026-03-15', supervisorApproved: true  },
      { name: 'Literature Review', status: 'in-progress', dueDate: '2026-04-30', supervisorApproved: false },
      { name: 'Implementation',    status: 'not-started', dueDate: '2026-05-15', supervisorApproved: false },
      { name: 'Final Report',      status: 'not-started', dueDate: '2026-05-30', supervisorApproved: false },
    ],
    sections: [
      {
        id: 's5-1', title: 'Introduction', wordCount: 2100, status: 'completed', approved: true,
        supervisorComment: 'Good intro. Clear research questions.',
        content: `1.1 Background\n\nAcademic credential fraud poses a significant threat to the integrity of higher education systems worldwide. The proliferation of counterfeit degree certificates, transcript falsification, and fraudulent professional qualifications undermines employer confidence in academic credentials and damages the reputation of legitimate graduates. The UNESCO Institute for Statistics estimates that credential fraud costs the global economy over $1 billion annually in fraudulent recruitment decisions and subsequent performance failures.\n\nBlockchain technology — a distributed, immutable ledger system originally developed for cryptocurrency applications — offers a compelling solution to academic credential fraud. By recording credentials as cryptographically secured transactions on a decentralised network, blockchain systems enable instant, tamper-proof verification by any authorised party without requiring centralised database access or institutional intermediaries.\n\n1.2 Problem Statement\n\nExisting academic records management systems at Nigerian universities rely predominantly on centralised databases and physical document issuance. These systems are vulnerable to single-point-of-failure attacks, insider fraud, and physical document forgery. The verification process for Nigerian university credentials by employers, regulatory bodies, and foreign institutions is slow (typically 4–12 weeks), expensive, and unreliable.\n\nThis project investigates the design and prototype implementation of a blockchain-based academic records management system for Nigerian higher education institutions, with emphasis on credential issuance, student-controlled sharing, and instant third-party verification.\n\n1.3 Research Questions\n\n(RQ1) How can blockchain technology be applied to create a tamper-proof, decentralised academic credential system suitable for Nigerian university infrastructure constraints? (RQ2) What privacy-preserving mechanisms can enable students to selectively disclose credential attributes to verifying parties without revealing the full transcript? (RQ3) What are the performance characteristics (throughput, latency, cost) of an Ethereum-based credential system under realistic Nigerian network conditions?`,
      },
      {
        id: 's5-2', title: 'Literature Review', wordCount: 3800, status: 'in-progress', approved: false,
        supervisorComment: 'Add more recent blockchain-in-education papers from 2023–2025.',
        content: `2.1 Blockchain Technology Fundamentals\n\nA blockchain is a chronologically ordered, cryptographically linked sequence of blocks, each containing a set of validated transactions, a cryptographic hash of the preceding block, a timestamp, and a nonce. The immutability property of blockchain derives from the computational infeasibility of altering a historical block without recomputing the proof-of-work (or proof-of-stake) for all subsequent blocks — an effort that would require controlling more than 50% of the network's total computational power.\n\nPublic blockchains such as Bitcoin and Ethereum operate on permissionless networks where any node may participate in validation. Permissioned blockchains such as Hyperledger Fabric restrict participation to authorised nodes, trading decentralisation for higher throughput and lower latency — characteristics more suited to institutional deployments.\n\n2.2 Blockchain in Education: Prior Work\n\nThe application of blockchain to academic credential management has been explored in several prototype systems. MIT's Digital Diploma project (Blockcerts, 2016) was among the first to issue blockchain-anchored digital diplomas, using Bitcoin's OP_RETURN transaction field to store credential hashes. The EduCTX platform (Turkanović et al., 2018) proposed a global higher education credit and grading system on a custom XTRABYTES blockchain.\n\nMore recently, Cheng et al. (2022) evaluated Ethereum-based credential systems in the Chinese higher education context, finding that gas costs on the Ethereum mainnet rendered the system economically unviable at scale, and recommending Layer-2 scaling solutions or proof-of-authority sidechains as alternatives.\n\n[Note from supervisor: Please add coverage of Ethereum Layer-2 solutions (Polygon, Optimism) for credential systems published 2023–2025, and the self-sovereign identity (SSI) literature using DID standards. Section 2.3 on Nigerian education context is still missing — please draft this.]`,
      },
      {
        id: 's5-3', title: 'Methodology', wordCount: 1300, status: 'in-progress', approved: false,
        content: `3.1 System Architecture\n\nThe proposed system adopts a hybrid architecture combining a public Ethereum testnet (Sepolia) for credential anchoring with a traditional web application backend for user interaction. This architecture balances the immutability guarantees of a public blockchain with the practical constraints of Nigerian internet infrastructure, where direct blockchain node operation is impractical for most institutions.\n\nThe system comprises four components: (1) an institution portal for credential issuance and revocation; (2) a student wallet application for credential storage and selective disclosure; (3) a verifier portal for instant credential verification; and (4) a smart contract deployed on the Ethereum Sepolia testnet that stores credential hashes and manages access control.\n\n3.2 Smart Contract Design\n\nThe credential smart contract is implemented in Solidity 0.8.20 and stores a mapping from credential IDs to credential hashes (keccak256), issuance timestamps, and revocation status. Credential data is not stored on-chain — only its hash — preserving student privacy while enabling tamper-proof verification. The institution's Ethereum address is used as the authoritative signer; credential validity is verified by checking that the on-chain hash matches the locally presented credential and that the issuer address is whitelisted.\n\n[Remaining sections — 3.3 Privacy Model, 3.4 Evaluation Design — are in draft form and will be submitted in the next revision.]`,
      },
      { id: 's5-4', title: 'Implementation',    wordCount: 0,    status: 'not-started',approved: false  },
      { id: 's5-5', title: 'Results',           wordCount: 0,    status: 'not-started',approved: false  },
      { id: 's5-6', title: 'Conclusion',        wordCount: 0,    status: 'not-started',approved: false  },
    ],
    analyses: [],
    feedbackThreads: [
      {
        id: 'ft5-1', subject: 'Literature Review — Source Coverage', resolved: false,
        messages: [
          { author: 'Dr. Ogundimu', isStudent: false, timestamp: 'May 22, 14:00', text: 'Your literature review is coming along nicely. I\'d like you to expand coverage of Ethereum-based academic systems — the current draft focuses mainly on Hyperledger. Also check the similarity score on Section 2.3, it seems higher than usual.' },
          { author: 'Ngozi Adeyemi',isStudent: true,  timestamp: 'May 23, 10:30', text: 'Thank you! I will add more on Ethereum and EduCTX. Regarding Section 2.3, I was summarising two papers very closely — I will rephrase those paragraphs and add proper citations.' },
        ],
      },
    ],
    alerts: [
      { id: 'al5-1', type: 'deadline', message: 'Final report deadline is 30 May 2026 — 5 days remaining.', timestamp: 'May 25, 2026', read: false },
    ],
  },

  {
    id: '6', name: 'Taiwo Bakare', email: 't.bakare@uni.ac', matricNo: 'CS/22/031',
    degreeLevel: "Master's", department: 'Computer Science', color: 'red',
    projectTitle: 'Graph Neural Networks for Real-Time Fraud Detection',
    stage: 'Methodology', progress: 58,
    similarityIndex: 28, aiDetectionScore: 32, integrityScore: 72,
    complianceStatus: 'Warning',
    wordCount: 13600, targetWordCount: 40000,
    deadline: '2026-03-01', lastActivity: '3 days ago',
    stages: [
      { name: 'Research Proposal',  status: 'completed',       dueDate: '2025-07-01', supervisorApproved: true  },
      { name: 'Literature Review',  status: 'completed',       dueDate: '2025-09-15', supervisorApproved: true  },
      { name: 'Methodology Design', status: 'needs-revision',  dueDate: '2025-11-30', supervisorApproved: false },
      { name: 'Data Collection',    status: 'not-started',     dueDate: '2026-01-15', supervisorApproved: false },
      { name: 'Analysis',           status: 'not-started',     dueDate: '2026-02-01', supervisorApproved: false },
      { name: 'Writing Up',         status: 'not-started',     dueDate: '2026-02-20', supervisorApproved: false },
      { name: 'Final Submission',   status: 'not-started',     dueDate: '2026-03-01', supervisorApproved: false },
    ],
    sections: [
      {
        id: 's6-1', title: 'Chapter 1 — Introduction', wordCount: 3600, status: 'completed', approved: true,
        supervisorComment: 'Good. Solid motivation.',
        content: `1.1 Motivation\n\nFinancial fraud represents one of the most significant economic threats to the global banking and payments industry. The Association of Certified Fraud Examiners (ACFE) 2022 Report to the Nations estimates that organisations lose approximately 5% of annual revenue to fraud, amounting to a projected global loss exceeding $4.7 trillion. In the digital payments ecosystem, transaction fraud — including card-not-present fraud, account takeover, and synthetic identity fraud — has accelerated as commerce migrates online and payment channels proliferate.\n\nTraditional rule-based fraud detection systems, which flag transactions based on manually curated heuristics (spending threshold violations, geographic anomalies, velocity checks), suffer from high false positive rates that degrade customer experience and high false negative rates as fraudsters adapt their behaviour to circumvent known rules. Machine learning approaches — particularly gradient-boosted decision trees and deep neural networks — have substantially improved detection accuracy but struggle with the dynamic, adversarial nature of fraud: fraudsters continuously adapt their strategies in response to deployed detection models.\n\n1.2 Graph Neural Networks for Fraud Detection\n\nFinancial transactions are inherently relational: accounts, merchants, devices, and IP addresses form a complex heterogeneous graph in which fraud patterns manifest as structural anomalies — unusual clustering, star-shaped transaction topologies, and coordinated account activity. Graph neural networks (GNNs), which learn node representations by aggregating information from graph neighbourhoods, are uniquely positioned to exploit this relational structure for fraud detection.\n\nThis dissertation investigates the application of graph attention networks (GATs) and graph convolutional networks (GCNs) to real-time transaction fraud detection, framing the problem as a node classification task on a dynamic transaction graph where each node represents a transaction and edges encode shared attributes between transactions (same device, same IP, same merchant category).\n\n1.3 Research Objectives\n\n(RO1) To design a heterogeneous transaction graph construction methodology suitable for real-time fraud detection; (RO2) to evaluate and compare GAT and GCN architectures on class-imbalanced fraud detection benchmarks; (RO3) to develop a class imbalance handling strategy combining oversampling and cost-sensitive learning for GNN training; and (RO4) to assess inference latency to determine feasibility for real-time (< 100ms) deployment.`,
      },
      {
        id: 's6-2', title: 'Chapter 2 — Literature Review', wordCount: 7200, status: 'completed', approved: true,
        supervisorComment: 'Similarity slightly elevated — 3 sections paraphrased very closely.',
        content: `2.1 Machine Learning for Fraud Detection: Historical Development\n\nEarly machine learning approaches to fraud detection employed logistic regression and decision trees on hand-crafted features derived from transaction metadata. The introduction of gradient-boosted decision trees — XGBoost (Chen & Guestrin, 2016) and LightGBM (Ke et al., 2017) — marked a significant performance leap and remain strong baselines against which deep learning approaches must demonstrate clear superiority.\n\nDeep learning approaches including autoencoders for anomaly detection, LSTM networks for sequential transaction modelling, and attention-based models have demonstrated competitive performance, particularly for detecting novel fraud patterns not represented in historical labelled data. Unsupervised and semi-supervised approaches are especially valuable given the perennial challenge of obtaining high-quality fraud labels.\n\n2.2 Graph-Based Fraud Detection\n\nThe application of graph analysis to fraud detection predates graph neural networks: rule-based graph analytics identifying suspicious communities in transaction networks were deployed by major payment processors as early as 2010. Graph neural network approaches gained traction following Wen et al. (2019) who applied GCN to financial statement fraud detection, and Yao et al. (2021) who proposed a heterogeneous GNN for e-commerce transaction fraud at Alibaba.\n\nThe DGFRAUD framework (Liu et al., 2021) introduced a hierarchical attention mechanism for detecting coordinated fraudulent behaviour across multiple relation types simultaneously. GraphConsis (Liu et al., 2020) addressed the inconsistency between graph structure and node features — a common issue in real fraud datasets where legitimate and fraudulent nodes may be locally similar in feature space but distinguishable through neighbourhood aggregation.\n\n2.3 Class Imbalance in Fraud Detection\n\n[Supervisor note: Sections 2.3–2.5 show elevated similarity scores (avg 31%). The text in these sections appears closely paraphrased from a 2022 survey paper on imbalanced learning for fraud detection. Please rewrite these sections using your own synthesis of the cited sources, and ensure all paraphrased claims are properly attributed.]`,
      },
      {
        id: 's6-3', title: 'Chapter 3 — Research Methodology', wordCount: 2800, status: 'needs-revision', approved: false,
        supervisorComment: 'Qualitative design choice not adequately justified. Revise Section 3.2 before resubmission.',
        content: `3.1 Research Paradigm\n\nThis study adopts a quantitative research paradigm grounded in the empirical evaluation tradition of machine learning research. The primary objective is to produce reproducible, statistically rigorous performance comparisons across GNN architectures and class imbalance handling strategies on standardised fraud detection benchmarks.\n\n3.2 Research Design — REQUIRES REVISION\n\n[Current draft — flagged for revision by supervisor]\n\nThe study originally proposed a mixed-methods design incorporating qualitative interviews with fraud analysts to contextualise model outputs. This choice was motivated by a desire to assess the real-world interpretability of GNN-based fraud detection beyond quantitative metrics. However, as the supervisor has noted, this mixed-methods framing is inconsistent with the primarily quantitative and technical nature of the research contribution. Graph neural network fraud detection is fundamentally an empirical ML problem that must be validated through quantitative benchmarking.\n\nRevised approach (to be incorporated in next submission): Section 3.2 will be restructured to present a purely quantitative experimental design. The qualitative component will be retained only as a supplementary interpretability evaluation: two fraud analysts will be asked to assess the quality of GNN explanation outputs (node importance scores) for a sample of flagged transactions. This qualitative component will be framed as a usability evaluation rather than a primary research method.\n\n3.3 Datasets\n\nThe primary benchmark dataset is the IEEE-CIS Fraud Detection dataset (Kaggle, 2019), comprising 590,540 transactions with 433 features and a 3.5% fraud prevalence rate. The secondary benchmark is the PaySim synthetic mobile money transaction dataset (Lopez-Rojas et al., 2016), used to evaluate model generalisation to a different transaction domain. Both datasets are converted to heterogeneous transaction graphs using the construction methodology described in Section 3.4.`,
      },
      { id: 's6-4', title: 'Chapter 4 — System Design',         wordCount: 0,    status: 'not-started',   approved: false                                                                                   },
      { id: 's6-5', title: 'Chapter 5 — Results',               wordCount: 0,    status: 'not-started',   approved: false                                                                                   },
      { id: 's6-6', title: 'Chapter 6 — Discussion & Conclusion',wordCount: 0,   status: 'not-started',   approved: false                                                                                   },
    ],
    analyses: [
      { id: 'an6-1', title: 'GNN Architecture Comparison (GAT vs GCN)', testType: 'Ablation study',    pValue: 0.04, result: 'GAT achieves 93.1% F1 vs GCN\'s 91.4% on synthetic fraud dataset. Difference statistically significant.', aiRecommended: true,  status: 'approved' },
      { id: 'an6-2', title: 'Class Imbalance Handling (SMOTE vs Cost-Sensitive)', testType: 'Comparative', pValue: undefined, result: 'Pending — data collection not yet started.', aiRecommended: false, status: 'pending' },
      { id: 'an6-3', title: 'Similarity Breakdown by Section', testType: 'Plagiarism analysis', pValue: undefined, result: 'Chapter 2, Sections 2.3–2.5 flagged for high similarity (avg 31%). Recommend manual review and rewrite.', aiRecommended: false, status: 'flagged', supervisorNote: 'These sections must be rewritten before methodology can proceed.' },
    ],
    feedbackThreads: [
      {
        id: 'ft6-1', subject: 'Methodology Chapter — Revision Required', resolved: false,
        messages: [
          { author: 'Dr. Ogundimu', isStudent: false, timestamp: 'May 15, 11:00', text: 'Taiwo, I have reviewed Chapter 3 and I cannot approve it in its current state. Section 3.2 does not adequately justify why you chose a qualitative approach for what is fundamentally a quantitative/predictive research problem. GNN-based fraud detection is best validated with empirical benchmarks — please revise your methodology to reflect this.' },
          { author: 'Taiwo Bakare', isStudent: true,  timestamp: 'May 17, 09:25', text: 'I understand. I will restructure Section 3.2 to emphasise the quantitative experimental design and use the qualitative component only for the interpretability analysis. Would that be acceptable?' },
          { author: 'Dr. Ogundimu', isStudent: false, timestamp: 'May 18, 08:40', text: 'Yes, that is the right approach. Make the experimental design primary and qualitative analysis (expert interviews) a supplementary validation. Resubmit by 28 May.' },
          { author: 'Taiwo Bakare', isStudent: true,  timestamp: 'May 22, 15:00', text: 'I have started revising. Should I also address the similarity issues in Chapter 2 at the same time, or submit the methodology revision first?' },
          { author: 'Dr. Ogundimu', isStudent: false, timestamp: 'May 23, 10:00', text: 'Address both together — submit a single revised draft with Chapter 2 similarity issues fixed and Chapter 3 restructured. That way I can do a full compliance review in one pass.' },
        ],
      },
    ],
    alerts: [
      { id: 'al6-1', type: 'analysis-issue',  message: 'Sections 2.3–2.5 flagged: avg similarity 31% — rewrite required.',    timestamp: 'May 15, 2026', read: true  },
      { id: 'al6-2', type: 'overdue',         message: 'Methodology chapter revision was due 30 Nov 2025 — now overdue.',      timestamp: 'May 25, 2026', read: false },
      { id: 'al6-3', type: 'missing-data',    message: 'Data collection has not started — final submission is 1 Mar 2026.',    timestamp: 'May 25, 2026', read: false },
    ],
  },
];
