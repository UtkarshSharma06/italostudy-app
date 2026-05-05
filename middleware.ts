export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const isBot = /bot|whatsapp|facebookexternalhit|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|googlebot/i.test(userAgent);

  // If not a bot, or not a waiting-room page, let the request proceed normally
  if (!isBot || !url.pathname.startsWith('/waiting-room/')) {
    return new Response(null, {
      headers: { 'x-middleware-next': '1' },
    });
  }

  const sessionId = url.pathname.split('/').pop();
  if (!sessionId) {
    return new Response(null, {
      headers: { 'x-middleware-next': '1' },
    });
  }

  try {
    const supabaseUrl = 'https://jyjhpqtqbwtxxgijxetq.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5amhwcXRxYnd0eHhnaWp4ZXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgyNjUsImV4cCI6MjA4MzE5NDI2NX0.5HaHhfgPQbIRKmHZE61ggrtj-lKi5JlBU9tsOfQ_d3c';

    const response = await fetch(
      `${supabaseUrl}/rest/v1/mock_sessions?id=eq.${sessionId}&select=title,description`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const sessions = await response.json();
    const session = sessions?.[0];

    if (!session) {
      return new Response(null, {
        headers: { 'x-middleware-next': '1' },
      });
    }

    const title = `Live Simulation: ${session.title}`;
    const description = session.description || 'Join the live exam simulation on Italostudy. Practice with real exam conditions and compete with peers.';
    const image = 'https://app.italostudy.com/og-waiting-room.png'; // Fallback or generic simulation image

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url.href}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${url.href}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${image}">

  <meta http-equiv="refresh" content="0;url=${url.href}">
</head>
<body>
  <p>Redirecting to waiting room...</p>
  <script>window.location.href = "${url.href}";</script>
</body>
</html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Middleware SEO Error:', error);
    return new Response(null, {
      headers: { 'x-middleware-next': '1' },
    });
  }
}
