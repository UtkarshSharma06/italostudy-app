import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import { ApplicationStepper, StepNavigation, STEPS } from "@/components/concierge/ApplicationStepper";
import { StepPersonal } from "@/components/concierge/steps/StepPersonal";
import { StepAcademic } from "@/components/concierge/steps/StepAcademic";
import { StepAddress } from "@/components/concierge/steps/StepAddress";
import { StepTestScores } from "@/components/concierge/steps/StepTestScores";
import { StepProgram } from "@/components/concierge/steps/StepProgram";
import { StepReview } from "@/components/concierge/steps/StepReview";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import _ from "lodash";
import { Button } from "@/components/ui/button";

export default function ConciergeApply() {
    const { id } = useParams();
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentStepId, setCurrentStepId] = useState('personal');
    const [formData, setFormData] = useState<any>({});
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);

    // Check subscription tier and redirect if not Global
    useEffect(() => {
        const checkAccess = async () => {
            if (!user) return;

            // Use context profile if available
            const currentProfile = (profile as any);

            if (currentProfile?.role === 'admin' || currentProfile?.role === 'sub_admin' || currentProfile?.role === 'consultant' || currentProfile?.is_consultant ||
                currentProfile?.subscription_tier === 'global' || currentProfile?.selected_plan === 'global') {
                return;
            }

            try {
                // Need to select is_consultant field
                const { data: freshProfile } = await supabase
                    .from('profiles')
                    .select('subscription_tier, selected_plan, role, is_consultant')
                    .eq('id', user.id)
                    .single();

                if (freshProfile?.role === 'admin' || freshProfile?.role === 'sub_admin' || freshProfile?.role === 'consultant' || freshProfile?.is_consultant ||
                    freshProfile?.subscription_tier === 'global' || freshProfile?.selected_plan === 'global') {
                    return;
                }

                navigate('/apply-university/upgrade');
            } catch (error) {
                console.error('Error checking subscription tier:', error);
            }
        };

        checkAccess();
    }, [user, profile, navigate]);

    // Load application data
    useEffect(() => {
        if (!user || !id) return;

        const loadApplication = async () => {
            try {
                const { data, error } = await supabase
                    .from('admission_applications')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (data.application_data) {
                    setFormData(data.application_data as any);
                }

                // Determine completed steps based on data presence
                const completed: string[] = [];
                const d = (data.application_data || {}) as any;
                if (d.personal_info && Object.keys(d.personal_info).length > 0) completed.push('personal');
                if (d.address_info && Object.keys(d.address_info).length > 0) completed.push('address');
                if (d.academic_history?.history?.length > 0) completed.push('academic');
                if (d.test_scores && Object.keys(d.test_scores).length > 0) completed.push('tests');
                if (d.program_info && Object.keys(d.program_info).length > 0) completed.push('program');

                setCompletedSteps(completed);

            } catch (error) {
                console.error('Error loading application:', error);
                toast({
                    title: "Error",
                    description: "Failed to load application data",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadApplication();
    }, [user, id]);

    // Autosave functionality
    const saveApplication = useCallback(async (newData: any) => {
        if (!user || !id) return;
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from('admission_applications')
                .update({
                    application_data: newData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error saving:', error);
            // toast({
            //     title: "Save Failed",
            //     description: "Could not autosave your progress",
            //     variant: "destructive"
            // });
        } finally {
            setIsSaving(false);
        }
    }, [user, id]);

    // Debounced save
    const debouncedSave = useCallback(
        _.debounce((data) => saveApplication(data), 1000),
        [saveApplication]
    );

    const handleDataChange = (section: string, data: any) => {
        const newFormData = {
            ...formData,
            [section]: data
        };
        setFormData(newFormData);
        debouncedSave(newFormData);
    };

    const validateCurrentStep = (): boolean => {
        const data = formData;

        switch (currentStepId) {
            case 'personal':
                const personal = data.personal_info || {};
                if (!personal.first_name?.trim() || !personal.last_name?.trim() ||
                    !personal.email?.trim() || !personal.phone?.trim() ||
                    !personal.date_of_birth || !personal.nationality?.trim()) {
                    toast({
                        title: "Required Fields Missing",
                        description: "Please fill in all required fields in Personal Information",
                        variant: "destructive"
                    });
                    return false;
                }
                break;

            case 'address':
                const address = data.address_info || {};
                if (!address.street?.trim() || !address.city?.trim() ||
                    !address.country?.trim() || !address.postal_code?.trim()) {
                    toast({
                        title: "Required Fields Missing",
                        description: "Please fill in all required fields in Address",
                        variant: "destructive"
                    });
                    return false;
                }
                break;

            case 'academic':
                const academic = data.academic_history || {};
                const history = academic.history || [];
                if (history.length === 0) {
                    toast({
                        title: "Required Fields Missing",
                        description: "Please add at least one academic institution",
                        variant: "destructive"
                    });
                    return false;
                }
                // Check if all entries have required fields
                for (const edu of history) {
                    if (!edu.institution?.trim() || !edu.degree?.trim()) {
                        toast({
                            title: "Required Fields Missing",
                            description: "Please fill in Institution Name and Degree for all academic entries",
                            variant: "destructive"
                        });
                        return false;
                    }
                }
                break;

            case 'program':
                const program = data.program_info || {};
                if (!program.degree_level?.trim() || !program.major?.trim() ||
                    !program.intake?.trim() || !program.preferred_country?.trim()) {
                    toast({
                        title: "Required Fields Missing",
                        description: "Please fill in all required fields in Program Selection",
                        variant: "destructive"
                    });
                    return false;
                }
                break;
        }

        return true;
    };

    const handleNext = () => {
        // Validate current step before proceeding
        if (!validateCurrentStep()) {
            return;
        }

        debouncedSave.flush();
        const currentIndex = STEPS.findIndex(s => s.id === currentStepId);
        if (currentIndex < STEPS.length - 1) {
            const nextStep = STEPS[currentIndex + 1].id;

            // Mark current as complete if it's not already
            if (!completedSteps.includes(currentStepId)) {
                setCompletedSteps([...completedSteps, currentStepId]);
            }

            setCurrentStepId(nextStep);
            window.scrollTo(0, 0);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        try {
            const { error } = await supabase
                .from('admission_applications')
                .update({
                    status: 'submitted',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "Application Submitted",
                description: "Your application has been sent for review!",
            });
            navigate('/apply-university');
        } catch (error) {
            toast({
                title: "Submission Failed",
                description: "Please try again",
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </Layout>
        );
    }

    const renderStep = () => {
        switch (currentStepId) {
            case 'personal':
                return (
                    <StepPersonal
                        data={formData.personal_info || {}}
                        onChange={(data) => handleDataChange('personal_info', data)}
                    />
                );
            case 'address':
                return (
                    <StepAddress
                        data={formData.address_info || {}}
                        onChange={(data) => handleDataChange('address_info', data)}
                    />
                );
            case 'academic':
                return (
                    <StepAcademic
                        data={formData.academic_history || {}}
                        onChange={(data) => handleDataChange('academic_history', data)}
                    />
                );
            case 'tests':
                return (
                    <StepTestScores
                        data={formData.test_scores || {}}
                        onChange={(data) => handleDataChange('test_scores', data)}
                    />
                );
            case 'program':
                return (
                    <StepProgram
                        data={formData.program_info || {}}
                        onChange={(data) => handleDataChange('program_info', data)}
                    />
                );
            case 'review':
                return (
                    <StepReview formData={formData} />
                );
            default:
                return (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                            Step not found
                        </p>
                    </div>
                );
        }
    };

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStepId);

    return (
        <Layout>
            <div className="container mx-auto px-6 py-12 max-w-5xl">
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                            Admission <span className="text-indigo-600">Protocol</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">
                                Application Reference: {id?.substring(0, 8)}
                            </p>
                            {isSaving && (
                                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest animate-pulse">
                                    Saving...
                                </span>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => {
                            debouncedSave.flush();
                            toast({ title: "Draft Saved", description: "Your progress has been saved securely." });
                        }}
                        className="w-full md:w-auto border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        Save Draft
                    </Button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <div className="mb-10 border-b border-slate-100 dark:border-slate-800 pb-8">
                        <ApplicationStepper
                            currentStepId={currentStepId}
                            onStepChange={setCurrentStepId}
                            completedSteps={completedSteps}
                        />
                    </div>

                    <div className="min-h-[400px]">
                        {renderStep()}
                    </div>

                    <StepNavigation
                        onNext={handleNext}
                        onBack={currentStepIndex > 0 ? () => {
                            setCurrentStepId(STEPS[currentStepIndex - 1].id);
                        } : undefined}
                        isLastStep={currentStepIndex === STEPS.length - 1}
                        canNavigateNext={true}
                    />
                </div>
            </div>
        </Layout>
    );
}
