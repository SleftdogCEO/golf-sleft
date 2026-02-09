// Webhook for OpenClaw to add posts from Telegram
// Herb sends content via Telegram -> OpenClaw calls this -> appears in queue

// Shared storage with queue.js (in real app, use database)
// Note: This won't persist across serverless instances - upgrade to Vercel KV for production

export const config = {
  api: {
    bodyParser: true
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  // Optional: Verify webhook secret
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers['x-webhook-secret'] !== secret) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const {
      caption,
      imageUrl,
      senderName,
      telegramMessageId,
      type = 'from-herb'
    } = body;

    if (!caption && !imageUrl) {
      return res.status(400).json({ error: 'Caption or image required' });
    }

    // Create post object
    const newPost = {
      id: Date.now().toString(),
      caption: caption || `[Photo from ${senderName || 'Herb'}]`,
      imageUrl: imageUrl || null,
      source: `telegram:${telegramMessageId || Date.now()}`,
      type,
      senderName: senderName || 'Unknown',
      createdAt: new Date().toISOString(),
      posted: false
    };

    // For now, just return success - the queue will show in the static HTML
    // When you add Vercel KV, we can persist this
    console.log('New post from webhook:', newPost);

    return res.status(200).json({
      success: true,
      message: `Content from ${senderName || 'Telegram'} received!`,
      post: newPost,
      note: 'Post logged. Add to queue.html manually or connect Vercel KV for auto-queue.'
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Failed to process webhook', details: error.message });
  }
}
