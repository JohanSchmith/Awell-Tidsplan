export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { dgu } = req.query;
  if (!dgu) { res.status(400).json({ error: 'Mangler dgu parameter' }); return; }

  const normalized = dgu.replace(/^DGU\s*/i, '').trim();

  // SOAP request to GEUS B-Boring webservice
  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gro="http://groundwater.miljoeportal.geus.dk/">
  <soapenv:Header/>
  <soapenv:Body>
    <gro:getBoring>
      <dguNr>${normalized}</dguNr>
    </gro:getBoring>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const response = await fetch(
      'https://webs.geus.dk/miljoeportal.groundwater.b-boring.2.0.0/B-Boring',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/xml, application/xml',
        },
        body: soapBody,
      }
    );

    const text = await response.text();
    
    if (!response.ok) {
      res.status(502).json({ error: `HTTP ${response.status}`, detail: text.substring(0, 500) });
      return;
    }

    // Parse XML response
    // Extract key fields using regex (no XML parser needed for simple fields)
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
      xkoord: get('xKoord') || get('xkoord') || null,
      ykoord: get('yKoord') || get('ykoord') || null,
      raw: text.substring(0, 2000),
    };

    // Convert Danish UTM32 coordinates to WGS84 if available
    if (result.xkoord && result.ykoord) {
      const x = parseFloat(result.xkoord);
      const y = parseFloat(result.ykoord);
      if (x > 100000) {
        result.lat = 56 + (y - 6200000) / 111000;
        result.lng = 9 + (x - 500000) / 55000;
      }
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
