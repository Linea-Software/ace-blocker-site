// Runtime-only environment access. Never import into browser modules.
// Avoid static environment variable snapshots: VPS provisioning supplies env at launch.
export const env = process.env as Record<string, string>;
