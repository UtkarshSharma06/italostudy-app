import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import EditableText from '@/components/cms/EditableText';

interface ClusterHeroProps {
    slug: string;
    getField: (key: string, def: string) => string;
    icon: LucideIcon;
    badgeKey?: string;
    badgeDefault?: string;
    headlineKey?: string;
    headlineDefault?: string;
    descKey?: string;
    descDefault?: string;
}

const ClusterHero: React.FC<ClusterHeroProps> = ({
    slug,
    getField,
    icon: Icon,
    badgeKey = 'authority_badge',
    badgeDefault = 'Official Guide 2026',
    headlineKey = 'hero_headline',
    headlineDefault = 'Study in Italy 2026',
    descKey = 'hero_desc',
    descDefault = 'The definitive roadmap for international students.'
}) => {
    return (
        <header className="relative mb-24 pt-12">
            {/* Background elements for depth */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/20 rounded-full blur-2xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <div className="inline-flex items-center gap-3 bg-white/60 backdrop-blur-md px-6 py-2.5 rounded-full text-xs font-black text-indigo-700 uppercase tracking-[0.2em] border border-white/80 shadow-sm mb-8">
                    <Icon size={16} className="text-indigo-500" />
                    <EditableText fieldKey={badgeKey} as="span">
                        {getField(badgeKey, badgeDefault)}
                    </EditableText>
                </div>

                <EditableText
                    fieldKey={headlineKey}
                    as="h1"
                    className="text-5xl md:text-8xl font-black text-slate-900 mb-10 leading-[0.95] tracking-tight"
                >
                    {getField(headlineKey, headlineDefault)}
                </EditableText>

                <div className="flex flex-col md:flex-row gap-10 items-start">
                    <div className="md:w-2/3">
                        <EditableText
                            fieldKey={descKey}
                            multiline
                            as="p"
                            className="text-xl md:text-3xl text-slate-500 leading-tight font-medium max-w-3xl border-l-4 border-slate-200 pl-8"
                        >
                            {getField(descKey, descDefault)}
                        </EditableText>
                    </div>

                    {/* Floating conversion card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="md:w-1/3 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/10 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 pointer-events-none">
                            <Icon size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Status</div>
                            <div className="text-xl font-black mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                2026 Intake Open
                            </div>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
                                Official MIUR portal for the 2026/27 academic year is now accepting pre-enrollments.
                            </p>
                            <a href="https://www.universitaly.it" target="_blank" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-xs font-black transition-colors w-full justify-center">
                                Portal Access
                            </a>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </header>
    );
};

export default ClusterHero;
