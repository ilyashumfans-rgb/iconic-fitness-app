export * from "./generated/api";
export * from "./generated/types";
// Both generated modules export a `GetPackageBookingParams` (the Zod path-param
// schema in api.ts, the TS query-param type in types/). Server code imports the
// Zod schema, so re-export that one explicitly to resolve the ambiguity.
export { GetPackageBookingParams, ApplyReferralCodeBody } from "./generated/api";
