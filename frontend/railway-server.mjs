import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import next from "next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const backendRoot = join(projectRoot, "backend");

const port = Number(process.env.PORT || 3000);
const backendPort = Number(process.env.INTERNAL_BACKEND_PORT || 8000);
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const dev = false;

function startBackend() {
  const command = process.platform === "win32" ? "python" : "python";
  const args = [
    "-m",
    "gunicorn",
    "config.wsgi:application",
    "--bind",
    `127.0.0.1:${backendPort}`,
    "--workers",
    "3",
    "--threads",
    "2",
    "--timeout",
    "120",
  ];

  const child = spawn(command, args, {
    cwd: backendRoot,
    env: {
      ...process.env,
      DJANGO_SETTINGS_MODULE: "config.settings",
    },
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    const nextCode = typeof code === "number" ? code : 1;
    process.exit(nextCode);
  });

  return child;
}

async function waitForBackend(maxAttempts = 60) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${backendOrigin}/api/auth/login/`, {
        method: "OPTIONS",
      });
      if (response.ok || response.status === 405 || response.status === 400) {
        return;
      }
    } catch {
      // Backend is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Backend did not become ready in time.");
}

async function proxyToBackend(req, res) {
  const controller = new AbortController();
  req.on("close", () => controller.abort());

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
      return;
    }
    if (value !== undefined) {
      headers.set(key, value);
    }
  });
  headers.set("host", `127.0.0.1:${backendPort}`);

  const hasBody = req.method && !["GET", "HEAD"].includes(req.method.toUpperCase());
  const response = await fetch(`${backendOrigin}${req.url}`, {
    method: req.method,
    headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? "half" : undefined,
    signal: controller.signal,
  });

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") {
      return;
    }
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  for await (const chunk of response.body) {
    res.write(chunk);
  }
  res.end();
}

const backend = startBackend();
await waitForBackend();

const app = next({ dev, dir: __dirname, hostname: "0.0.0.0", port });
await app.prepare();
const handle = app.getRequestHandler();

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Missing request URL.");
      return;
    }

    if (
      req.url.startsWith("/api/") ||
      req.url.startsWith("/admin/") ||
      req.url.startsWith("/static/")
    ) {
      await proxyToBackend(req, res);
      return;
    }

    await handle(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
    }
    res.end("Internal server error");
  }
});

server.listen(port, "0.0.0.0");
await once(server, "listening");
console.log(`Unified Railway server listening on port ${port}`);

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down.`);
  server.close(() => {
    backend.kill(signal);
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
