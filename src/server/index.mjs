import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { createHandler } from './handler.mjs';

const handler = createHandler();
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const server = createServer(
  { maxHeaderSize: 16384, requestTimeout: 30000, headersTimeout: 10000 },
  async (incoming, outgoing) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size <= 65536) chunks.push(chunk);
      else tooLarge = true;
      if (size > 131072) {
        incoming.destroy();
        return;
      }
    }
    if (tooLarge) {
      outgoing.writeHead(413, { 'Content-Type': 'application/json' });
      outgoing.end('{"error":"Request is too large."}');
      return;
    }
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers))
        if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      // Host is not trusted when constructing routing context.
      const request = new Request(`http://127.0.0.1:${port}${incoming.url || '/'}`, {
        method: incoming.method || 'GET',
        headers,
        ...(['GET', 'HEAD'].includes(incoming.method || 'GET')
          ? {}
          : { body: Buffer.concat(chunks) }),
      });
      const response = await handler(request, incoming.socket.remoteAddress || 'unknown');
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/json' });
      outgoing.end('{"error":"Request could not be completed."}');
    }
  },
);
server.listen(port, host, () =>
  process.stdout.write(`Shipaton service listening on ${host}:${port}\n`),
);
