import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface FAQItem {
    question: string;
    answer: string;
}

interface FAQSchemaProps {
    items: FAQItem[];
}

/**
 * FAQSchema injects JSON-LD structured data for FAQPage.
 * This is crucial for Google to display rich snippets (FAQs) in search results.
 */
const FAQSchema: React.FC<FAQSchemaProps> = ({ items }) => {
    if (!items || items.length === 0) return null;

    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": items.map(item => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
            }
        }))
    };

    return (
        <Helmet>
            <script type="application/ld+json">
                {JSON.stringify(schema)}
            </script>
        </Helmet>
    );
};

export default FAQSchema;
