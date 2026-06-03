export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { dgu } = req.query;
  if (!dgu) { res.status(400).json({ error: 'Mangler dgu parameter' }); return; }

  const normalized = dgu.replace(/^DGU\s*/i, '').trim();
  const endpoint = 'https://webs.geus.dk/miljoeportal.groundwater.b-boring.2.0.0/B-Boring';

  // Test 1: Can we reach webs.geus.dk at all?
  let connectTest = {};
  try {
    const r = await fetch(endpoint + '?wsdl', { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await r.text();
    connectTest = { status: r.status, preview: text.substring(0, 300) };
  } catch(e) {
    connectTest = { error: e.message };
  }

  // Test 2: SOAP call
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gro="http://groundwater.miljoeportal.geus.dk/">
  <soapenv:Body><gro:getBoring><dguNr>${normalized}</dguNr></gro:getBoring></soapenv:Body>
</soapenv:Envelope>`;

  let soapTest = {};
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '"getBoring"', 'User-Agent': 'Mozilla/5.0' },
      body,
    });
    const text = await r.text();
    soapTest = { status: r.status, preview: text.substring(0, 500) };

    if (r.status === 200 || (text.includes('getBoring') && !text.includes('Fault'))) {
      const get = (tag) => { const m = text.match(new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([^<]*)<`, 'i')); return m ? m[1].trim() : null; };
      const result = { dgu: normalized, adresse: [get('vejnavn'),get('husnr'),get('postnr'),get('postdistrikt')].filter(Boolean).join(' ')||null, boredybde: get('borDybde')||get('boredybde')||null, filterTop: get('filterTop')||null, filterBund: get('filterBund')||get('filterNed')||null, xkoord: get('xKoord')||get('xkoord')||null, ykoord: get('yKoord')||get('ykoord')||null };
      if (result.xkoord && result.ykoord) { const x=parseFloat(result.xkoord),y=parseFloat(result.ykoord); if(x>100000){result.lat=56+(y-6200000)/111000;result.lng=9+(x-500000)/55000;} }
      res.status(200).json(result);
      return;
    }
  } catch(e) {
    soapTest = { error: e.message };
  }

  res.status(502).json({ error: 'Debug info', normalized, connectTest, soapTest });
}
