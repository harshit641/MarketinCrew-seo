import { strict as assert } from "node:assert";
import { test } from "node:test";
import { PERMISSIONS, hasPermission, hasAnyPermission, isStaff, ROLE_PERMISSIONS } from "../auth/permissions";
import { SystemRole } from "../../generated/prisma/enums";

test("Super Admin has every permission", () => {
  for (const perm of Object.values(PERMISSIONS)) {
    assert.equal(hasPermission(SystemRole.SUPER_ADMIN, perm), true, `admin should have ${perm}`);
  }
});

test("SEO Manager can approve work logs and reports but cannot manage integrations", () => {
  assert.equal(hasPermission(SystemRole.SEO_MANAGER, PERMISSIONS.APPROVE_WORKLOG), true);
  assert.equal(hasPermission(SystemRole.SEO_MANAGER, PERMISSIONS.APPROVE_REPORT), true);
  assert.equal(hasPermission(SystemRole.SEO_MANAGER, PERMISSIONS.MANAGE_INTEGRATIONS), false);
  assert.equal(hasPermission(SystemRole.SEO_MANAGER, PERMISSIONS.VIEW_AUDIT_LOGS), false);
});

test("SEO Executive can submit work logs but cannot approve them", () => {
  assert.equal(hasPermission(SystemRole.SEO_EXECUTIVE, PERMISSIONS.SUBMIT_WORKLOG), true);
  assert.equal(hasPermission(SystemRole.SEO_EXECUTIVE, PERMISSIONS.APPROVE_WORKLOG), false);
  assert.equal(hasPermission(SystemRole.SEO_EXECUTIVE, PERMISSIONS.APPROVE_REPORT), false);
  // Executives CAN now create/edit clients (per agency workflow), but still
  // cannot approve reports or deliver them.
  assert.equal(hasPermission(SystemRole.SEO_EXECUTIVE, PERMISSIONS.CREATE_CLIENT), true);
  assert.equal(hasPermission(SystemRole.SEO_EXECUTIVE, PERMISSIONS.UPDATE_CLIENT), true);
});

test("Intern can log work, create tasks, and add client data — but not create clients or approve", () => {
  assert.equal(hasPermission(SystemRole.INTERN, PERMISSIONS.SUBMIT_WORKLOG), true);
  assert.equal(hasPermission(SystemRole.INTERN, PERMISSIONS.CREATE_TASK), true);
  // Interns help populate data, so they can add keywords/backlinks/rankings.
  assert.equal(hasPermission(SystemRole.INTERN, PERMISSIONS.IMPORT_KEYWORDS), true);
  assert.equal(hasPermission(SystemRole.INTERN, PERMISSIONS.IMPORT_BACKLINKS), true);
  assert.equal(hasPermission(SystemRole.INTERN, PERMISSIONS.DOWNLOAD_REPORT), true);
  // But they cannot create clients, approve work, or deliver reports.
  assert.equal(hasPermission(SystemRole.INTERN, PERMISSIONS.CREATE_CLIENT), false);
  assert.equal(hasPermission(SystemRole.INTERN, PERMISSIONS.APPROVE_WORKLOG), false);
  assert.equal(hasPermission(SystemRole.INTERN, PERMISSIONS.DELIVER_REPORT), false);
});

test("Client Viewer has only the narrow portal set", () => {
  assert.equal(hasPermission(SystemRole.CLIENT_VIEWER, PERMISSIONS.VIEW_REPORTS), true);
  assert.equal(hasPermission(SystemRole.CLIENT_VIEWER, PERMISSIONS.DOWNLOAD_REPORT), true);
  // cannot see anything internal
  assert.equal(hasPermission(SystemRole.CLIENT_VIEWER, PERMISSIONS.VIEW_WORKLOGS), false);
  assert.equal(hasPermission(SystemRole.CLIENT_VIEWER, PERMISSIONS.VIEW_AGENCY_OVERVIEW), false);
  assert.equal(hasPermission(SystemRole.CLIENT_VIEWER, PERMISSIONS.VIEW_TEAM_PERFORMANCE), false);
  assert.equal(hasPermission(SystemRole.CLIENT_VIEWER, PERMISSIONS.SUBMIT_WORKLOG), false);
});

test("hasAnyPermission returns true if any perm matches", () => {
  assert.equal(
    hasAnyPermission(SystemRole.SEO_EXECUTIVE, [PERMISSIONS.APPROVE_WORKLOG, PERMISSIONS.SUBMIT_WORKLOG]),
    true,
  );
  assert.equal(
    hasAnyPermission(SystemRole.CLIENT_VIEWER, [PERMISSIONS.MANAGE_TEAM, PERMISSIONS.CREATE_CLIENT]),
    false,
  );
});

test("isStaff identifies internal roles", () => {
  assert.equal(isStaff(SystemRole.SUPER_ADMIN), true);
  assert.equal(isStaff(SystemRole.SEO_MANAGER), true);
  assert.equal(isStaff(SystemRole.SEO_EXECUTIVE), true);
  assert.equal(isStaff(SystemRole.CLIENT_VIEWER), false);
});

test("every role has a permission entry (no role silently gets nothing)", () => {
  for (const role of Object.values(SystemRole)) {
    assert.ok(Array.isArray(ROLE_PERMISSIONS[role]), `${role} missing from ROLE_PERMISSIONS`);
  }
});
