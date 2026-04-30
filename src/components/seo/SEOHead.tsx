import { Helmet } from "react-helmet-async";
import { CORE_KEYWORDS } from '@/lib/seo-keywords';

/* ─── Types ─── */

interface FAQ {
    question: string;
    answer: string;
}

interface BreadcrumbItem {
    name: string;
    url: string;
}

export interface SEOHeadProps {
    /* Required */
    title: string;
    description: string;

    /* Optional metadata */
    keywords?: string;
    canonicalUrl?: string;
    ogImage?: string;
    ogType?: string;
    twitterImage?: string;

    /* Structured Data */
    faqs?: FAQ[];
    schema?: Record<string, any>;
    schemas?: Record<string, any>[];
    breadcrumbs?: BreadcrumbItem[];

    /* Locale / Internationalisation */
    locale?: string;

    /* Article-specific OG fields */
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
}

/* ─── Component ─── */

const SEOHead = ({
    title,
    description,
    keywords,
    faqs,
    canonicalUrl,
    schema,
    schemas,
    ogImage = "https://italostudy.com/logo.webp",
    ogType = "website",
    twitterImage,
    breadcrumbs,
    locale = "en_US",
    publishedTime,
    modifiedTime,
    section,
    tags,
}: SEOHeadProps) => {
    /* Title with brand suffix */
    const siteTitle = title.includes("ItaloStudy") ? title : `${title} | ItaloStudy`;

    /* Canonical derivation based on actual path */
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const basePath = currentPath.replace(/^\/(it|tr)(\/|$)/, '/');
    const cleanCurrentPath = currentPath.endsWith('/') && currentPath.length > 1 ? currentPath.slice(0, -1) : currentPath;
    const cleanBasePath = basePath.endsWith('/') && basePath.length > 1 ? basePath.slice(0, -1) : basePath;
    
    const derivedCanonical = canonicalUrl || `https://italostudy.com${cleanCurrentPath}`;

    /* Language code for <html lang> */
    const langCode = locale.split('_')[0];

    /* ─── FAQ Schema ─── */
    const faqSchema = faqs && faqs.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    } : null;

    /* ─── Breadcrumb Schema ─── */
    const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((item, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": item.name,
            "item": item.url
        }))
    } : null;

    return (
        <Helmet>
            <html lang={langCode} />

            {/* Core Meta */}
            <title>{siteTitle}</title>
            <meta name="description" content={description} />
            {keywords && <meta name="keywords" content={keywords} />}
            <meta name="author" content="ItaloStudy" />

            {/* Canonical */}
            <link rel="canonical" href={derivedCanonical} />

            {/* Robots */}
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

            {/* Open Graph */}
            <meta property="og:type" content={ogType} />
            <meta property="og:title" content={siteTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:site_name" content="ItaloStudy" />
            <meta property="og:url" content={derivedCanonical} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:locale" content={locale} />
            {locale === "it_IT" && <meta property="og:locale:alternate" content="en_US" />}
            {locale === "tr_TR" && <meta property="og:locale:alternate" content="en_US" />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={siteTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:site" content="@italostudy" />
            <meta name="twitter:creator" content="@italostudy" />
            {twitterImage && <meta name="twitter:image" content={twitterImage} />}
            {ogImage && !twitterImage && <meta name="twitter:image" content={ogImage} />}

            {/* Article OG tags (blog posts) */}
            {ogType === 'article' && publishedTime && (
                <meta property="article:published_time" content={publishedTime} />
            )}
            {ogType === 'article' && modifiedTime && (
                <meta property="article:modified_time" content={modifiedTime} />
            )}
            {ogType === 'article' && section && (
                <meta property="article:section" content={section} />
            )}
            {ogType === 'article' && tags && tags.map(tag => (
                <meta key={tag} property="article:tag" content={tag} />
            ))}
            {ogType === 'article' && (
                <meta property="article:author" content="https://italostudy.com" />
            )}
            {ogType === 'article' && section && (
                <meta property="article:section" content={section} />
            )}

            {/* Mobile */}
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-title" content="ItaloStudy" />

            {/* hreflang — multilingual SEO */}
            <link rel="alternate" hrefLang="en" href={`https://italostudy.com${cleanBasePath === '/' ? '' : cleanBasePath}`} />
            <link rel="alternate" hrefLang="it" href={`https://italostudy.com/it${cleanBasePath === '/' ? '' : cleanBasePath}`} />
            <link rel="alternate" hrefLang="tr" href={`https://italostudy.com/tr${cleanBasePath === '/' ? '' : cleanBasePath}`} />
            <link rel="alternate" hrefLang="x-default" href={`https://italostudy.com${cleanBasePath === '/' ? '' : cleanBasePath}`} />

            {/* FAQ Schema */}
            {faqSchema && (
                <script type="application/ld+json">
                    {JSON.stringify(faqSchema)}
                </script>
            )}

            {/* Breadcrumb Schema */}
            {breadcrumbSchema && (
                <script type="application/ld+json">
                    {JSON.stringify(breadcrumbSchema)}
                </script>
            )}

            {/* Custom Schema */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}

            {/* Multiple Schemas */}
            {schemas && schemas.map((s, i) => (
                <script key={i} type="application/ld+json">
                    {JSON.stringify(s)}
                </script>
            ))}
        </Helmet>
    );
};

export default SEOHead;
