/**
 * Read-only SEO smoke test against a deployed Ace Blocker website.
 * Usage: bun run seo:audit [https://aceblocker.com]
 * No private data, logins, or search-engine credentials required.
 */
import { INDEXABLE_PATHS, SITE_URL, localizedPath, localesForPath } from '../src/lib/seo';

const origin = (process.argv[2] ?? SITE_URL).replace(/\/$/, '');
const problems: string[] = [];

function report(url: string, issue: string) {
	problems.push(`${url}: ${issue}`);
}

async function get(url: string): Promise<{ status: number; body: string }> {
	const response = await fetch(url, {
		headers: { 'User-Agent': 'AceBlocker-SEO-Audit/1.0' },
		signal: AbortSignal.timeout(12000)
	});
	return { status: response.status, body: await response.text() };
}

async function checkPublic(path: string) {
	const url = origin + path;
	try {
		const { status, body } = await get(url);
		const expectedCanonical = SITE_URL + path;
		if (status !== 200) report(url, `expected 200, got ${status}`);
		if (!body.includes(`rel="canonical" href="${expectedCanonical}"`)) {
			report(url, 'missing or mismatched canonical URL');
		}
		if (!/<meta name="description" content="[^"]+"/.test(body)) {
			report(url, 'missing nonempty meta description');
		}
		if (!/<h1\b/i.test(body)) report(url, 'missing H1');
		if (!/<title>[^<]+<\/title>/.test(body)) report(url, 'missing title');
		if (/name="robots" content="noindex/i.test(body)) report(url, 'marked noindex');
		if (!body.includes('application/ld+json') && (path === '/' || path.endsWith('/faq'))) {
			report(url, 'missing JSON-LD');
		}
		if (path.endsWith('/faq') && !body.includes('FAQPage')) {
			report(url, 'missing FAQ schema');
		}
	} catch (error) {
		report(url, error instanceof Error ? error.message : String(error));
	}
}

async function main() {
	if (!/^https?:\/\//.test(origin)) {
		throw new Error('Pass a full http(s) origin, e.g. https://aceblocker.com');
	}
	const paths = INDEXABLE_PATHS.flatMap((pathname) =>
		localesForPath(pathname).map((locale) => localizedPath(pathname, locale))
	);
	await Promise.all(paths.map(checkPublic));

	try {
		const { status, body } = await get(origin + '/sitemap.xml');
		if (status !== 200) report('/sitemap.xml', `expected 200, got ${status}`);
		for (const path of paths) {
			if (!body.includes(`<loc>${SITE_URL}${path}</loc>`)) {
				report('/sitemap.xml', `missing path ${path}`);
			}
		}
	} catch (error) {
		report('/sitemap.xml', String(error));
	}

	try {
		const { status, body } = await get(origin + '/robots.txt');
		if (status !== 200 || !body.includes('Sitemap: https://aceblocker.com/sitemap.xml')) {
			report('/robots.txt', 'missing sitemap reference or non-200 response');
		}
		if (/User-agent:\s*(OAI-SearchBot|Bingbot|Googlebot)\s*\nDisallow:\s*\//i.test(body)) {
			report('/robots.txt', 'search crawler explicitly disallowed');
		}
	} catch (error) {
		report('/robots.txt', String(error));
	}

	console.info(
		`Checked ${paths.length} localized pages, sitemap.xml and robots.txt at ${origin}`
	);
	if (problems.length) {
		for (const problem of problems) console.error(`FAIL ${problem}`);
		process.exitCode = 1;
	} else {
		console.info('All SEO smoke checks passed.');
	}
}

await main();
