export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { dgu } = req.query;
  if (!dgu) { res.status(400).json({ error: 'Mangler dgu parameter' }); return; }

  const normalized = dgu.replace(/^DGU\s*/i, '').trim();
  const token = process.env.DATAFORSYNINGEN_TOKEN || '579475e934e75fc3c88dc550884c9b4e';

  const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json, */*' };

  // New Dataforsyningen API structure (post maj 2025)
  // https://api.dataforsyningen.dk/wfs/{servicenavn}?TOKEN=...
  // Old structure: https://api.dataforsyningen.dk/{servicenavn}?token=...
  const serviceNames = [
    'Jupiter', 'jupiter', 'boringer', 'gt_boring', 'grundvand',
    'geol_boringer', 'jupiter_boringer', 'boringarkiv',
    'HyJupiter', 'hyjupiter', 'JupiterWWW'
  ];

  const results = [];

  for (const svc of serviceNames) {
    // Try both old and new URL structures
    const urls = [
      `https://api.dataforsyningen.dk/wfs/${svc}?service=WFS&version=2.0.0&request=GetCapabilities&TOKEN=${token}`,
      `https://api.dataforsyningen.dk/${svc}?service=WFS&version=2.0.0&request=GetCapabilities&token=${token}`,
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url, { headers });
        if (r.status !== 404) {
          const text = await r.text();
          results.push({ svc, url: url.split('?')[0], status: r.status, ok: r.ok, preview: text.substring(0, 100) });
          if (r.ok) break;
        }
      } catch(e) {
        results.push({ svc, error: e.message });
      }
    }
  }

  const working = results.filter(r => r.ok);

  if (working.length === 0) {
    res.status(502).json({ error: 'Ingen services svarer 200', results: results.filter(r=>r.status && r.status !== 404) });
    return;
  }

  // Query data from first working service
  for (const svc of working) {
    const isNew = svc.url.includes('/wfs/');
    const tokenParam = isNew ? 'TOKEN' : 'token';
    const basePath = svc.url;

    const filters = [
      `dgu_nr='${normalized}'`,
      `dgunr='${normalized}'`,
      `dgu_number='${normalized}'`,
      `dguNumber='${normalized}'`,
    ];

    for (const filter of filters) {
      try {
        const dataUrl = `${basePath}?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(filter)}&${tokenParam}=${token}`;
        const dr = await fetch(dataUrl, { headers });
        const text = await dr.text();
        if (dr.ok && text.includes('"features"')) {
          const data = JSON.parse(text);
          if (data.features?.length > 0) {
            res.status(200).json({ source: svc.svc, normalized, geojson: data });
            return;
          }
        }
      } catch(e) {}
    }
  }

  res.status(502).json({
    error: 'Services fundet men ingen boringdata',
    working: working.map(w => ({ svc: w.svc, url: w.url, status: w.status })),
  });
}
