export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, course, role } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('Missing Airtable credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Save to Airtable
    const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Leads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{
          fields: {
            Name: name,
            Email: email,
            Phone: phone,
            'Business Name': course || '',
            Message: role ? 'Role: ' + role : '',
            Status: 'New',
            Source: 'Golf with Herb Landing Page',
          },
        }],
      }),
    });

    if (!airtableRes.ok) {
      const detail = await airtableRes.text();
      console.error('Airtable error:', detail);
    }

    // Send email notification via sleftpayments API
    try {
      await fetch('https://www.sleftpayments.com/api/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          businessName: course || 'Golf Lead',
          conversationSummary: 'New Golf Lead from golf-sleft.vercel.app. Role: ' + (role || 'N/A'),
        }),
      });
    } catch (emailErr) {
      console.error('Email notification failed:', emailErr);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Lead submission error:', err);
    return res.status(500).json({ error: 'Failed to submit lead' });
  }
}
