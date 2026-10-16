/**
 * The game's Worker: the static game for now. The daily leaderboard comes
 * under /api, replaying each run's inputs through the simulation as Hash
 * Driller's does.
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
    return env.ASSETS.fetch(req);
  },
};
