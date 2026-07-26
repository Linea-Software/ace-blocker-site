import type { RequestHandler } from './$types';

const BASE_URL = 'https://aceblocker.com';

const PUBLIC_PAGES = [
	{ loc: '/', changefreq: 'weekly', priority: '1.0' },
	{ loc: '/about', changefreq: 'monthly', priority: '0.8' },
	{ loc: '/privacy', changefreq: 'monthly', priority: '0.4' },
	{ loc: '/terms', changefreq: 'monthly', priority: '0.4' },
	{ loc: '/get-pro', changefreq: 'weekly', priority: '0.9' },
	{ loc: '/download', changefreq: 'weekly', priority: '0.9' },
	{ loc: '/signin', changefreq: 'monthly', priority: '0.3' },
	{ loc: '/signup', changefreq: 'monthly', priority: '0.3' },
	{ loc: '/forgot-password', changefreq: 'monthly', priority: '0.1' }
] as const;

export const GET: RequestHandler = async () => {
	const urls = PUBLIC_PAGES.map(
		(page) => `	<url>
		<loc>${BASE_URL}${page.loc}</loc>
		<changefreq>${page.changefreq}</changefreq>
		<priority>${page.priority}</priority>
	</url>`
	).join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600, s-maxage=3600'
		}
	});
};
