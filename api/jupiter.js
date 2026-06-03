export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { dgu } = req.query;
  if (!dgu) { res.status(400).json({ error: 'Mangler dgu parameter' }); return; }

  const endpoints = [
    `https://data.geus.dk/JupiterWWW/api/v1/borehole?dguNumber=${encodeURIComponent(dgu)}&fmt=json`,
    `https://data.geus.dk/JupiterWWW/api/v1/borehole?dguNumber=${encodeURIComponent(dgu)}`,
  ];

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://data.geus.dk/',
    'Origin': 'https://data.geus.dk',
    'Cache-Control': 'no-cache',
  };

  let lastError = null;
  for (const url of endpoints) {
    try {
      const response = await fetch(url, { headers });
      const text = await response.text();
      if (!response.ok) {
        lastError = `Jupiter HTTP ${response.status}: ${text.substring(0, 200)}`;
        continue;
      }
      const data = JSON.parse(text);
      res.status(200).json(data);
      return;
    } catch (err) {
      lastError = err.message;
    }
  }
  res.status(502).json({ error: lastError || 'Kunne ikke kontakte Jupiter' });
}
