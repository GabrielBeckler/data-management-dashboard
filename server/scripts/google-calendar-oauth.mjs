import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { google } from 'googleapis';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.error('Preencha GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no server/.env antes de continuar.');
  process.exit(1);
}

const redirect = new URL(GOOGLE_REDIRECT_URI);
if (!['localhost', '127.0.0.1'].includes(redirect.hostname)) {
  console.error('Para a autorização inicial local, GOOGLE_REDIRECT_URI deve usar localhost ou 127.0.0.1.');
  process.exit(1);
}

const oauth = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
);
const state = randomBytes(24).toString('hex');
const server = createServer(async (request, response) => {
  const callback = new URL(request.url ?? '/', GOOGLE_REDIRECT_URI);
  if (callback.pathname !== redirect.pathname) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (callback.searchParams.get('state') !== state) {
    response.writeHead(400).end('Invalid OAuth state');
    console.error('OAuth callback state validation failed.');
    server.close();
    process.exitCode = 1;
    return;
  }
  const authorizationError = callback.searchParams.get('error');
  const code = callback.searchParams.get('code');
  if (authorizationError || !code) {
    response.writeHead(400).end('Authorization was not completed. You may close this tab.');
    console.error(`Google authorization was not completed${authorizationError ? ` (${authorizationError})` : ''}.`);
    server.close();
    process.exitCode = 1;
    return;
  }

  try {
    const { tokens } = await oauth.getToken(code);
    response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Authorization complete. You may close this tab and return to the terminal.');
    if (!tokens.refresh_token) {
      console.error('Google did not return a refresh token. Revoke this app in your Google Account and run authorization again.');
      process.exitCode = 1;
    } else {
      console.log('\nOAuth authorization succeeded. Copy this value into GOOGLE_REFRESH_TOKEN in server/.env:');
      console.log(tokens.refresh_token);
      console.log('\nTreat this refresh token as a secret. Do not commit or share it.');
    }
  } catch {
    response.writeHead(500).end('Token exchange failed. Check the terminal for next steps.');
    console.error('Google OAuth token exchange failed. Verify the redirect URI and OAuth client configuration.');
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

const authorizationUrl = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/calendar.events'],
  state,
});
server.listen(Number(redirect.port || 80), redirect.hostname, () => {
  console.log('Open this URL in a browser signed into the Google account that owns the calendar:');
  console.log(authorizationUrl);
  console.log('\nWaiting for the local OAuth callback...');
});
