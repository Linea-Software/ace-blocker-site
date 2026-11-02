import { describe, expect, it } from 'vitest';
import { jsonLdScript, organizationAndWebsiteData, softwareData } from './structured-data';

describe('structured data', () => {
	it('describes only evidenced product features and a free offer', () => {
		const software = softwareData('Block distracting websites with schedules and locks.');
		expect(software.operatingSystem).toContain('Linux');
		expect(software.offers.price).toBe('0');
		expect(software).not.toHaveProperty('aggregateRating');
		expect(organizationAndWebsiteData()['@graph']).toHaveLength(2);
	});

	it('prevents script termination from translated descriptions', () => {
		const text = jsonLdScript(softwareData('</script><script>alert(1)</script>'));
		expect(text).not.toContain('</script><script>');
		expect(text).toContain('\\u003c/script>');
	});
});
