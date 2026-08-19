const { app } = require('@azure/functions');

let cachedToken = null;
let tokenExpiry = 0;

async function getDataverseToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        scope: `${process.env.DATAVERSE_URL}/.default`,
      }),
    }
  );
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('Token request failed: ' + JSON.stringify(tokenData));
  }
  cachedToken = tokenData.access_token;
  tokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000;
  return cachedToken;
}

app.http('roomState', {
  route: 'room-state',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const roomId = request.query.get('room_id') || 'BOARD-01';
      const token = await getDataverseToken();
      const filter = encodeURIComponent(`cra04_room_id eq '${roomId}'`);

      const dvRes = await fetch(
        `${process.env.DATAVERSE_URL}/api/data/v9.2/cra04_demoroomses?$filter=${filter}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );
      const data = await dvRes.json();

      return { jsonBody: data.value };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: 'Failed to fetch room state' } };
    }
  },
});