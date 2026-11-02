# SEO, international search and AI search operations

This site's public canonical origin is **https://aceblocker.com**. The FAQ is currently the only page with completely translated main content in all four languages; other public pages are indexable in English only. Localized but untranslated versions remain available to visitors and are marked `noindex` until the content is ready. The SSR pages, JSON-LD, HTML language attributes, canonical links, reciprocal `hreflang` values, and sitemap must describe **the same public content**. Do not add marketing claims or star ratings that are not visible and verifiable.

## Deploy checklist

1. Deploy the code and verify `https://aceblocker.com/robots.txt` and `/sitemap.xml` return HTTP 200 without a login or CDN challenge. The sitemap intentionally omits account, auth, admin and checkout routes.
2. Run `bun run seo:audit https://aceblocker.com` after deployment. This read-only script checks page titles, descriptions, canonicals, headings, JSON-LD, sitemap entries and robots.txt. It exits nonzero when it finds an issue. For staging, provide the staging origin (canonical links are still expected to point to production).
3. Confirm **server-rendered** HTML of `/`, `/it/faq`, `/de/faq` and `/es/faq` using View Source, not just a hydrated browser. Verify correct `<html lang>`, visible translations, `hreflang`, self-canonical, and JSON-LD.
4. Test key pages with Google's [Rich Results Test](https://search.google.com/test/rich-results) and [URL Inspection](https://support.google.com/webmasters/answer/9012289). Structured data doesn't guarantee a rich result; FAQ rich results have eligibility restrictions.
5. Use [PageSpeed Insights](https://pagespeed.web.dev/) on mobile and desktop (home, download, FAQ). Track real Core Web Vitals over time rather than assigning an unmeasured score.

## Search engines (manual account access required)

- **Google Search Console:** verify the Domain property for `aceblocker.com` by DNS (preferred). Alternatively, provide the Google HTML verification token as `PUBLIC_GOOGLE_SITE_VERIFICATION` in the hosting environment and redeploy, then verify using the HTML-tag method. Submit `https://aceblocker.com/sitemap.xml`, inspect the homepage and `/faq`, and monitor indexing, performance, Core Web Vitals and available generative-AI reports.
- **Bing Webmaster Tools:** verify the site (DNS/import from Google or a HTML tag using `PUBLIC_BING_SITE_VERIFICATION`), submit the same sitemap and review the **AI Performance** report, cited pages, grounding queries and URL errors.
- Do not commit dashboard credentials or claim that ownership verification or sitemap submission is complete until someone with access performs it.

## Crawler and AI-search checks

- Google's search AI features use normal Search indexing; there is no need for special `llms.txt` files or AI-specific schema.
- `robots.txt` allows ordinary public search crawling, including **OAI-SearchBot** (ChatGPT Search), **Googlebot** and **Bingbot**. Confirm CDN/WAF/firewall settings also allow legitimate crawlers and that the HTML is publicly reachable without cookies or JavaScript execution.
- Don't conflate OAI-SearchBot (search) with GPTBot (model training). Their crawler controls are independent.
- Review published copy for accuracy and add original examples, release notes and real customer feedback only when available; do not buy fake citations or manufacture testimonials.

## Ongoing process

Monthly: review Search Console search terms, indexing, 404s, CWV and Bing AI citations; log a baseline of branded/non-branded impressions, clicks, CTR and cited pages. Adjust **existing helpful content** for genuine search questions. Re-run `bun run seo:audit` after each public content change.

Quarterly: review FAQ for correctness, check link coverage, test actual locale rendering, validate schema, and confirm the sitemap's public-language list. When adding a new translated page, update `src/lib/seo.ts` and content catalogues together; never label untranslated body content with a false `hreflang`.

Official reference material:

- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/appearance/structured-data/software-app
- https://developers.openai.com/api/docs/bots
- https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c
