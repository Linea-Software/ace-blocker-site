import config from '../playwright.config';
export default {
	...config,
	testDir: '.',
	testMatch: ['marketing-features.spec.ts', 'navbar-preferences.spec.ts', 'device-link.spec.ts']
};
