/**
 * Page Content Fields Configuration
 * Defines every editable field for each CENT-S cluster page.
 * - type "text"     → single-line Input
 * - type "textarea" → multi-line Textarea
 * - type "file"     → PDF/doc upload to Cloudinary, stored as URL
 */

export type FieldType = 'text' | 'textarea' | 'file' | 'image' | 'repeater';

export interface ContentField {
    key: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    itemFields?: ContentField[]; // Only for type: 'repeater'
    defaultItems?: Record<string, string>[]; // Default data for repeater items
}

export interface PageDefinition {
    slug: string;
    title: string;
    path: string;
    fields: ContentField[];
}

export const PAGE_CONTENT_DEFINITIONS: PageDefinition[] = [
    {
        slug: 'cent-s-exam-ultimate-guide',
        title: 'CENT-S Ultimate Guide (Pillar)',
        path: '/cent-s-exam-ultimate-guide',
        fields: [
            { key: 'hero_headline', label: 'Hero Headline', type: 'text', placeholder: 'CENT-S 2026 Ultimate Guide' },
            { key: 'hero_subheadline', label: 'Hero Sub-headline', type: 'textarea', placeholder: 'Everything you need to know...' },
            { key: 'overview_body', label: 'Overview Section Body', type: 'textarea' },
            { key: 'stat_applicants', label: 'Stat: Applicants', type: 'text', placeholder: '12,400+' },
            { key: 'stat_seats', label: 'Stat: Seats Available', type: 'text', placeholder: '1,200+' },
            { key: 'stat_acceptance', label: 'Stat: Acceptance Rate', type: 'text', placeholder: '9.7%' },
            { key: 'cta_primary_text', label: 'CTA Primary Button Text', type: 'text', placeholder: 'Start Free Mock Test' },
        ],
    },
    {
        slug: 'cent-s-syllabus-2026',
        title: 'Detailed Syllabus 2026',
        path: '/cent-s-syllabus-2026',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'biology_topics', label: 'Biology Topics (comma-separated)', type: 'textarea' },
            { key: 'chemistry_topics', label: 'Chemistry Topics (comma-separated)', type: 'textarea' },
            { key: 'physics_topics', label: 'Physics / Math Topics (comma-separated)', type: 'textarea' },
            { key: 'general_science_topics', label: 'General Science Topics (comma-separated)', type: 'textarea' },
            { key: 'syllabus_pdf_url', label: 'Syllabus PDF Download (Upload file)', type: 'file' },
        ],
    },
    {
        slug: 'cent-s-previous-year-papers-pdf',
        title: 'Previous Year Papers PDF',
        path: '/cent-s-previous-year-papers-pdf',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'paper_2025_url', label: '2025 Paper PDF (Upload file)', type: 'file' },
            { key: 'paper_2024_url', label: '2024 Paper PDF (Upload file)', type: 'file' },
            { key: 'paper_2023_url', label: '2023 Paper PDF (Upload file)', type: 'file' },
            { key: 'paper_2022_url', label: '2022 Paper PDF (Upload file)', type: 'file' },
            { key: 'answer_key_2025_url', label: '2025 Answer Key PDF (Upload file)', type: 'file' },
        ],
    },
    {
        slug: 'cent-s-exam-pattern-2026',
        title: 'Exam Pattern & Scoring',
        path: '/cent-s-exam-pattern-2026',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'total_questions', label: 'Total Questions', type: 'text', placeholder: '60 MCQ' },
            { key: 'duration', label: 'Duration', type: 'text', placeholder: '90 Minutes' },
            { key: 'marks_correct', label: 'Marks per Correct Answer', type: 'text', placeholder: '+4.0 Points' },
            { key: 'marks_wrong', label: 'Marks per Wrong Answer', type: 'text', placeholder: '-1.0 Points' },
            { key: 'expert_strategy', label: 'Expert Strategy Quote', type: 'textarea' },
        ],
    },
    {
        slug: 'cent-s-cutoff-2026',
        title: 'Cutoff Trends',
        path: '/cent-s-cutoff-2026',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'safe_score_2026', label: 'Predicted Safe Score 2026', type: 'text', placeholder: '620+' },
            { key: 'cutoff_2025', label: 'Cutoff 2025', type: 'text', placeholder: '585' },
            { key: 'cutoff_2024', label: 'Cutoff 2024', type: 'text', placeholder: '558' },
            { key: 'cutoff_2023', label: 'Cutoff 2023', type: 'text', placeholder: '512' },
            { key: 'cutoff_2022', label: 'Cutoff 2022', type: 'text', placeholder: '482' },
            { key: 'strategy_quote', label: 'Strategy Section Quote', type: 'textarea' },
        ],
    },
    {
        slug: 'cent-s-mock-test-free-2026',
        title: 'Free Mock Test',
        path: '/cent-s-mock-test-free-2026',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'total_mocks', label: 'Total Mocks Available', type: 'text', placeholder: '25+ Tests' },
            { key: 'strategy_body', label: 'Strategy Section Body', type: 'textarea' },
        ],
    },
    {
        slug: 'cent-s-preparation-strategy-2026',
        title: 'Preparation Strategy',
        path: '/cent-s-preparation-strategy-2026',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'phase1_detail', label: 'Phase 1 Detail', type: 'textarea' },
            { key: 'phase2_detail', label: 'Phase 2 Detail', type: 'textarea' },
            { key: 'phase3_detail', label: 'Phase 3 Detail', type: 'textarea' },
            { key: 'biology_hack', label: 'Biology Expert Hack', type: 'textarea' },
            { key: 'chemistry_hack', label: 'Chemistry Expert Hack', type: 'textarea' },
            { key: 'physics_hack', label: 'Physics/Math Expert Hack', type: 'textarea' },
        ],
    },
    {
        slug: 'best-books-for-cent-s-2026',
        title: 'Best Books For CEnT-S 2026',
        path: '/best-books-for-cent-s-2026',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_desc', label: 'Page Description', type: 'textarea' },
            {
                key: 'book_list',
                label: 'Books Selection',
                type: 'repeater',
                itemFields: [
                    { key: 'img', label: 'Book Image', type: 'image' },
                    { key: 'title', label: 'Book Title', type: 'text' },
                    { key: 'sub', label: 'Subject/Tag', type: 'text' },
                    { key: 'high', label: 'Highlight Label', type: 'text' },
                    { key: 'desc', label: 'Description', type: 'textarea' },
                    { key: 'link', label: 'Link URL', type: 'text' },
                    { key: 'btn', label: 'Button Text', type: 'text' },
                ],
                defaultItems: [
                    {
                        title: "AlphaTest Medicine (Italian Edition)",
                        sub: "All-in-One",
                        high: "The Gold Standard",
                        desc: "The most comprehensive resource for Italian medical entrance. Essential for understanding the specific 'format logic' used in CISIA exams.",
                        btn: "Check Price"
                    },
                    {
                        title: "Editest Preparation Manual",
                        sub: "Concept Theory",
                        high: "Deep Theory",
                        desc: "Best for building a strong foundation in Biology and Organic Chemistry. Includes extensive diagrams and step-by-step mechanism explanations.",
                        btn: "Check Price"
                    },
                    {
                        title: "Cambridge International AS & A Level Biology",
                        sub: "Biology",
                        high: "English Resource",
                        desc: "Exceptional for non-Italian speakers. Covers 90% of the CENT-S biology syllabus with high-clarity English terminology.",
                        btn: "Check Price"
                    },
                    {
                        title: "Unitutor Medicine (Zanichelli)",
                        sub: "Question Bank",
                        high: "Practice King",
                        desc: "Contains over 5000 simulation questions. Their online platform is excellent for tracking progress across different scientific domains.",
                        btn: "Check Price"
                    }
                ]
            },
            { key: 'expert_desc', label: 'Expert Recommendation', type: 'textarea' },
        ],
    },
    {
        slug: 'imat-best-books-2026',
        title: 'Best Books For IMAT 2026',
        path: '/imat-best-books-2026',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_desc', label: 'Page Description', type: 'textarea' },
            {
                key: 'book_list',
                label: 'Books Selection',
                type: 'repeater',
                itemFields: [
                    { key: 'img', label: 'Book Image', type: 'image' },
                    { key: 'title', label: 'Book Title', type: 'text' },
                    { key: 'sub', label: 'Subject/Tag', type: 'text' },
                    { key: 'high', label: 'Highlight Label', type: 'text' },
                    { key: 'desc', label: 'Description', type: 'textarea' },
                    { key: 'link', label: 'Link URL', type: 'text' },
                    { key: 'btn', label: 'Button Text', type: 'text' },
                ],
                defaultItems: [
                    {
                        title: "Pearson Biology/Chemistry (AS & A Level)",
                        sub: "Science Core",
                        high: "The Gold Standard",
                        desc: "The official choice for scientific depth. IMAT science stays very close to the Cambridge A-Level curriculum, making these Pearson editions indispensable for conceptual clarity.",
                        btn: "Check Price"
                    },
                    {
                        title: "The Ultimate BMAT Guide",
                        sub: "Section 1",
                        high: "Logic Master",
                        desc: "Since IMAT Section 1 is derivative of BMAT, this guide is the primary resource for mastering critical thinking and problem-solving techniques.",
                        btn: "Check Price"
                    },
                    {
                        title: "1200 IMAT Practice Questions",
                        sub: "Question Bank",
                        high: "Practice King",
                        desc: "Specifically calibrated to current IMAT difficulty levels. Essential for the last 60 days of preparation to build speed.",
                        btn: "Check Price"
                    },
                    {
                        title: "Cambridge AS General Paper",
                        sub: "Global Context",
                        high: "Knowledge Atlas",
                        desc: "Excellent for building the breadth required for the General Knowledge section, covering global history, politics, and literature.",
                        btn: "Check Price"
                    }
                ]
            },
        ],
    },
    {
        slug: 'cent-s-eligibility-criteria',
        title: 'Eligibility Criteria',
        path: '/cent-s-eligibility-criteria',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'critical_warning', label: 'Critical Warning Box Text', type: 'textarea' },
            { key: 'eu_quota_description', label: 'EU Quota Description', type: 'textarea' },
            { key: 'non_eu_quota_description', label: 'Non-EU Quota Description', type: 'textarea' },
        ],
    },
    {
        slug: 'cent-s-registration-process-2026',
        title: 'Registration Process',
        path: '/cent-s-registration-process-2026',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'step1_detail', label: 'Step 1 Detail', type: 'textarea' },
            { key: 'step2_detail', label: 'Step 2 Detail', type: 'textarea' },
            { key: 'step3_detail', label: 'Step 3 Detail', type: 'textarea' },
            { key: 'step4_detail', label: 'Step 4 Detail', type: 'textarea' },
            { key: 'checklist_pdf_url', label: 'Registration Checklist PDF (Upload file)', type: 'file' },
            { key: 'priority_window_tip', label: 'Priority Window Tip Body', type: 'textarea' },
        ],
    },
    {
        slug: 'cent-s-important-dates-2026',
        title: 'Important Dates',
        path: '/cent-s-important-dates-2026',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'registration_opens', label: 'Registration Opens Date', type: 'text', placeholder: 'February 2026' },
            { key: 'session1_date', label: 'Session 1 (Spring) Date', type: 'text', placeholder: 'April 2026' },
            { key: 'session2_date', label: 'Session 2 (Summer) Date', type: 'text', placeholder: 'July 2026' },
            { key: 'result_date', label: 'Result Publication Date', type: 'text', placeholder: '15 Days After Exam' },
            { key: 'enrollment_date', label: 'University Enrollment Date', type: 'text', placeholder: 'August - September 2026' },
            { key: 'strategy_tip', label: 'Double Attempt Strategy Tip', type: 'textarea' },
        ],
    },
    {
        slug: 'cent-s-difficulty-level-analysis',
        title: 'Difficulty Level Analysis',
        path: '/cent-s-difficulty-level-analysis',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'biology_difficulty_desc', label: 'Biology Difficulty Description', type: 'textarea' },
            { key: 'chemistry_difficulty_desc', label: 'Chemistry Difficulty Description', type: 'textarea' },
            { key: 'physics_difficulty_desc', label: 'Physics Difficulty Description', type: 'textarea' },
            { key: 'mathematics_difficulty_desc', label: 'Mathematics Difficulty Description', type: 'textarea' },
            { key: 'normalization_tip', label: 'Normalization Guide Text', type: 'textarea' },
        ],
    },
    {
        slug: 'cent-s-passing-score-explained',
        title: 'Passing Score Explained',
        path: '/cent-s-passing-score-explained',
        fields: [
            { key: 'hero_headline', label: 'Page Headline', type: 'text' },
            { key: 'hero_subheadline', label: 'Page Sub-headline', type: 'textarea' },
            { key: 'min_qualifying_score', label: 'Minimum Qualifying Score', type: 'text', placeholder: '380 Points' },
            { key: 'tier2_minimum', label: 'Tier 2 University Minimum', type: 'text', placeholder: '520+' },
            { key: 'tier1_minimum', label: 'Tier 1 University Minimum', type: 'text', placeholder: '610+' },
            { key: 'normalization_body', label: 'Normalization Effect Body', type: 'textarea' },
            { key: 'score_validity_warning', label: 'Score Validity Warning', type: 'textarea' },
        ],
    },
];
