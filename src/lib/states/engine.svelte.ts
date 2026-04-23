// the engine injects these variables in the site
export const engineConfig = $state({
	linkState: 'idle' as 'idle' | 'loading' | 'success' | 'error'
});

// if !isPro and in the server there's a pro licence,
// prompt the user to send an api key to ace blocker
// using the custom protocol: aceblocker://account/api-key?apiKey={generated api key}
