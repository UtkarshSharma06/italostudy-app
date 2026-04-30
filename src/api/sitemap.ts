import { createClient } from '@supabase/supabase-js';

const DOMAIN = 'https://italostudy.com'; // Update to your actual domain

export async function GET() {
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );

  // Static pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/answers', priority: '0.9', changefreq: 'daily' },
    { url: '/blog', priority: '0.8', changefreq: 'daily' },
    { url: '/pricing', priority: '0.7', changefreq: 'weekly' },
    // IMAT / CEnT-S authority cluster
    { url: '/imat-exam-ultimate-guide-2026', priority: '0.9', changefreq: 'monthly' },
    { url: '/imat-syllabus-2026', priority: '0.8', changefreq: 'monthly' },
    { url: '/cent-s-exam-ultimate-guide', priority: '0.9', changefreq: 'monthly' },
    { url: '/cent-s-syllabus-2026', priority: '0.8', changefreq: 'monthly' },
    { url: '/study-in-italy-guide-2026', priority: '0.8', changefreq: 'monthly' },
    { url: '/about', priority: '0.5', changefreq: 'monthly' },
    { url: '/contact', priority: '0.5', changefreq: 'monthly' },
  ];

  // Fetch Q&A questions slugs dynamically
  let qaPages: { url: string; priority: string; changefreq: string; lastmod: string }[] = [];
  try {
    const { data: questions } = await (supabase as any)
      .from('qa_questions')
      .select('slug, updated_at, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (questions) {
      qaPages = questions.map((q: any) => ({
        url: `/answers/${q.slug}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: q.updated_at || q.created_at,
      }));
    }
  } catch (err) {
    console.error('Sitemap: Failed to fetch Q&A pages', err);
  }

  const now = new Date().toISOString().split('T')[0];

  const urls = [
    ...staticPages.map(p => `
    <url>
      <loc>${DOMAIN}${p.url}</loc>
      <lastmod>${now}</lastmod>
      <changefreq>${p.changefreq}</changefreq>
      <priority>${p.priority}</priority>
    </url>`),
    ...qaPages.map(p => `
    <url>
      <loc>${DOMAIN}${p.url}</loc>
      <lastmod>${p.lastmod ? p.lastmod.split('T')[0] : now}</lastmod>
      <changefreq>${p.changefreq}</changefreq>
      <priority>${p.priority}</priority>
    </url>`),
  ].join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=86400, stale-while-revalidate',
    },
  });
}
