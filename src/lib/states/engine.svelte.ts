// the engine injects these variables in the site
export const engineConfig = $state({
	linkState: 'idle' as 'idle' | 'loading' | 'success' | 'error'
});

// if !isPro and in the server there's a pro licence,
// prompt the user to send an API key to Ace Blocker
// using the custom protocol: aceblocker://account/api-key#apiKey={generated api key}
// (the key rides in the URL fragment, never the query string)
