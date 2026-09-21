import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'];

let cachedClient = null;

function loadCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');
  }
  return JSON.parse(raw);
}

// Vercel Fluid Compute reuses instances across invocations, so caching the
// authorized client (and letting google-auth-library refresh its own token)
// saves a JWT exchange on every warm request.
export function getGoogleClient() {
  if (cachedClient) return cachedClient;
  const credentials = loadCredentials();
  cachedClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  });
  return cachedClient;
}

export async function getAccessToken() {
  const client = getGoogleClient();
  const { token } = await client.getAccessToken();
  return token;
}
