import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import healthRouter from "./routes/health";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/adminAuth";
import { requireUser } from "./lib/currentUser";
import { seedDefaultAdmin } from "./lib/seedAdmin";
import { seedFromSnapshot } from "./lib/seedFromSnapshot";
import { ensureClerkNativeRedirectUrls } from "./lib/clerkNativeRedirects";
import { ensureFitnessSetupTable } from "./lib/fitnessSetup";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();
const communityUploadAttempts = new Map<string, { count: number; resetAt: number }>();

function communityUploadRateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  const keys = [`user:${req.userId ?? "unknown"}`, `ip:${req.ip ?? "unknown"}`];
  for (const key of keys) {
    const current = communityUploadAttempts.get(key);
    if (current && current.resetAt > now && current.count >= 6) {
      res.status(429).json({ error: "Too many community submissions. Please try again later." });
      return;
    }
  }
  for (const key of keys) {
    const current = communityUploadAttempts.get(key);
    if (!current || current.resetAt <= now) {
      communityUploadAttempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    } else {
      current.count += 1;
    }
  }
  next();
}

// Replit's reverse proxy terminates HTTPS in front of us. Without this,
// Express sees the request as HTTP and refuses to set `secure: true` cookies,
// which silently breaks session-based auth (admin/partner/vendor/staff login).
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// The startup/health probe must NOT depend on the database or session store.
// Mounting it before session & clerk middleware guarantees a 200 even when the
// DB is briefly unavailable during a deploy's promote step — otherwise the
// session store errors out and the probe 500s, failing the whole deployment.
app.use("/api", healthRouter);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Gzip/brotli response compression — JSON list payloads (gyms, classes,
// store catalog) shrink ~5-10x on the wire, which matters a lot on Indian
// mobile networks and cuts egress under heavy load.
app.use(compression());

app.use(cors({ origin: true, credentials: true }));

// Expo/EAS builds run outside Replit and cannot inherit the deployment's
// environment variables. Publish the non-secret Clerk client configuration
// from the API they are actually connected to so native builds always use the
// matching Development or Production Clerk instance.
app.get("/api/auth/config", (req, res) => {
  const publishableKey = publishableKeyFromHost(
    getClerkProxyHost(req) ?? "",
    process.env.CLERK_PUBLISHABLE_KEY,
  );
  if (!publishableKey) {
    res.status(503).json({ error: "Authentication is not configured" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({
    publishableKey,
    proxyPath: process.env.NODE_ENV === "production" ? CLERK_PROXY_PATH : "",
  });
});

// Excel lead imports post up to 1000 parsed rows in one JSON body.
app.use("/api/admin/leads/import", express.json({ limit: "5mb" }));
app.use(sessionMiddleware);
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// Authenticate the only large member JSON request *before* buffering its two
// base64 photos. This deliberately sits after session + Clerk and before the
// small global parser; unauthenticated callers cannot consume 23MB bodies.
// Two 8MB photos expand to roughly 21.4MB when base64 encoded in JSON.
app.post(
  "/api/community",
  requireUser,
  communityUploadRateLimit,
  express.json({ limit: "23mb" }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

void seedDefaultAdmin();
void seedFromSnapshot();
void ensureClerkNativeRedirectUrls();
void ensureFitnessSetupTable();

export default app;
