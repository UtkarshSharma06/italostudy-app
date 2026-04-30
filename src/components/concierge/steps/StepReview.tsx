import { Button } from "@/components/ui/button";
import { CheckCircle2, PenSquare } from "lucide-react";

interface StepReviewProps {
    formData: any;
}

export function StepReview({ formData }: StepReviewProps) {

    const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-8 last:border-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> {title}
            </h3>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {children}
            </div>
        </div>
    );

    const Field = ({ label, value }: { label: string, value: any }) => {
        // Safe display for name fields
        const displayValue = (typeof value === 'string' && value.includes('undefined'))
            ? '-'
            : (value || '-');

        return (
            <div className="flex flex-col">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</span>
                <span className="text-slate-900 dark:text-white font-medium">{displayValue}</span>
            </div>
        );
    }

    const p = formData.personal_info || {};
    const a = formData.address_info || {};
    const ac = formData.academic_history || {};
    const ts = formData.test_scores || {};
    const prog = formData.program_info || {};

    const fullName = (p.first_name || p.last_name)
        ? `${p.first_name || ''} ${p.last_name || ''}`.trim()
        : '-';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900 mb-8">
                <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-200 mb-2">Ready to Submit?</h2>
                <p className="text-indigo-700 dark:text-indigo-300 text-sm">
                    Please review your information carefully. Once submitted, our consultants will review your profile and contact you for the next steps.
                </p>
            </div>

            <Section title="Personal Information">
                <Field label="Full Name" value={fullName} />
                <Field label="Email" value={p.email} />
                <Field label="Phone" value={p.phone} />
                <Field label="Nationality" value={p.nationality} />
            </Section>

            <Section title="Address">
                <Field label="Street" value={a.street} />
                <Field label="City" value={a.city} />
                <Field label="State / Country" value={`${a.state || '-'}, ${a.country || '-'}`} />
            </Section>

            <Section title="Academic History">
                {ac.history?.length > 0 ? (
                    ac.history.map((h: any, i: number) => (
                        <div key={i} className="col-span-2 grid md:grid-cols-2 gap-4 pb-4 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0">
                            <Field label="Institution" value={h.institution} />
                            <Field label="Degree" value={h.degree} />
                            <Field label="Start Date" value={h.start_year} />
                            <Field label="End Date" value={h.end_year} />
                            <Field label="Grade" value={h.grade} />
                            <Field label="Field of Study" value={h.field_of_study} />
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 text-slate-400 dark:text-slate-500 italic">No academic history added.</div>
                )}
            </Section>

            <Section title="Test Scores">
                <Field label="English Test" value={ts.english_test_type} />
                <Field label="English Score" value={ts.english_score} />
                <Field label="SAT Score" value={ts.sat_score} />
                <Field label="GMAT/GRE" value={ts.gmat_gre_score} />
            </Section>

            <Section title="Program Preference">
                <Field label="Preferred Country" value={prog.preferred_country} />
                <Field label="Level" value={prog.degree_level} />
                <Field label="Intake" value={prog.intake} />
                <Field label="Major" value={prog.major} />
                <Field
                    label="University Preferences"
                    value={Array.isArray(prog.university_preferences) ? prog.university_preferences.filter(Boolean).join(', ') : prog.university_preferences}
                />
            </Section>
        </div>
    );
}
