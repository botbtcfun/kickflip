/**
 * The game's Worker: the static game for now, and the clip in byte ranges.
 * The daily leaderboard comes under /api, replaying each run's inputs
 * through the simulation as Hash Driller's does.
 */
interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    if (url.pathname === '/clip.mp4') return ranged(req, await env.ASSETS.fetch(req));
    return env.ASSETS.fetch(req);
  },
};

/**
 * Answers a byte range of a static file, which static assets alone don't:
 * video players ask for one, and on iOS play nothing without it.
 */
async function ranged(req: Request, res: Response): Promise<Response> {
  const headers = new Headers(res.headers);
  headers.set('accept-ranges', 'bytes');
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
  if (res.status !== 200 || !range || (!range[1] && !range[2])) return new Response(res.body, { status: res.status, headers });
  const body = await res.arrayBuffer();
  const size = body.byteLength;
  // "bytes=a-b", "bytes=a-", or the last n bytes, "bytes=-n".
  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
  headers.set('content-range', `bytes ${start}-${end}/${size}`);
  headers.set('content-length', String(end - start + 1));
  return new Response(body.slice(start, end + 1), { status: 206, headers });
}
