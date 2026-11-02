import type { RequestHandler } from './$types';
import { alternateUrls, INDEXABLE_PATHS, localizedPath, localesForPath, SITE_URL } from '$lib/seo';

export const GET: RequestHandler = () => {
	const urls = INDEXABLE_PATHS.flatMap((pathname) =>
		localesForPath(pathname).map(
			(locale) => `  <url>
    <loc>${SITE_URL}${localizedPath(pathname, locale)}</loc>
${alternateUrls(pathname)
	.map(
		(alternate) =>
			`    <xhtml:link rel="alternate" hreflang="${alternate.locale}" href="${alternate.url}" />`
	)
	.join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${pathname}" />
  </url>`
		)
	).join('\n');

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`,
		{
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600, s-maxage=3600'
			}
		}
	);
};
