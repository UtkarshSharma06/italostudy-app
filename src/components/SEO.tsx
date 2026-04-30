/**
 * SEO.tsx — Backward-compatible wrapper around SEOHead.
 *
 * All pages that import `from '@/components/SEO'` will continue to work.
 * New pages should import directly from `@/components/seo/SEOHead` instead.
 */
import SEOHead from '@/components/seo/SEOHead';
import type { SEOHeadProps } from '@/components/seo/SEOHead';
import { CORE_KEYWORDS } from '@/lib/seo-keywords';

interface SEOProps extends Partial<SEOHeadProps> {
    /** @deprecated use ogImage instead */
    image?: string;
    /** @deprecated use canonicalUrl instead */
    url?: string;
    /** @deprecated use ogType instead */
    type?: string;
}

export default function SEO({
    title = "ItaloStudy | Free CEnT-S & IMAT Exam Prep",
    description = "Prepare for CEnT-S, IMAT, SAT and IELTS entrance exams with free mock tests and AI-powered study tools. 5,000+ students. Italy's top exam prep platform.",
    keywords = CORE_KEYWORDS,
    image,
    url,
    type,
    ogImage,
    ogType,
    canonicalUrl,
    ...rest
}: SEOProps) {
    return (
        <SEOHead
            title={title}
            description={description}
            keywords={keywords}
            ogImage={ogImage || image || "https://italostudy.com/logo.webp"}
            ogType={ogType || type || "website"}
            canonicalUrl={canonicalUrl || url}
            {...rest}
        />
    );
}
