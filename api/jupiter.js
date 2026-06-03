export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { dgu } = req.query;
  if (!dgu) { res.status(400).json({ error: 'Mangler dgu parameter' }); return; }

  const normalized = dgu.replace(/^DGU\s*/i, '').trim();
  const endpoint = 'https://webs.geus.dk/miljoeportal.groundwater.b-boring.2.0.0/B-Boring';

  // Try multiple SOAP variants
  const variants = [
    {
      contentType: 'text/xml; charset=utf-8',
      action: 'getBoring',
      body: `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gro="http://groundwater.miljoeportal.geus.dk/">
  <soapenv:Body><gro:getBoring><dguNr>${normalized}</dguNr></gro:getBoring></soapenv:Body>
</soapenv:Envelope>`
    },
    {
      contentType: 'text/xml; charset=utf-8',
      action: 'getBoring',
      body: `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gro="http://groundwater.miljoeportal.geus.dk/">
  <soapenv:Body><gro:getBoring><arg0>${normalized}</arg0></gro:getBoring></soapenv:Body>
</soapenv:Envelope>`
    },
    {
      contentType: 'application/soap+xml; charset=utf-8',
      action: 'getBoring',
      body: `<?xml version="1.0" encoding="UTF-8"?>
<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:gro="http://groundwater.miljoeportal.geus.dk/">
  <env:Body><gro:getBoring><dguNr>${normalized}</dguNr></gro:getBoring></env:Body>
</env:Envelope>`
    },
  ];

  const results = [];
  for (const v of variants) {
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': v.contentType,
          'SOAPAction': `"${v.action}"`,
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/xml, application/xml, */*',
        },
        body: v.body,
      });
      const text = await r.text();
      results.push({ action: v.action, ct: v.contentType.substring(0,20), status: r.status, body: text.substring(0, 600) });
      
      if (r.ok || (r.status === 200)) {
        // Parse successful response
        const get = (tag) => {
          const m = text.match(new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([^<]*)<`, 'i'));
          return m ? m[1].trim() : null;
        };
        const result = {
          dgu: normalized,
          adresse: [get('vejnavn'), get('husnr'), get('postnr'), get('postdistrikt')].filter(Boolean).join(' ') || get('adresse') || null,
          boredybde: get('borDybde') || get('boredybde') || get('totalDepth') || null,
          filterTop: get('filterTop') || get('filter_top') || null,
          filterBund: get('filterBund') || get('filterNed') || get('filter_bund') || null,
          xkoord: get('xKoord') || get('xkoord') || get('utmx') || null,
          ykoord: get('yKoord') || get('ykoord') || get('utmy') || null,
          raw: text.substring(0, 3000),
        };
        if (result.xkoord && result.ykoord) {
          const x = parseFloat(result.xkoord); const y = parseFloat(result.ykoord);
          if (x > 100000) { result.lat = 56+(y-6200000)/111000; result.lng = 9+(x-500000)/55000; }
        }
        res.status(200).json(result);
        return;
      }
    } catch(e) {
      results.push({ action: v.action, error: e.message });
    }
  }

  // Return all results for debugging
  res.status(502).json({ error: 'Ingen varianter virkede', normalized, results });
}
