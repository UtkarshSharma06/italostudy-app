import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
    ChevronLeft, ChevronRight, Check, Loader2,
    Save, Sparkles, AlertCircle, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import _ from "lodash";

// Reuse existing step components - they are functional and responsive
import { StepPersonal } from "@/components/concierge/steps/StepPersonal";
import { StepAcademic } from "@/components/concierge/steps/StepAcademic";
import { StepAddress } from "@/components/concierge/steps/StepAddress";
import { StepTestScores } from "@/components/concierge/steps/StepTestScores";
import { StepProgram } from "@/components/concierge/steps/StepProgram";
import { StepReview } from "@/components/concierge/steps/StepReview";

const STEPS = [
    { id: 'personal', label: 'Identity' },
    { id: 'address', label: 'Base' },
    { id: 'academic', label: 'Archive' },
    { id: 'tests', label: 'Metrics' },
    { id: 'program', label: 'Mission' },
    { id: 'review', label: 'Review' }
];

export default function MobileConciergeApply() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentStepId, setCurrentStepId] = useState('personal');
    const [formData, setFormData] = useState<any>({});
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);

    useEffect(() => {
        if (user && id) loadApplication();
    }, [user, id]);

    const loadApplication = async () => {
        try {
            const { data, error } = await supabase
                .from('admission_applications')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data.application_data) setFormData(data.application_data);

            // Reconstruct completion state
            const completed = [];
            const d = data.application_data || {};
            if (d.personal_info) completed.push('personal');
            if (d.address_info) completed.push('address');
            if (d.academic_history) completed.push('academic');
            if (d.test_scores) completed.push('tests');
            if (d.program_info) completed.push('program');
            setCompletedSteps(completed);
        } catch (error) {
            console.error('Error loading application:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveApplication = useCallback(async (newData: any) => {
        if (!user || !id) return;
        setIsSaving(true);
        try {
            await supabase
                .from('admission_applications')
                .update({ application_data: newData, updated_at: new Date().toISOString() })
                .eq('id', id);
        } finally {
            setIsSaving(false);
        }
    }, [user, id]);

    const debouncedSave = useCallback(_.debounce((data) => saveApplication(data), 1000), [saveApplication]);

    const handleDataChange = (section: string, data: any) => {
        const nextData = { ...formData, [section]: data };
        setFormData(nextData);
        debouncedSave(nextData);
    };

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStepId);

    const handleNext = () => {
        if (currentStepIndex < STEPS.length - 1) {
            if (!completedSteps.includes(currentStepId)) setCompletedSteps([...completedSteps, currentStepId]);
            setCurrentStepId(STEPS[currentStepIndex + 1].id);
            window.scrollTo(0, 0);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        try {
            const { error } = await supabase
                .from('admission_applications')
                .update({ status: 'submitted', updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            toast({ title: "Application Submitted", description: "Your information has been sent for review." });
            navigate('/apply-university');
        } catch (error) {
            toast({ title: "Submission Failed", variant: "destructive" });
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-screen bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-background pb-32">
            {/* Native Protocol Header */}
            <header className="p-6 pt-10 sticky top-0 bg-background/80 backdrop-blur-xl z-50 border-b border-border/40">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => navigate('/apply-university')} className="p-2 -ml-2"><ChevronLeft /></button>
                    <div className="text-center">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">University Application</h2>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Ref: {id?.substring(0, 8)}</p>
                    </div>
                    <div className="w-10 flex justify-end">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-primary/40" /> : <Save className="w-4 h-4 text-emerald-500 opacity-40" />}
                    </div>
                </div>

                {/* Vertical Stepper - Mini Version */}
                <div className="flex gap-1.5 h-1">
                    {STEPS.map((step, i) => (
                        <div key={step.id} className={cn(
                            "flex-1 rounded-full transition-all duration-500",
                            i <= currentStepIndex ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" : "bg-secondary"
                        )} />
                    ))}
                </div>
            </header>

            <main className="flex-1 px-6 pt-8 pb-10">
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Step {currentStepIndex + 1} of 6</span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight">{STEPS[currentStepIndex].label} <span className="text-primary">Info</span></h1>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {currentStepId === 'personal' && <StepPersonal data={formData.personal_info || {}} onChange={(d) => handleDataChange('personal_info', d)} />}
                    {currentStepId === 'address' && <StepAddress data={formData.address_info || {}} onChange={(d) => handleDataChange('address_info', d)} />}
                    {currentStepId === 'academic' && <StepAcademic data={formData.academic_history || {}} onChange={(d) => handleDataChange('academic_history', d)} />}
                    {currentStepId === 'tests' && <StepTestScores data={formData.test_scores || {}} onChange={(d) => handleDataChange('test_scores', d)} />}
                    {currentStepId === 'program' && <StepProgram data={formData.program_info || {}} onChange={(d) => handleDataChange('program_info', d)} />}
                    {currentStepId === 'review' && <StepReview formData={formData} />}
                </div>
            </main>

            {/* Bottom Nav Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/90 to-transparent pt-12 z-40">
                <div className="flex gap-3">
                    {currentStepIndex > 0 && (
                        <Button
                            variant="secondary"
                            onClick={() => setCurrentStepId(STEPS[currentStepIndex - 1].id)}
                            className="h-14 px-8 rounded-2xl bg-secondary/80 font-black uppercase text-[10px] tracking-widest border border-border/40"
                        >
                            Back
                        </Button>
                    )}
                    <Button
                        onClick={handleNext}
                        className="flex-1 h-14 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20"
                    >
                        {currentStepIndex === STEPS.length - 1 ? 'Submit Application' : 'Proceed'}
                        {currentStepIndex === STEPS.length - 1 ? <Check size={16} /> : <ChevronRight size={16} />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
