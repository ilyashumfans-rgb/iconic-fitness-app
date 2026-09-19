import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Route-wiring regression checks: no live member reads/writes in this test.
const route = readFileSync(new URL("../routes/fitnessJourney.ts", import.meta.url), "utf8");

test("journey first-claims only unowned rows before account-bound reads", () => {
  for (const table of ["trainerBookingsTable", "ptProgramsTable"]) {
    assert.match(route, new RegExp(`db\\.update\\(${table}\\)\\.set\\(\\{ userId: req\\.userId! \\}\\)\\.where\\(and\\(\\s*isNull\\(${table}\\.userId\\)`));
  }
  assert.match(route, /db\.select\(\)\.from\(ptProgramsTable\)\.where\(eq\(ptProgramsTable\.userId, req\.userId!\)\)/);
  assert.doesNotMatch(route, /or\(eq\(trainerBookingsTable\.userId, req\.userId!\),\s*sql`/);
});

test("enquiry join cannot bypass account ownership or expose foreign sessions", () => {
  assert.match(route, /linkedPrograms = enquiryPrograms\.filter\(p => p\.userId === req\.userId\)/);
  assert.match(route, /enquiries = matchingEnquiries\.filter\(e => !foreignRefs\.has\(e\.id\)\)/);
  assert.match(route, /inArray\(ptSessionsTable\.refId, linkedPrograms\.map\(p => p\.refId\)\)/);
  assert.match(route, /sessions = program \? await listPtSessions\("enquiry", program\.refId\) : \[\]/);
  assert.match(route, /fetchPtAssignmentMap\("enquiry", program \? \[program\.refId\] : \[\]\)/);
});

test("automatic sync accepts no client mobile and fails closed on receipt conflicts", () => {
  const start = route.indexOf('router.post("/memberships/sync/automatic"');
  const end = route.indexOf('router.get("/memberships/journey"', start);
  const automaticRoute = route.slice(start, end);
  assert.match(automaticRoute, /trustedMobileSyncIdentity\(account\.privateMetadata\.iconicMobileSync, now\)/);
  assert.match(automaticRoute, /currentMobile && currentMobile !== receipt\.mobile/);
  assert.doesNotMatch(automaticRoute, /req\.body/);
  assert.doesNotMatch(automaticRoute, /updateUserMetadata/);
});

test("automatic blank-mobile restore cannot clobber a newer explicit sync", () => {
  const start = route.indexOf('router.post("/memberships/sync/automatic"');
  const end = route.indexOf('router.get("/memberships/journey"', start);
  const automaticRoute = route.slice(start, end);
  assert.match(automaticRoute, /or\(eq\(usersTable\.mobile, ""\), isNull\(usersTable\.mobile\)\)/);
  assert.match(automaticRoute, /if \(!restored\)/);
  assert.match(automaticRoute, /normalizeMobile\(latest\?\.mobile\) !== receipt\.mobile/);
});