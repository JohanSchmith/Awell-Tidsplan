export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { dgu } = req.query;
  if (!dgu) { res.status(400).json({ error: 'Mangler dgu parameter' }); return; }

  try {
    const url = `https://data.geus.dk/JupiterWWW/api/v1/borehole?dguNumber=${encodeURIComponent(dgu)}&fmt=json`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Awell-Tidsplan/1.0' }
    });
    if (!response.ok) throw new Error(`Jupiter returnerede HTTP ${response.status}`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
