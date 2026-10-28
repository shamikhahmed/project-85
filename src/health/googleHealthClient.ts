/**
 * Google Health API client stub.
 *
 * Secrets must NEVER ship in the PWA bundle. Use a confidential OAuth web-server
 * client on a backend when enabling this. All Google Health scopes are Restricted
 * (verification / CASA for production). Fitbit Web API hard-off: 2026-11-02.
 *
 * Docs: https://developers.google.com/health
 */

export interface GoogleHealthSetupStatus {
  configured: boolean;
  reason: string;
  requiredEnv: string[];
}

/** Frontend may only see a public client id for PKCE experiments — still blocked without backend. */
export function getGoogleHealthSetupStatus(): GoogleHealthSetupStatus {
  const clientId = import.meta.env.VITE_GOOGLE_HEALTH_CLIENT_ID as string | undefined;
  const apiBase = import.meta.env.VITE_GOOGLE_HEALTH_API_BASE as string | undefined;
  const hasPublicHint = Boolean(clientId?.trim());

  if (!hasPublicHint) {
    return {
      configured: false,
      reason:
        'Google Health not configured. Set VITE_GOOGLE_HEALTH_CLIENT_ID only after a backend holds the client secret and refresh tokens. Restricted scopes require Google verification.',
      requiredEnv: [
        'VITE_GOOGLE_HEALTH_CLIENT_ID (public hint only)',
        'Server: GOOGLE_HEALTH_CLIENT_SECRET',
        'Server: GOOGLE_HEALTH_REFRESH handling',
      ],
    };
  }

  return {
    configured: false,
    reason: `Client id present (${(clientId ?? '').slice(0, 8)}…) but live OAuth is still blocked without a token backend. API base: ${apiBase ?? 'https://health.googleapis.com'}.`,
    requiredEnv: ['Server-side OAuth + Restricted scope approval'],
  };
}

/** Intentionally throws until a real backend exists — never fake a successful sync. */
export async function fetchGoogleHealthSamples(_opts: {
  accessToken: string;
  dataType: string;
  startTime: string;
  endTime: string;
}): Promise<never> {
  throw new Error(
    'Google Health fetch requires a verified OAuth access token from your backend. Not available in this PWA build.',
  );
}
