import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import EditableText from '@/components/cms/EditableText';

interface FooterLink {
    key: string;
    label: string;
    path: string;
}

interface AuthorityFooterProps {
    links: FooterLink[];
    getField: (key: string, defaultValue: string) => string;
    title?: string;
}

const AuthorityFooter: React.FC<AuthorityFooterProps> = ({ links, getField, title = 'Continue Strengthening Your Authority 📚' }) => {
    return (
        <section className="pt-20 border-t border-slate-200">
            <EditableText fieldKey="internal_links_title" as="h3" className="text-2xl font-black text-slate-900 mb-8">
                {getField('internal_links_title', title)}
            </EditableText>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {links.map((link, i) => (
                    <Link
                        key={i}
                        to={link.path}
                        className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-600 transition-colors flex items-center justify-between"
                    >
                        <EditableText fieldKey={`link_label_${link.key}`} as="span" className="font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                            {getField(`link_label_${link.key}`, link.label)}
                        </EditableText>
                        <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </Link>
                ))}
            </div>
        </section>
    );
};

export default AuthorityFooter;
