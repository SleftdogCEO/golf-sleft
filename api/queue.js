// Simple Queue API for Golf Sleft
// For now, uses in-memory storage (resets on redeploy)
// TODO: Add Vercel KV for persistence when ready

// In-memory storage (temporary)
let queuedPosts = [];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ posts: queuedPosts });
    }

    if (req.method === 'POST') {
      const { caption, imageUrl, source, type } = req.body;

      if (!caption && !imageUrl) {
        return res.status(400).json({ error: 'Caption or image required' });
      }

      const newPost = {
        id: Date.now().toString(),
        caption: caption || '',
        imageUrl: imageUrl || null,
        source: source || 'api',
        type: type || 'from-telegram',
        createdAt: new Date().toISOString(),
        posted: false
      };

      queuedPosts.unshift(newPost);

      // Keep only last 50 posts in memory
      if (queuedPosts.length > 50) {
        queuedPosts = queuedPosts.slice(0, 50);
      }

      return res.status(201).json({
        success: true,
        message: 'Post added to queue',
        post: newPost
      });
    }

    if (req.method === 'DELETE') {
      const { id, action } = req.body;

      if (action === 'mark-posted') {
        queuedPosts = queuedPosts.map(p =>
          p.id === id ? { ...p, posted: true, postedAt: new Date().toISOString() } : p
        );
      } else {
        queuedPosts = queuedPosts.filter(p => p.id !== id);
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Queue API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
