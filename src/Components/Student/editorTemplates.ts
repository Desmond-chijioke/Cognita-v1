export type ProjectType =
  | 'Thesis'
  | 'Dissertation'
  | 'Research Proposal'
  | 'Progress Report'
  | 'Final Report'
  | 'Journal Article'
  | 'Review Article'
  | 'Conference Paper'
  | 'Grant Proposal';

export const PROJECT_TYPES: ProjectType[] = [
  'Thesis',
  'Dissertation',
  'Research Proposal',
  'Progress Report',
  'Final Report',
  'Journal Article',
  'Review Article',
  'Conference Paper',
  'Grant Proposal',
];

export type SectionStatus = 'not-started' | 'in-progress' | 'completed' | 'needs-revision';

export interface EditorSection {
  id: string;
  key: string;
  title: string;
  mandatory: boolean;
  placeholder: string;
  content: string;
  status: SectionStatus;
  wordCount: number;
  supervisorComment?: string;
}

interface TemplateSection {
  key: string;
  title: string;
  mandatory: boolean;
  placeholder: string;
}

const T: Record<ProjectType, TemplateSection[]> = {
  'Thesis': [
    { key: 'title',         title: 'Title',                        mandatory: true,  placeholder: 'Enter your thesis title and subtitle.' },
    { key: 'abstract',      title: 'Abstract',                     mandatory: true,  placeholder: 'Summarise your research in 200–350 words.' },
    { key: 'acknowledge',   title: 'Acknowledgements',             mandatory: false, placeholder: 'Acknowledge supervisors, funding bodies, and colleagues.' },
    { key: 'toc',           title: 'Table of Contents',            mandatory: true,  placeholder: 'List chapters, sections, and page numbers.' },
    { key: 'introduction',  title: 'Chapter 1: Introduction',      mandatory: true,  placeholder: 'Introduce the research context, problem, and objectives.' },
    { key: 'lit_review',    title: 'Chapter 2: Literature Review', mandatory: true,  placeholder: 'Review relevant literature and theoretical frameworks.' },
    { key: 'methodology',   title: 'Chapter 3: Methodology',       mandatory: true,  placeholder: 'Research design, data collection, and analysis methods.' },
    { key: 'results',       title: 'Chapter 4: Results',           mandatory: true,  placeholder: 'Present your findings with tables and figures.' },
    { key: 'discussion',    title: 'Chapter 5: Discussion',        mandatory: true,  placeholder: 'Interpret results relative to research questions and literature.' },
    { key: 'conclusion',    title: 'Chapter 6: Conclusion',        mandatory: true,  placeholder: 'Summarise contributions, limitations, and future work.' },
    { key: 'references',    title: 'References',                   mandatory: true,  placeholder: 'List all cited sources in your chosen citation style.' },
    { key: 'appendices',    title: 'Appendices',                   mandatory: false, placeholder: 'Supplementary materials, raw data, survey instruments.' },
  ],
  'Dissertation': [
    { key: 'title',         title: 'Title Page',                      mandatory: true,  placeholder: 'Full title, your name, institution, and submission date.' },
    { key: 'abstract',      title: 'Abstract',                        mandatory: true,  placeholder: 'Concise summary of the problem, methods, and findings (300 words).' },
    { key: 'acknowledge',   title: 'Acknowledgements',                mandatory: false, placeholder: 'Thank supervisors, participants, and funding sources.' },
    { key: 'introduction',  title: 'Introduction',                    mandatory: true,  placeholder: 'Research background, problem statement, aims, and scope.' },
    { key: 'lit_review',    title: 'Literature Review',               mandatory: true,  placeholder: 'Critical review of existing research and theoretical frameworks.' },
    { key: 'methodology',   title: 'Research Methodology',            mandatory: true,  placeholder: 'Research philosophy, design, sampling, and data collection.' },
    { key: 'findings',      title: 'Findings',                        mandatory: true,  placeholder: 'Present data findings objectively without interpretation.' },
    { key: 'discussion',    title: 'Analysis & Discussion',           mandatory: true,  placeholder: 'Analyse findings in context of the literature.' },
    { key: 'conclusion',    title: 'Conclusion & Recommendations',    mandatory: true,  placeholder: 'Conclusions drawn and practical recommendations.' },
    { key: 'references',    title: 'References',                      mandatory: true,  placeholder: 'Full reference list in the required citation format.' },
    { key: 'appendices',    title: 'Appendices',                      mandatory: false, placeholder: 'Survey instruments, interview transcripts, ethical approval.' },
  ],
  'Research Proposal': [
    { key: 'title',         title: 'Title',                           mandatory: true,  placeholder: 'Proposed research title.' },
    { key: 'abstract',      title: 'Abstract / Summary',              mandatory: true,  placeholder: 'Brief overview of the proposed research (150–250 words).' },
    { key: 'introduction',  title: 'Introduction & Background',       mandatory: true,  placeholder: 'Context and significance of the proposed research.' },
    { key: 'problem',       title: 'Problem Statement',               mandatory: true,  placeholder: 'Clear articulation of the research gap or problem.' },
    { key: 'objectives',    title: 'Objectives',                      mandatory: true,  placeholder: 'Specific, measurable research objectives.' },
    { key: 'research_qs',   title: 'Research Questions / Hypotheses', mandatory: true,  placeholder: 'Questions or hypotheses guiding the study.' },
    { key: 'lit_review',    title: 'Literature Review',               mandatory: true,  placeholder: 'Literature establishing the theoretical foundation.' },
    { key: 'methodology',   title: 'Methodology',                     mandatory: true,  placeholder: 'Planned research design and data analysis approach.' },
    { key: 'timeline',      title: 'Timeline / Work Plan',            mandatory: true,  placeholder: 'Gantt chart or milestone schedule for the project.' },
    { key: 'budget',        title: 'Budget',                          mandatory: false, placeholder: 'Itemised research budget with justification.' },
    { key: 'references',    title: 'References',                      mandatory: true,  placeholder: 'References cited in the proposal.' },
  ],
  'Progress Report': [
    { key: 'cover',         title: 'Cover Page',                      mandatory: true,  placeholder: 'Project title, student name, supervisor, reporting period.' },
    { key: 'abstract',      title: 'Executive Summary',               mandatory: true,  placeholder: 'Brief summary of progress and key achievements (1 page).' },
    { key: 'introduction',  title: 'Introduction',                    mandatory: true,  placeholder: 'Remind the reader of project aims and scope.' },
    { key: 'work_done',     title: 'Work Completed',                  mandatory: true,  placeholder: 'Tasks completed during the reporting period.' },
    { key: 'results',       title: 'Results & Findings',              mandatory: true,  placeholder: 'Preliminary findings obtained so far.' },
    { key: 'challenges',    title: 'Challenges Encountered',          mandatory: true,  placeholder: 'Problems faced and how they were addressed.' },
    { key: 'next_steps',    title: 'Next Steps / Plan',               mandatory: true,  placeholder: 'Planned activities for the next reporting period.' },
    { key: 'references',    title: 'References',                      mandatory: false, placeholder: 'Any references cited in this report.' },
  ],
  'Final Report': [
    { key: 'cover',         title: 'Cover Page',                      mandatory: true,  placeholder: 'Project title, author, institution, date.' },
    { key: 'abstract',      title: 'Executive Summary',               mandatory: true,  placeholder: 'Concise overview of the project and key outcomes.' },
    { key: 'introduction',  title: 'Introduction',                    mandatory: true,  placeholder: 'Project background, objectives, and scope.' },
    { key: 'background',    title: 'Background',                      mandatory: true,  placeholder: 'Literature and context that informed the project.' },
    { key: 'methodology',   title: 'Methodology',                     mandatory: true,  placeholder: 'Methods and processes used throughout the project.' },
    { key: 'results',       title: 'Results & Findings',              mandatory: true,  placeholder: 'What was discovered or produced.' },
    { key: 'discussion',    title: 'Discussion',                      mandatory: true,  placeholder: 'Interpretation and implications of findings.' },
    { key: 'conclusion',    title: 'Conclusion & Recommendations',    mandatory: true,  placeholder: 'Final conclusions and practical recommendations.' },
    { key: 'references',    title: 'References',                      mandatory: true,  placeholder: 'All cited works.' },
    { key: 'appendices',    title: 'Appendices',                      mandatory: false, placeholder: 'Supporting data, code, or instruments.' },
  ],
  'Journal Article': [
    { key: 'title',         title: 'Title',                           mandatory: true,  placeholder: 'Concise and informative title (10–15 words).' },
    { key: 'abstract',      title: 'Abstract',                        mandatory: true,  placeholder: 'Structured abstract: Background, Methods, Results, Conclusion (250 words).' },
    { key: 'keywords',      title: 'Keywords',                        mandatory: true,  placeholder: '5–8 keywords relevant to the study.' },
    { key: 'introduction',  title: 'Introduction',                    mandatory: true,  placeholder: 'Research background, gap, objectives, and contribution.' },
    { key: 'methodology',   title: 'Methods',                         mandatory: true,  placeholder: 'Study design, participants, materials, procedures, and analysis.' },
    { key: 'results',       title: 'Results',                         mandatory: true,  placeholder: 'Findings presented objectively with statistical detail.' },
    { key: 'discussion',    title: 'Discussion',                      mandatory: true,  placeholder: 'Interpret findings relative to prior work; state limitations.' },
    { key: 'conclusion',    title: 'Conclusion',                      mandatory: true,  placeholder: 'Key takeaways and implications for the field.' },
    { key: 'acknowledge',   title: 'Acknowledgements',                mandatory: false, placeholder: 'Funding, ethical approvals, contributions.' },
    { key: 'references',    title: 'References',                      mandatory: true,  placeholder: 'Formatted reference list.' },
  ],
  'Review Article': [
    { key: 'title',         title: 'Title',                           mandatory: true,  placeholder: 'Descriptive title indicating the scope of the review.' },
    { key: 'abstract',      title: 'Abstract',                        mandatory: true,  placeholder: 'Review objectives, methods, and key findings (200–300 words).' },
    { key: 'keywords',      title: 'Keywords',                        mandatory: true,  placeholder: '5–8 subject keywords.' },
    { key: 'introduction',  title: 'Introduction',                    mandatory: true,  placeholder: 'Scope, importance, and objectives of the review.' },
    { key: 'methodology',   title: 'Methods (Search Strategy)',       mandatory: true,  placeholder: 'Databases searched, inclusion/exclusion criteria, PRISMA diagram.' },
    { key: 'results',       title: 'Results (Literature Overview)',   mandatory: true,  placeholder: 'Summarise and synthesise the included studies.' },
    { key: 'discussion',    title: 'Discussion',                      mandatory: true,  placeholder: 'Themes, contradictions, and gaps in the literature.' },
    { key: 'conclusion',    title: 'Conclusion',                      mandatory: true,  placeholder: 'Contribution of the review and future research directions.' },
    { key: 'references',    title: 'References',                      mandatory: true,  placeholder: 'All reviewed and cited works.' },
  ],
  'Conference Paper': [
    { key: 'title',         title: 'Title',                           mandatory: true,  placeholder: 'Short, impactful title (≤ 15 words).' },
    { key: 'abstract',      title: 'Abstract',                        mandatory: true,  placeholder: 'Compact summary: motivation, approach, results (150–250 words).' },
    { key: 'keywords',      title: 'Keywords',                        mandatory: true,  placeholder: '4–6 keywords for indexing.' },
    { key: 'introduction',  title: 'Introduction',                    mandatory: true,  placeholder: 'Motivation, problem statement, contributions, and paper structure.' },
    { key: 'background',    title: 'Background / Related Work',       mandatory: true,  placeholder: 'Prior work and how this paper extends or differs.' },
    { key: 'methodology',   title: 'Methodology / Approach',          mandatory: true,  placeholder: 'Your proposed method, system, or framework.' },
    { key: 'evaluation',    title: 'Experiments / Evaluation',        mandatory: true,  placeholder: 'Experimental setup, datasets, and evaluation metrics.' },
    { key: 'results',       title: 'Results',                         mandatory: true,  placeholder: 'Quantitative and qualitative results with comparisons.' },
    { key: 'conclusion',    title: 'Conclusion',                      mandatory: true,  placeholder: 'Summary and future directions.' },
    { key: 'references',    title: 'References',                      mandatory: true,  placeholder: 'Formatted references (venue style).' },
  ],
  'Grant Proposal': [
    { key: 'title',         title: 'Project Title',                   mandatory: true,  placeholder: 'Clear, compelling project title.' },
    { key: 'abstract',      title: 'Executive Summary',               mandatory: true,  placeholder: 'What you propose, why it matters, and how you will do it (1 page max).' },
    { key: 'need',          title: 'Statement of Need',               mandatory: true,  placeholder: 'Evidence-based case for why this project is necessary.' },
    { key: 'objectives',    title: 'Goals & Objectives',              mandatory: true,  placeholder: 'SMART goals and measurable objectives.' },
    { key: 'methodology',   title: 'Methods & Activities',            mandatory: true,  placeholder: 'Detailed activities, roles, and approaches.' },
    { key: 'evaluation',    title: 'Evaluation Plan',                 mandatory: true,  placeholder: 'How you will measure and report on outcomes.' },
    { key: 'capability',    title: 'Organisational Capability',       mandatory: true,  placeholder: 'Team qualifications, track record, and institutional support.' },
    { key: 'budget',        title: 'Budget Justification',            mandatory: true,  placeholder: 'Itemised budget with clear justification for each cost.' },
    { key: 'timeline',      title: 'Timeline',                        mandatory: true,  placeholder: 'Project phases and milestones.' },
    { key: 'references',    title: 'References',                      mandatory: false, placeholder: 'Supporting literature.' },
  ],
};

// Stable, deterministic id per (project type, template key) — NOT random.
// This is what lets saved drafts/submissions (keyed by section_id in the DB)
// reconnect to the right section every time the template is rebuilt, whether
// that's on page reload or when switching project types and back.
function typeSlug(type: ProjectType): string {
  return type.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

export function templateSectionId(type: ProjectType, key: string): string {
  return `${typeSlug(type)}__${key}`;
}

export function buildSections(type: ProjectType): EditorSection[] {
  return T[type].map(t => ({
    ...t,
    id: templateSectionId(type, t.key),
    content: '',
    status: 'not-started' as SectionStatus,
    wordCount: 0,
  }));
}

export function mapSections(
  oldSections: EditorSection[],
  newType: ProjectType,
): EditorSection[] {
  const newSecs = buildSections(newType);
  return newSecs.map(ns => {
    const match = oldSections.find(
      os => os.key === ns.key ||
        os.title.toLowerCase() === ns.title.toLowerCase()
    );
    if (match?.content) {
      return {
        ...ns,
        content:   match.content,
        status:    'in-progress' as SectionStatus,
        wordCount: match.content.trim().split(/\s+/).filter(Boolean).length,
      };
    }
    return ns;
  });
}
