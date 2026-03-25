/**
 * One-time script to generate a fresh GOOGLE_REFRESH_TOKEN with all required scopes.
 *
 * Required scopes:
 *   https://www.googleapis.com/auth/gmail.send
 *   https://www.googleapis.com/auth/calendar
 *   https://www.googleapis.com/auth/drive
 *   https://www.googleapis.com/auth/documents
 *   https://www.googleapis.com/auth/spreadsheets
 *
 * BEFORE running:
 *   Add http://localhost:3001/oauth2callback to your Google Cloud Console
 *   OAuth 2.0 Client → Authorized redirect URIs
 *
 * Run: node generate-token.js
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually — no dotenv dependency needed
const envPath = path.join(__dirname, '.env.local');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const eq = line.indexOf('=');
  if (eq > 0) {
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key) env[key] = val;
  }
});

const CLIENT_ID     = env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:3001/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('ERROR: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing from .env.local');
  process.exit(1);
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',           // forces refresh_token to be returned every time
  include_granted_scopes: true,
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Open this URL in your browser and sign in with');
console.log('anubhabr97@gmail.com:');
console.log('\n' + authUrl + '\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Listening on http://localhost:3001/oauth2callback ...\n');

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname !== '/oauth2callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = parsed.query.code;
  if (!code) {
    res.writeHead(400);
    res.end('No authorization code received.');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(String(code));

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2 style="font-family:sans-serif;color:green">✅ Authorization successful! Check your terminal.</h2>');

    console.log('\n✅ SUCCESS — New refresh token:');
    console.log('\nGOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\nAccess token (expires in ~1 hour): ' + tokens.access_token?.slice(0, 30) + '...');
    console.log('\nCopy the GOOGLE_REFRESH_TOKEN value above into your .env.local\n');

    // Write new token directly into .env.local
    const envContent = fs.readFileSync(envPath, 'utf8');
    const updated = envContent.replace(
      /^GOOGLE_REFRESH_TOKEN=.*/m,
      'GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token
    );
    fs.writeFileSync(envPath, updated, 'utf8');
    console.log('✅ .env.local updated automatically with new GOOGLE_REFRESH_TOKEN');

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500);
    res.end('Error: ' + err.message);
    console.error('\n❌ Error exchanging code for tokens:', err.message);
    server.close();
    process.exit(1);
  }
});

server.listen(3001, () => {
  console.log('Server ready. Waiting for browser redirect...');
});
