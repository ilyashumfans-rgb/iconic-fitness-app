import assert from "node:assert/strict";
import { test } from "node:test";
import { build, type Plugin } from "esbuild";

type Receipt = { version: number; mobile: string; memberId: number; syncedAt: number };
type ResponseResult = { status: number; body: unknown };

const harnessKey = Symbol.for("fitnessJourneyAutomaticRouteTest");
const routes = new Map<string, (...args: any[]) => Promise<void>>();
const state = {
  mobile: "9000000000" as string | null,
  receipt: null as Receipt | null,
  fetchMember: async (_mobile: string): Promise<{ memberId: number } | null> => ({ memberId: 42 }),
  metadataWrites: 0,
};

const containsBlankGuard = (condition: unknown): boolean =>
  JSON.stringify(condition).includes('"isNull"');

const db = {
  select: (_selection: unknown) => ({
    from: (_table: unknown) => ({
      where: async (_condition: unknown) => [{ mobile: state.mobile }],
    }),
  }),
  update: (_table: unknown) => ({
    set: (values: { mobile?: string }) => ({
      where: (condition: unknown) => {
        const apply = () => {
          if (values.mobile === undefined) return [];
          if (containsBlankGuard(condition) && state.mobile !== "" && state.mobile !== null) return [];
          state.mobile = values.mobile;
          return [{ mobile: state.mobile }];
        };
        return {
          then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
            Promise.resolve().then(apply).then(resolve, reject),
          returning: async (_selection: unknown) => apply(),
        };
      },
    }),
  }),
};

(globalThis as any)[harnessKey] = {
  routes,
  db,
  state,
  clerkClient: {
    users: {
      getUser: async () => ({
        // Return a snapshot, as the real Clerk read does.
        privateMetadata: { iconicMobileSync: state.receipt && { ...state.receipt } },
      }),
      updateUserMetadata: async (_id: string, update: any) => {
        state.metadataWrites++;
        state.receipt = { ...update.privateMetadata.iconicMobileSync };
      },
    },
  },
};

// All network, Clerk, and database boundaries are virtual modules. The bundled
// code under test is the real route module and its real receipt validation.
const mocks: Record<string, string> = {
  express: `
    const h = globalThis[Symbol.for("fitnessJourneyAutomaticRouteTest")];
    export function Router() {
      return {
        post(path, ...handlers) { h.routes.set("POST " + path, handlers.at(-1)); return this; },
        get(path, ...handlers) { h.routes.set("GET " + path, handlers.at(-1)); return this; },
      };
    }
  `,
  "@clerk/express": `
    const h = globalThis[Symbol.for("fitnessJourneyAutomaticRouteTest")];
    export const clerkClient = h.clerkClient;
  `,
  "drizzle-orm": `
    export const eq = (...args) => ({ op: "eq", args });
    export const and = (...args) => ({ op: "and", args });
    export const or = (...args) => ({ op: "or", args });
    export const isNull = (...args) => ({ op: "isNull", args });
    export const desc = (...args) => ({ op: "desc", args });
    export const inArray = (...args) => ({ op: "inArray", args });
    export const ne = (...args) => ({ op: "ne", args });
    export const sql = (parts, ...values) => ({ op: "sql", parts, values });
  `,
  "@workspace/db": `
    const h = globalThis[Symbol.for("fitnessJourneyAutomaticRouteTest")];
    export const db = h.db;
    export const usersTable = { id: "users.id", mobile: "users.mobile", createdAt: "users.createdAt" };
    export const leadsTable = {};
    export const ptProgramsTable = {};
    export const ptMembershipsTable = {};
    export const trainerBookingsTable = {};
    export const ptSessionsTable = {};
    export const ptTrialFeedbackTable = {};
  `,
  "@workspace/api-zod": `
    export const AutoSyncMemberMobileResponse = { parse: value => value };
    export const GetFitnessJourneyResponse = { parse: value => value };
    export const SyncMemberMobileBody = {
      safeParse: value => typeof value?.mobile === "string"
        ? { success: true, data: value } : { success: false },
    };
  `,
  "../lib/currentUser": `export const requireUser = (_req, _res, next) => next();`,
  "../lib/trainerEnquiryLeads": `export const TRAINER_ENQUIRY_SOURCE = "test";`,
  "../lib/ptSessions": `export const listPtSessions = async () => [];`,
  "../lib/ptAssignments": `export const fetchPtAssignmentMap = async () => new Map();`,
  "../lib/trainerPhotos": `export const trainerPhotoMap = async () => new Map();`,
  "../lib/yoactiv": `
    const h = globalThis[Symbol.for("fitnessJourneyAutomaticRouteTest")];
    export const fetchYoactivMemberByMobile = (mobile, options) => h.state.fetchMember(mobile, options);
    export const normalizeMobile = value => {
      if (typeof value !== "string") return null;
      const digits = value.replace(/\\D/g, "").slice(-10);
      return digits.length === 10 ? digits : null;
    };
    export const pickPrimaryMembership = () => null;
  `,
};

const mockPlugin: Plugin = {
  name: "controlled-route-boundaries",
  setup(buildApi) {
    buildApi.onResolve({ filter: /.*/ }, args =>
      Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "route-mock" } : undefined);
    buildApi.onLoad({ filter: /.*/, namespace: "route-mock" }, args => ({
      contents: mocks[args.path],
      loader: "js",
    }));
  },
};

const bundled = await build({
  entryPoints: [new URL("./fitnessJourney.ts", import.meta.url).pathname],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  plugins: [mockPlugin],
});
await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const automatic = routes.get("POST /memberships/sync/automatic")!;
const explicit = routes.get("POST /memberships/sync")!;

async function invoke(handler: (...args: any[]) => Promise<void>, body: unknown = {}): Promise<ResponseResult> {
  const result: ResponseResult = { status: 200, body: undefined };
  const response = {
    status(code: number) { result.status = code; return this; },
    json(bodyValue: unknown) { result.body = bodyValue; return this; },
  };
  await handler({ body, clerkUserId: "clerk-a", userId: "user-a" }, response);
  return result;
}

function trustedReceipt(mobile: string, memberId = 42): Receipt {
  return { version: 1, mobile, memberId, syncedAt: Date.now() - 1_000 };
}

test("actual automatic handler accepts a trusted receipt for existing and blank local mobiles", async () => {
  for (const initialMobile of ["9000000000", ""]) {
    state.mobile = initialMobile;
    state.receipt = trustedReceipt("9000000000");
    state.metadataWrites = 0;
    state.fetchMember = async mobile => {
      assert.equal(mobile, "9000000000");
      return { memberId: 42 };
    };

    assert.deepEqual(await invoke(automatic), {
      status: 200,
      body: { synced: true, reason: "synced" },
    });
    assert.equal(state.mobile, "9000000000");
    assert.equal(state.metadataWrites, 0, "automatic sync must not rewrite its trusted receipt");
  }
});

test("actual automatic handler permits a clean retry after an upstream failure", async () => {
  state.mobile = "9000000000";
  state.receipt = trustedReceipt("9000000000");
  let attempts = 0;
  state.fetchMember = async () => ++attempts === 1 ? null : { memberId: 42 };

  assert.deepEqual(await invoke(automatic), {
    status: 503,
    body: { error: "Membership refresh is temporarily unavailable. Please retry." },
  });
  assert.deepEqual(await invoke(automatic), {
    status: 200,
    body: { synced: true, reason: "synced" },
  });
  assert.equal(attempts, 2);
});

test("in-flight automatic lookup cannot overwrite a newer explicit mobile and receipt", async () => {
  state.mobile = "";
  state.receipt = trustedReceipt("9000000000", 42);
  state.metadataWrites = 0;
  let releaseOld!: () => void;
  const oldLookup = new Promise<void>(resolve => { releaseOld = resolve; });
  state.fetchMember = async mobile => {
    if (mobile === "9000000000") {
      await oldLookup;
      return { memberId: 42 };
    }
    assert.equal(mobile, "9111111111");
    return { memberId: 84 };
  };

  const staleAutomatic = invoke(automatic);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(await invoke(explicit, { mobile: "9111111111" }), {
    status: 200,
    body: { synced: true },
  });
  releaseOld();

  assert.deepEqual(await staleAutomatic, {
    status: 200,
    body: { synced: false, reason: "mobile_conflict" },
  });
  assert.equal(state.mobile, "9111111111");
  assert.equal(state.receipt?.mobile, "9111111111");
  assert.equal(state.receipt?.memberId, 84);
  assert.equal(state.metadataWrites, 1, "only the explicit sync writes Clerk metadata");
});