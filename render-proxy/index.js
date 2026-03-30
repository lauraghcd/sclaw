import http from "node:http";
import https from "node:https";

const TARGET_BASE = "https://openrouter.ai/api";
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // 健康检查
  if (req.url === "/health") {
    res.writeHead(200);
    return res.end("ok");
  }

  // 构建目标 URL：/v1/chat/completions -> https://openrouter.ai/api/v1/chat/completions
  const targetUrl = new URL(TARGET_BASE + req.url);

  // 收集请求 body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  // 构建转发 headers
  const fwdHeaders = { ...req.headers };
  delete fwdHeaders.host;
  delete fwdHeaders.connection;
  fwdHeaders.host = targetUrl.host;

  // 转发请求
  const proxyReq = https.request(targetUrl, {
    method: req.method,
    headers: fwdHeaders,
  }, (proxyRes) => {
    // 透传响应（包括 SSE 流式）
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: err.message }));
  });

  if (body.length > 0) proxyReq.write(body);
  proxyReq.end();
});

server.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
