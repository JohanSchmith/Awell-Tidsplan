export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { dgu } = req.query;
  if (!dgu) { res.status(400).json({ error: 'Mangler dgu parameter' }); return; }

  const normalized = dgu.replace(/^DGU\s*/i, '').trim();
  const token = process.env.DATAFORSYNINGEN_TOKEN || '3636bf932b8d1f9bd18659524549afc9';

  // Try Dataforsyningen WFS endpoints for Jupiter boring data
  const services = [
    `https://api.dataforsyningen.dk/boringarkiv_wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=boringarkiv:borehole&CQL_FILTER=dgu_number='${normalized}'&outputFormat=application/json&token=${token}`,
    `https://api.dataforsyningen.dk/Jupiter_boringer?service=WFS&version=2.0.0&request=GetFeature&typeNames=Jupiter_boringer:borehole&CQL_FILTER=dgu_nr='${normalized}'&outputFormat=application/json&token=${token}`,
    `https://api.dataforsyningen.dk/boringer_wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=boringer:boring&CQL_FILTER=dgunr='${normalized}'&outputFormat=application/json&token=${token}`,
  ];

  const headers = {
    'Accept': 'application/json, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  const results = [];
  for (const url of services) {
    try {
      const response = await fetch(url, { headers });
      const text = await response.text();
      const shortUrl = url.split('?')[0].split('/').pop();
      results.push({ service: shortUrl, status: response.status, body: text.substring(0, 400) });
      
      if (response.ok && text.includes('"features"')) {
        const data = JSON.parse(text);
        if (data.features && data.features.length > 0) {
          res.status(200).json({ source: 'dataforsyningen', normalized, geojson: data });
          return;
        }
      }
    } catch (err) {
      results.push({ error: err.message });
    }
  }

  res.status(502).json({ error: 'Ingen data fundet', normalized, results });
}
