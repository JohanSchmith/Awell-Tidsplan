export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { dgu } = req.query;
  if (!dgu) { res.status(400).json({ error: 'Mangler dgu parameter' }); return; }

  // Normalize DGU number — strip any "DGU" prefix, ensure format like "216.651"
  const normalized = dgu.replace(/^DGU\s*/i, '').trim();

  const url = `https://data.geus.dk/JupiterWWW/api/v1/borehole?dguNumber=${encodeURIComponent(normalized)}&fmt=json`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'da,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Host': 'data.geus.dk',
        'Origin': 'https://data.geus.dk',
        'Referer': 'https://data.geus.dk/JupiterWWW/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      }
    });

    const text = await response.text();

    // Log for debugging
    console.log(`Jupiter ${normalized}: HTTP ${response.status}, body: ${text.substring(0,200)}`);

    if (!response.ok) {
      res.status(502).json({
        error: `Jupiter HTTP ${response.status}`,
        detail: text.substring(0, 500),
        url,
        normalized
      });
      return;
    }

    const data = JSON.parse(text);
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message, url, normalized });
  }
}
