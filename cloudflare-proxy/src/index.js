export default {
  async fetch(request, env) {
    // 简单的鉴权，防止被滥用
    const authHeader = request.headers.get("x-proxy-key");
    if (authHeader !== env.PROXY_KEY) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    let targetUrl;

    // 路由：/claude/* -> Anthropic API
    if (path.startsWith("/claude/")) {
      const apiPath = path.replace("/claude", "");
      targetUrl = `https://api.anthropic.com${apiPath}`;
    }
    // 路由：/gemini/* -> Google AI API
    else if (path.startsWith("/gemini/")) {
      const apiPath = path.replace("/gemini", "");
      targetUrl = `https://generativelanguage.googleapis.com${apiPath}`;
    }
    else {
      return new Response("Not Found", { status: 404 });
    }

    // 复制原始请求的 headers，去掉代理鉴权头
    const headers = new Headers(request.headers);
    headers.delete("x-proxy-key");
    headers.delete("host");

    // 转发请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== "GET" ? request.body : undefined,
    });

    // 返回响应，支持流式输出
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  },
};
