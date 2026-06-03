export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { dgu } = req.query;
  if (!dgu) { res.status(400).json({ error: 'Mangler dgu parameter' }); return; }

  const normalized = dgu.replace(/^DGU\s*/i, '').trim();

  // Try multiple known Jupiter endpoint formats
  const endpoints = [
    `https://data.geus.dk/JupiterWWW/api/v1/borehole?dguNumber=${encodeURIComponent(normalized)}&fmt=json`,
    `https://data.geus.dk/JupiterWWW/api/v1/borehole?dguNo=${encodeURIComponent(normalized)}&fmt=json`,
    `https://data.geus.dk/JupiterWWW/api/v1/bore?dguNo=${encodeURIComponent(normalized)}&fmt=json`,
    `https://data.geus.dk/JupiterWWW/api/v1/boring?dguNumber=${encodeURIComponent(normalized)}`,
  ];

  const headers = {
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'da,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://data.geus.dk/JupiterWWW/',
    'Origin': 'https://data.geus.dk',
  };

  const results = [];
  for (const url of endpoints) {
    try {
      const response = await fetch(url, { headers });
      const text = await response.text();
      results.push({ url, status: response.status, body: text.substring(0, 300) });
      if (response.ok && !text.includes('Not Found') && !text.includes('<!doctype')) {
        try {
          const data = JSON.parse(text);
          res.status(200).json(data);
          return;
        } catch(e) {
          results[results.length-1].parseError = e.message;
        }
      }
    } catch (err) {
      results.push({ url, error: err.message });
    }
  }

  // Return debug info so we can see what worked
  res.status(502).json({ 
    error: 'Ingen endpoints virkede', 
    normalized,
    results 
  });
}
