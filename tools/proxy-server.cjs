const http = require('http');
const https = require('https');

/**
 * Only YouTube API traffic may go through the proxy. Without this check any
 * device on the network could use it to reach arbitrary hosts, including
 * other machines on the LAN.
 * @param {URL} target
 */
function isAllowedTarget(target) {
  return (
    target.protocol === 'https:' &&
    (target.port === '' || target.port === '443') &&
    (target.hostname === 'youtube.com' ||
      target.hostname.endsWith('.youtube.com'))
  );
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url ?? '/', 'http://localhost');

  // Handle CORS preflight for all endpoints
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    return res.end();
  }

  // Logger endpoint
  if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/log') {
    const log = parsedUrl.searchParams.get('log');
    if (log) {
      console.log(log);
    }

    // Return a transparent 1x1 pixel image
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Access-Control-Allow-Origin': '*'
    });
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    return res.end(pixel);
  }

  // Ping endpoint for auto-discovery by TV apps
  if (parsedUrl.pathname === '/ping') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({ service: 'yt-proxy' }));
  }

  // Proxy endpoint
  if (parsedUrl.pathname === '/proxy') {
    const targetUrlStr = parsedUrl.searchParams.get('url');
    if (!targetUrlStr) {
      res.writeHead(400);
      return res.end('Missing URL parameter');
    }

    try {
      const targetUrl = new URL(targetUrlStr);
      if (!isAllowedTarget(targetUrl)) {
        res.writeHead(403, { 'Access-Control-Allow-Origin': '*' });
        return res.end('Target not allowed');
      }
      const client = https;

      // Copy headers, but remove restricted ones
      const headers = { ...req.headers };
      delete headers['host'];
      delete headers['origin'];
      delete headers['referer'];
      // Sometimes accept-encoding can mess up proxy responses if we don't decode them,
      // so we remove it and let Node fetch it transparently.
      delete headers['accept-encoding'];

      const options = {
        hostname: targetUrl.hostname,
        port: 443,
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers: headers
      };

      const proxyReq = client.request(options, (proxyRes) => {
        // Prepare response headers, appending CORS
        const responseHeaders = { ...proxyRes.headers };
        responseHeaders['Access-Control-Allow-Origin'] = '*';

        res.writeHead(proxyRes.statusCode || 200, responseHeaders);
        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on('error', (e) => {
        console.error(`[Proxy Error] ${e.message}`);
        res.writeHead(500, { 'Access-Control-Allow-Origin': '*' });
        res.end(`Proxy Error: ${e.message}`);
      });

      // Pipe request body to proxy request
      req.pipe(proxyReq, { end: true });
    } catch {
      console.error(`[Proxy Error] Invalid URL: ${targetUrlStr}`);
      res.writeHead(400, { 'Access-Control-Allow-Origin': '*' });
      return res.end('Invalid URL');
    }
    return;
  }

  // Not found
  res.writeHead(404);
  res.end('Not Found');
});

const PORT = 3000;

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[YouTube Premium proxy] Listening on http://0.0.0.0:${PORT}`);
  });
}

module.exports = { isAllowedTarget, server };
