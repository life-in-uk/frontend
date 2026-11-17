// A local stand-in for the production edge (docs/deploy-cloudfront.md), so the
// generated viewer-request function and the whole hosting contract can be
// verified before anything exists in AWS:
//
//   node scripts/edge/emulator.mjs [distDir] [port] [apiBase]
//   npm run edge:emulate          (dist/, port 4180, API http://127.0.0.1:8188)
//
// Per request it does what the CloudFront distribution does:
//   1. runs the viewer-request function (generated from dist/, as on deploy);
//   2. a generated response (301, 404) is returned as is;
//   3. /api/*, /sitemap.xml and /robots.txt go to the backend unchanged, and
//      its status, headers and body come back unchanged: the distribution
//      has no custom error responses, so API JSON errors survive;
//   4. everything else is an S3 GetObject of the (rewritten) key from the
//      upload set, with the upload's Content-Type and Cache-Control; a missing
//      key is S3's 404 NoSuchKey (the bucket policy grants s3:ListBucket).
// Not emulated: TLS, compression of S3 objects and edge caching.
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { uploadObjects } from "./objects.mjs";
import { generateViewerRequest, loadViewerRequest } from "./viewer-request.mjs";

const API_PATH = (path) => path.startsWith("/api/") || path === "/sitemap.xml" || path === "/robots.txt";
const FORWARDED = ["accept", "accept-encoding", "accept-language", "user-agent", "if-none-match", "if-modified-since"];
const RETURNED = ["content-type", "content-encoding", "cache-control", "vary", "etag", "last-modified", "location"];

function proxy(apiBase, method, pathAndQuery, req, res) {
  const target = new URL(pathAndQuery, apiBase);
  const headers = {};
  for (const name of FORWARDED) if (req.headers[name]) headers[name] = req.headers[name];
  const send = target.protocol === "https:" ? httpsRequest : httpRequest;
  const upstream = send(target, { method, headers }, (answer) => {
    const out = {};
    for (const name of RETURNED) if (answer.headers[name]) out[name] = answer.headers[name];
    res.writeHead(answer.statusCode ?? 502, out);
    answer.pipe(res);
  });
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("origin unreachable");
  });
  req.pipe(upstream);
}

export function createEdgeEmulator({ distDir, code, apiBase }) {
  const objects = new Map(uploadObjects(resolve(distDir)).map((object) => [object.key, object]));
  const handle = loadViewerRequest(code);
  return createServer((req, res) => {
    const [rawPath, rawQuery = ""] = (req.url ?? "/").split(/\?(.*)/s);
    const querystring = {};
    for (const part of rawQuery.split("&").filter(Boolean)) {
      const [name, value = ""] = part.split(/=(.*)/s);
      const entry = { value };
      if (!querystring[name]) querystring[name] = entry;
      else (querystring[name].multiValue ??= [{ value: querystring[name].value }]).push(entry);
    }
    const event = {
      version: "1.0",
      context: { eventType: "viewer-request" },
      viewer: { ip: req.socket.remoteAddress ?? "127.0.0.1" },
      request: { method: req.method, uri: rawPath, querystring, headers: req.headers.host ? { host: { value: req.headers.host } } : {}, cookies: {} },
    };
    let result;
    try {
      result = handle(event);
    } catch (error) {
      res.writeHead(503, { "content-type": "text/plain" }).end(`function error: ${error.message}`);
      return;
    }
    if (result.statusCode) {
      const headers = {};
      for (const [name, { value }] of Object.entries(result.headers ?? {})) headers[name] = value;
      res.writeHead(result.statusCode, headers);
      res.end(req.method === "HEAD" || !result.body ? undefined : result.body.data);
      return;
    }
    if (API_PATH(result.uri)) {
      proxy(apiBase, req.method, rawQuery ? `${result.uri}?${rawQuery}` : result.uri, req, res);
      return;
    }
    let key;
    try {
      key = decodeURIComponent(result.uri.slice(1));
    } catch {
      key = "";
    }
    const object = objects.get(key);
    if (!object || (req.method !== "GET" && req.method !== "HEAD")) {
      res.writeHead(object ? 403 : 404, { "content-type": "application/xml" });
      res.end(req.method === "HEAD" ? undefined
        : `<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>${object ? "MethodNotAllowed" : "NoSuchKey"}</Code><Key>${key.replace(/[<>&]/g, "")}</Key></Error>`);
      return;
    }
    res.writeHead(200, { "content-type": object.contentType, "cache-control": object.cacheControl });
    res.end(req.method === "HEAD" ? undefined : readFileSync(object.file));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] || "dist";
  const port = Number(process.argv[3] || 4180);
  const apiBase = process.argv[4] || process.env.API_BASE || "http://127.0.0.1:8188";
  const { code, bytes } = generateViewerRequest({ distDir: dist });
  createEdgeEmulator({ distDir: dist, code, apiBase }).listen(port, "127.0.0.1", () =>
    console.log(`edge emulator: http://127.0.0.1:${port} (send Host: lifeinuk.info), function ${bytes} bytes, API ${apiBase}`));
}
