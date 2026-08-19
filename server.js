import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'dist')));

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
  cachedToken = tokenData.access_token;
  tokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000;
  return cachedToken;
}

app.get('/api/room-state', async (req, res) => {
  try {
    const roomId = req.query.room_id || 'BOARD-01';
    const token = await getDataverseToken();
    const filter = encodeURIComponent(`cra04_room_id eq '${roomId}'`);
    const dvRes = await fetch(
      `${process.env.DATAVERSE_URL}/api/data/v9.2/DemoRooms?$filter=${filter}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    );
    const data = await dvRes.json();
    res.json(data.value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch room state' });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => console.log(`Listening on port ${port}`));