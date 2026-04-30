import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobilePageContainerProps {
    children: React.ReactNode;
    title?: string;
    showBack?: boolean;
}

const MobilePageContainer: React.FC<MobilePageContainerProps> = ({
    children,
    title,
    showBack = true
}) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-full bg-background pb-20">
            {/* Native-Style Mobile Header */}
            <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {showBack && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="rounded-full hover:bg-secondary active:scale-90 transition-transform"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                    )}
                    {title && (
                        <h1 className="text-lg font-black tracking-tight uppercase truncate max-w-[200px]">
                            {title}
                        </h1>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full opacity-40">
                        <MoreVertical className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Content Area with optimized padding for mobile */}
            <main className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {children}
            </main>
        </div>
    );
};

export default MobilePageContainer;
