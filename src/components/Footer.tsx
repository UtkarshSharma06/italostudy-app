import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Instagram, MessageCircle } from 'lucide-react';
import { usePricing } from '@/context/PricingContext';
import { imatLinks, centsLinks, studyItalyLinks } from '@/lib/nav-links';
import { useTranslation } from 'react-i18next';

export default function Footer() {
    const { t } = useTranslation();
    const { openPricingModal } = usePricing();

    const footerColumns = [
        {
            title: 'Company',
            links: [
                {label: 'About Us', path: '/about' },
                { label: 'Blog & News', path: '/blog' },
                { label: 'Marketplace', path: '/store' },
                { label: 'Pricing Plans', path: null, action: openPricingModal },
                { label: 'Contact Us', path: '/contact' },
                { label: 'Status', path: '/status' },
                { label: 'Privacy Policy', path: '/privacy' },
                { label: 'Terms of Service', path: '/terms' }
            ]
        },
        {
            title: 'CENT-S 2026',
            links: centsLinks.slice(0, 6)
        },
        {
            title: 'IMAT 2026',
            links: imatLinks.slice(0, 6)
        },
        {
            title: 'Study in Italy',
            links: studyItalyLinks.slice(0, 6)
        }
    ];

    return (
        <footer className="py-12 bg-slate-50 border-t border-slate-200 relative z-10 overflow-hidden text-left">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 mb-12">
                    {/* Brand Column */}
                    <div className="col-span-2 md:col-span-3 lg:col-span-1 flex flex-col items-start gap-5">
                        <img
                            src="/logo.webp"
                            alt="Italostudy Logo"
                            className="h-8 w-auto object-contain"
                            width="140"
                            height="35"
                            loading="lazy"
                        />
                        <p className="text-[11px] font-medium text-slate-500 max-w-xs leading-relaxed">
                            Empowering students for Italian entrance exams with expert-led preparation and strategic guidance for success.
                        </p>
                        <div className="flex gap-3">
                            <motion.a
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                href="https://www.instagram.com/italostudycom"
                                className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all border border-slate-200 shadow-sm"
                            >
                                <Instagram className="w-4 h-4" />
                            </motion.a>
                            <motion.a
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                href="https://chat.whatsapp.com/CfVh7u9L6vT7ZFpZwwVa4A"
                                className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 hover:text-green-600 transition-all border border-slate-200 shadow-sm"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </motion.a>
                        </div>
                    </div>

                    {/* Navigation Columns */}
                    {footerColumns.map((column) => (
                        <div key={column.title} className="flex flex-col gap-4">
                            <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                                {column.title}
                            </h4>
                            <ul className="flex flex-col gap-2.5">
                                {column.links.map((link, idx) => (
                                    <li key={idx}>
                                        {link.path ? (
                                            <a
                                                href={link.path.startsWith('http') 
                                                    ? link.path 
                                                    : (link.path.startsWith('/store') 
                                                        ? `https://store.italostudy.com${link.path.replace('/store', '')}` 
                                                        : `https://italostudy.com${link.path}`)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[11px] font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                                            >
                                                {link.label}
                                            </a>
                                        ) : (
                                            <button
                                                onClick={link.action}
                                                className="text-[11px] font-medium text-slate-600 hover:text-indigo-600 transition-colors text-left"
                                            >
                                                {link.label}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col items-center md:items-start gap-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            © {new Date().getFullYear()} ITALOSTUDY. ALL RIGHTS RESERVED.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6">
                        <a href="https://italostudy.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Privacy</a>
                        <a href="https://italostudy.com/terms" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Terms</a>
                        <a href="https://italostudy.com/refund" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Refunds</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
