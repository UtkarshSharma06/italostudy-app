import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Grid, ChevronRight } from 'lucide-react';
import EditableText from '@/components/cms/EditableText';

interface HubLink {
    key: string;
    label: string;
    path: string;
}

interface KnowledgeHubProps {
    links: HubLink[];
    getField: (key: string, defaultValue: string) => string;
}

const KnowledgeHub: React.FC<KnowledgeHubProps> = ({ links, getField }) => {
    return (
        <Card className="p-8 border-slate-900 border-2 bg-white shadow-xl rounded-[2rem]">
            <EditableText fieldKey="hub_title" as="h4" className="text-xl font-black mb-6 flex items-center gap-2">
                <Grid className="text-indigo-600" />
                {getField('hub_title', 'Knowledge Hub')}
            </EditableText>
            <div className="space-y-1">
                {links.map((link, i) => (
                    <Link
                        key={i}
                        to={link.path}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50 group font-bold text-slate-600 hover:text-indigo-600 transition-all text-sm"
                    >
                        <EditableText fieldKey={`hub_link_${link.key}`} as="span">
                            {getField(`hub_link_${link.key}`, link.label)}
                        </EditableText>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                ))}
            </div>
        </Card>
    );
};

export default KnowledgeHub;
