import { Hono } from 'hono';
import { R2Bucket } from '@cloudflare/workers-types';

type Bindings = {
  BBS_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post('/upload', async (c) => {
  try {
    if (!c.env.BBS_BUCKET) {
      return c.json({
        success: false,
        error: 'R2 bucket (BBS_BUCKET) is not bound in wrangler.jsonc. You can also paste direct image URLs.',
      }, 500);
    }

    const formData = await c.req.parseBody();
    const file = formData['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No valid file uploaded' }, 400);
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSizeBytes) {
      return c.json({ success: false, error: 'File size exceeds 10MB limit' }, 400);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ success: false, error: 'Unsupported file type. Allowed: JPG, PNG, GIF, WEBP, MP4, WEBM' }, 400);
    }

    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
    };
    const ext = extMap[file.type] || '';
    const randomStr = Math.random().toString(36).substring(2, 10);
    const filename = `${Date.now()}_${randomStr}${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    await c.env.BBS_BUCKET.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const fileUrl = `/api/media/${filename}`;

    return c.json({
      success: true,
      file_url: fileUrl,
      file_name: file.name || filename,
      file_size: file.size,
      file_type: file.type,
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/:filename', async (c) => {
  try {
    if (!c.env.BBS_BUCKET) {
      return c.text('R2 bucket not bound', 500);
    }

    const filename = c.req.param('filename');
    const object = await c.env.BBS_BUCKET.get(filename);

    if (!object) {
      return c.text('File not found', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers as any);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body as any, {
      headers,
    });
  } catch (error: any) {
    return c.text(error.message, 500);
  }
});

export default app;
