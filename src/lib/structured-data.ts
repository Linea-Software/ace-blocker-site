import { SITE_URL } from './seo';

export function organizationAndWebsiteData() {
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'Organization',
				'@id': `${SITE_URL}/#organization`,
				name: 'Ace Blocker',
				url: SITE_URL,
				logo: `${SITE_URL}/ace-social-preview.png`
			},
			{
				'@type': 'WebSite',
				'@id': `${SITE_URL}/#website`,
				name: 'Ace Blocker',
				url: SITE_URL,
				publisher: { '@id': `${SITE_URL}/#organization` },
				inLanguage: ['en', 'it', 'es', 'de']
			}
		]
	};
}

export function softwareData(description: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		'@id': `${SITE_URL}/#software`,
		name: 'Ace Blocker',
		url: SITE_URL,
		description,
		applicationCategory: 'ProductivityApplication',
		operatingSystem: 'Windows, macOS, Linux',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
			description: 'Free version'
		},
		publisher: { '@id': `${SITE_URL}/#organization` }
	};
}

/** Escapes untrusted translation text before it enters an HTML script context. */
export function jsonLdScript(value: unknown): string {
	return `<script type="application/ld+json">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;
}
