import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentProfile from '../../pages/StudentProfile';

const MobileStudentProfile = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden ">
            {/* Native-style Mobile Header */}
            <header className="pt-[env(safe-area-inset-top,20px)] h-auto flex flex-col justify-center px-4 bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40 shrink-0">
                <div className="h-16 flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="rounded-full hover:bg-secondary active:scale-90 transition-transform h-10 w-10"
                        >
                            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Button>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-black tracking-tight uppercase leading-none truncate max-w-[150px] sm:max-w-[200px]">
                                Student Insight
                            </h1>
                            <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mt-1 opacity-60">Intelligence Division</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto safe-area-bottom relative">
                <StudentProfile hideLayout={true} />
            </main>
        </div>
    );
};

export default MobileStudentProfile;
