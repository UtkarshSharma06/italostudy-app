import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Grid, ChevronRight, Star, BookOpen, TrendingUp, Globe } from 'lucide-react';

interface KnowledgeHubSidebarProps {
    examType: 'imat' | 'cents' | 'study-italy';
}

import { imatLinks, centsLinks, studyItalyLinks } from '@/lib/nav-links';


const KnowledgeHubSidebar: React.FC<KnowledgeHubSidebarProps> = ({ examType }) => {
    let links = imatLinks;
    let title = "IMAT Knowledge Hub";
    let authorityDesc = "This guide is maintained by medical admissions experts with years of experience navigating the Italian medical school registration process.";

    // Determine paths for fast links
    const getDatesPath = () => {
        if (examType === 'imat') return "/imat-exam-dates-2026";
        if (examType === 'cents') return "/cent-s-important-dates-2026";
        return "/study-in-italy/how-to-apply"; // Default for study-italy
    };

    const getPapersPath = () => {
        if (examType === 'imat') return "/imat-previous-year-papers-pdf";
        if (examType === 'cents') return "/cent-s-previous-year-papers-pdf";
        return "/study-in-italy/guide-2026"; // Default for study-italy
    };

    const getStrategyPath = () => {
        if (examType === 'imat') return "/imat-preparation-strategy-2026";
        if (examType === 'cents') return "/cent-s-preparation-strategy-2026";
        return "/study-in-italy/guide-2026"; // Default for study-italy
    };

    if (examType === 'cents') {
        links = centsLinks;
        title = "CENT-S Knowledge Hub";
        authorityDesc = "This guide is compiled by educational researchers with specific expertise in Italian common science entrance tests.";
    } else if (examType === 'study-italy') {
        links = studyItalyLinks;
        title = "Study Italy Hub";
        authorityDesc = "This content is verified by education consultants specializing in Italian university admissions for international students.";
    }

    const isStaticPath = (path: string) => {
        return ['/method', '/exams', '/imat', '/cent-s', '/contact'].includes(path) || 
               path.startsWith('/cent-s-') || 
               path.startsWith('/best-books-for-cent-s-') ||
               path.startsWith('/imat-') ||
               path.startsWith('/tolc-') ||
               path.startsWith('/til-i-') ||
               path.startsWith('/study-in-italy');
    };

    const renderLink = (path: string, label: React.ReactNode, className: string, key?: any) => {
        const isStatic = isStaticPath(path);
        if (isStatic) {
            return (
                <a key={key} href={path} className={className}>
                    {label}
                </a>
            );
        }
        return (
            <Link key={key} to={path} className={className}>
                {label}
            </Link>
        );
    };

    return (
        <div className="sticky top-[80px] space-y-8">
            {/* Main Knowledge Hub Links */}
            <Card className="p-8 border-slate-900 border-2 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] rounded-[2rem]">
                <h4 className="text-xl font-black mb-6 flex items-center gap-2">
                    <Grid className="text-indigo-600" />
                    {title}
                </h4>
                <div className="space-y-1">
                    {links.map((link, i) => (
                        renderLink(
                            link.path,
                            <>
                                <span>{link.label}</span>
                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </>,
                            "flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50 group font-bold text-slate-600 hover:text-indigo-600 transition-all text-sm",
                            i
                        )
                    ))}
                </div>
            </Card>

            {/* Fast Links */}
            <Card className="p-8 border-slate-100 shadow-sm bg-slate-900 text-white">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Fast Links</h4>
                <div className="space-y-4">
                    {renderLink(
                        getDatesPath(),
                        <>
                            <Star size={18} className="text-slate-400 group-hover:text-white" />
                            <span className="text-sm font-bold border-b border-white/10 pb-1">Important Info</span>
                        </>,
                        "flex items-center gap-3 group"
                    )}
                    {renderLink(
                        getPapersPath(),
                        <>
                            <BookOpen size={18} className="text-slate-400 group-hover:text-white" />
                            <span className="text-sm font-bold border-b border-white/10 pb-1">Resources</span>
                        </>,
                        "flex items-center gap-3 group"
                    )}
                    {renderLink(
                        getStrategyPath(),
                        <>
                            <TrendingUp size={18} className="text-slate-400 group-hover:text-white" />
                            <span className="text-sm font-bold border-b border-white/10 pb-1">{examType.replace('-', ' ').toUpperCase()} Roadmap</span>
                        </>,
                        "flex items-center gap-3 group"
                    )}
                </div>
            </Card>

            {/* Authority Badge */}
            <div className="p-8 rounded-[2rem] bg-indigo-50 border border-indigo-100 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Star className="text-indigo-600" fill="currentColor" />
                </div>
                <div className="font-black text-indigo-900 text-xl mb-2">ItaloStudy Authority</div>
                <p className="text-indigo-700/70 text-sm font-medium leading-relaxed">
                    {authorityDesc}
                </p>
            </div>
        </div>
    );
};

export default KnowledgeHubSidebar;
