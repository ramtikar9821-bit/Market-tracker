const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const PRICE_URL = 'https://goldpricez.com/us/gram';
const PRICE_REGEX = /Gold Price per Gram is \$([\d,]+\.?\d*)/;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function pullNow(env) {
  const response = await fetch(PRICE_URL, {
    headers: { 'User-Agent': USER_AGENT },
  });
  const html = await response.text();

  const match = html.match(PRICE_REGEX);
  if (!match) {
    throw new Error('Price pattern not found in page');
  }

  const rawText = match[0];
  const value = parseFloat(match[1].replace(/,/g, ''));

  const result = await env.DB.prepare(
    'INSERT INTO readings (value, raw_text) VALUES (?, ?) RETURNING id, value, raw_text, captured_at'
  )
    .bind(value, rawText)
    .first();

  return result;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === '/api/readings' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, value, raw_text, captured_at FROM readings ORDER BY captured_at ASC'
      ).all();

      return new Response(JSON.stringify(results), { headers: CORS_HEADERS });
    }

    if (url.pathname === '/api/pull-now' && request.method === 'GET') {
      try {
        const result = await pullNow(env);
        return new Response(JSON.stringify(result), { headers: CORS_HEADERS });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: CORS_HEADERS,
        });
      }
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(pullNow(env));
  },
};
