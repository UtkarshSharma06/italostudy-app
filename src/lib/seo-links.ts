/**
 * SEO Link Registry for Italostudy 2026
 * These clusters help search engines understand the relationship between 
 * authority guides and deep-dive technical pages.
 */

export interface SEOLink {
  title: string;
  href: string;
  description?: string;
}

export const IMAT_CLUSTER: SEOLink[] = [
  { title: "IMAT Syllabus 2026", href: "/imat-syllabus-2026", description: "Detailed topic breakdown for Biology, Chemistry, and Physics." },
  { title: "Exam Dates & Deadlines", href: "/imat-exam-dates-2026", description: "Official Mur timeline for the 2026 intake." },
  { title: "Registration Guide", href: "/imat-registration-2026", description: "Step-by-step Universitaly application process." },
  { title: "Preparation Strategy", href: "/imat-preparation-strategy-2026", description: "How to score 50+ using the authority framework." },
  { title: "Cutoff Trends", href: "/imat-cutoff-trends-2026", description: "Historical scores for all 15+ public universities." },
  { title: "Previous Year Papers", href: "/imat-previous-year-papers-pdf", description: "Download official PDFs from 2011 to 2025." },
];

export const CENTS_CLUSTER: SEOLink[] = [
  { title: "CENT-S Syllabus", href: "/cent-s-syllabus-2026", description: "Mastering the 5-section CISIA structure." },
  { title: "Exam Pattern & Scoring", href: "/cent-s-exam-pattern-2026", description: "Understanding the +1/-0.25 scoring and normalization." },
  { title: "Important Dates", href: "/cent-s-important-dates-2026", description: "Monthly session windows and best times to take the test." },
  { title: "Registration Process", href: "/cent-s-registration-process-2026", description: "CISIA portal guide for international students." },
  { title: "Cutoff Analysis", href: "/cent-s-cutoff-2026", description: "Score requirements for Engineering & Economics." },
  { title: "Passing Score Explained", href: "/cent-s-passing-score-explained", description: "Raw vs Normalized: What you need to succeed." },
];

export const STUDY_IN_ITALY_CLUSTER: SEOLink[] = [
  { title: "University Ranking 2026", href: "/study-in-italy/universities-2026" },
  { title: "Study Without IELTS", href: "/study-in-italy/without-ielts" },
  { title: "Tuition Fees & Scholarships", href: "/study-in-italy/tuition-fees-2026" },
  { title: "How to Apply (Full Cycle)", href: "/study-in-italy/how-to-apply" },
];
