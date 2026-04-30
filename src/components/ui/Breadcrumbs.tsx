import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Premium glassmorphism breadcrumbs for SEO and navigation.
 * Helps with "BreadcrumbList" rich snippets.
 */
export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  // Breadcrumb Schema for SEO
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": item.href ? `https://italostudy.com${item.href}` : undefined
    }))
  };

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center space-x-2 text-xs md:text-sm font-medium ${className}`}>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      
      <Link 
        to="/" 
        className="flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
      >
        <Home size={14} className="mr-1" />
        <span className="hidden md:inline">Home</span>
      </Link>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-slate-300 shrink-0" />
          {item.href ? (
            <Link 
              to={item.href}
              className="text-slate-400 hover:text-indigo-600 transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-bold whitespace-nowrap overflow-hidden text-ellipsis">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
