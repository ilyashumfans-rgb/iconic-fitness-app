import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import healthRouter from "./routes/health";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/adminAuth";
import { seedDefaultAdmin } from "./lib/seedAdmin";
import { seedFromSnapshot } from "./lib/seedFromSnapshot";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

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

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

void seedDefaultAdmin();
void seedFromSnapshot();

export default app;
