# SEO, International Search, and AI Search

The public canonical origin is **https://aceblocker.com**.
At the time of this guide, only the FAQ has fully translated main content in all four languages.
Index other public pages in English only.
Visitors can open incomplete localized pages, but search engines must see `noindex` until translation is complete.
Keep server-rendered content, JSON-LD, `<html lang>`, canonical URLs, reciprocal `hreflang`, and the sitemap consistent.
Do not invent marketing claims or ratings.

## Deployment Checks

1. Deploy the site. Check that `https://aceblocker.com/robots.txt` and `/sitemap.xml` return HTTP 200 without authentication or CDN challenges.
   Keep account, authentication, administration, and checkout routes out of the sitemap.
2. Run `bun run seo:audit https://aceblocker.com` after deployment.
   This read-only script checks titles, descriptions, canonical links, headings, JSON-LD, sitemap entries, and `robots.txt`.
   It returns a nonzero exit code when it finds an error.
   For staging, supply the staging origin. Canonical links must still point to production.
3. Inspect server-rendered source for `/`, `/it/faq`, `/de/faq`, and `/es/faq`.
   Do not rely on the hydrated browser page alone.
   Check `<html lang>`, translated text, `hreflang`, self-canonical URLs, and JSON-LD.
4. Test important pages with Google's [Rich Results Test](https://search.google.com/test/rich-results) and [URL Inspection](https://support.google.com/webmasters/answer/9012289).
   Structured data does not guarantee rich results. Google limits FAQ rich-result eligibility.
5. Check mobile and desktop pages with [PageSpeed Insights](https://pagespeed.web.dev/).
   Include the home, download, and FAQ pages. Monitor real Core Web Vitals.
   Do not report an unmeasured score.

## Search Engine Setup (Manual Account Access Required)

- **Google Search Console:** Verify the `aceblocker.com` Domain property through DNS when possible.
  Alternatively, set `PUBLIC_GOOGLE_SITE_VERIFICATION` in hosting and redeploy. Then use HTML-tag verification.
  Submit `https://aceblocker.com/sitemap.xml`. Inspect `/` and `/faq`.
  Monitor indexing, performance, Core Web Vitals, and available AI search reports.
- **Bing Webmaster Tools:** Verify ownership through DNS, Google import, or `PUBLIC_BING_SITE_VERIFICATION`.
  Submit the same sitemap. Review **AI Performance**, cited pages, grounding queries, and URL errors.
- Do not commit dashboard credentials.
  Do not say verification or submission is complete until an authorized user finishes it.

## Crawler and AI Search Checks

- Google AI search uses normal Search indexing. Do not add a special `llms.txt` file or AI-specific schema for it.
- `robots.txt` allows ordinary public search crawlers, including **OAI-SearchBot**, **Googlebot**, and **Bingbot**.
  Check that CDN, WAF, and firewall settings allow legitimate crawlers.
  Public HTML must be accessible without cookies or JavaScript.
- Keep OAI-SearchBot (search) separate from GPTBot (model training). Their controls are independent.
- Review published text for accuracy.
  Add original examples, release notes, and real customer feedback only when they exist.
  Do not buy fake citations or invent testimonials.

## Regular Checks

**Every month:** Review Search Console queries, indexing, 404 errors, Core Web Vitals, and Bing AI citations.
Record baseline branded and non-branded impressions, clicks, CTR, and cited pages.
Improve existing useful content for real search questions.
Run `bun run seo:audit` after each public content change.

**Every quarter:** Review FAQ accuracy, links, locale rendering, schema, and sitemap languages.
When adding a translated page, update `src/lib/seo.ts` and the content catalogs together.
Never declare an untranslated page as translated through `hreflang`.

## Official References

- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/appearance/structured-data/software-app
- https://developers.openai.com/api/docs/bots
- https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c
