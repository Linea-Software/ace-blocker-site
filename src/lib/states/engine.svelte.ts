// the engine injects these variables in the site
export const engineConfig = $state({
	hostname: 'ace-engine.local',
	port: '443', // Default to HTTPS port if not specified
	linkState: 'idle' as 'idle' | 'loading' | 'success' | 'error'
});

// For backward compatibility or if needed by scripts
if (typeof window !== 'undefined') {
	(window as any).__BOREDOM_SERVER_HOSTNAME__ = engineConfig.hostname;
	(window as any).__BOREDOM_SERVER_PORT__ = engineConfig.port;
}

//you can call it using https://{window.__BOREDOM_SERVER_HOSTNAME__}:{window.__BOREDOM_SERVER_PORT__}/...

// eg. https://ace-engine.local:8080/account/info that returns
// #[derive(Serialize, Deserialize, JsonSchema, ToSchema)]
// #[serde(rename_all = "camelCase")]
// pub struct AccountInfoResponse {
//     pub username: Option<String>,
//     pub email: Option<String>,
//     pub is_pro: bool,
// }

// if !isPro and in the server there's a pro licence,
// prompt the user to send an api key to ace blocker
// using POST https://ace-engine.local:8080/account/api-key?apiKey={generated api key}