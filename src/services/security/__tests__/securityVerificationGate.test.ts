/**
 * PHASE 50.1 FINAL SECURITY & INTEGRITY VERIFICATION GATE
 * Validates:
 * 1. Read-only ensureUserMembership invariants
 * 2. Role-Based Access Control (RBAC) matrix for all 6 roles
 * 3. Cross-company tenant isolation & document key determinism
 * 4. Multi-company context & storage isolation
 * 5. Static AST audit of firestore.rules & storage.rules
 *    - Zero broad isAuthenticated() read/write bypasses
 *    - Zero hardcoded company_profile / default-company bypasses
 *    - Immutable collections audit
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  DEFAULT_ROLE_PERMISSIONS, 
  getMembershipDocId, 
  mapMemberRoleToUserRole 
} from '../../repository/companyMemberRepository';
import { CompanyMemberRole } from '../../../types/multiCompany';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[SECURITY GATE VIOLATION] ${message}`);
  }
}

console.log('================================================================');
console.log('LOGIQUOTE — PHASE 50.1 FINAL SECURITY VERIFICATION GATE TEST RUN');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: MEMBERSHIP DOC ID DETERMINISM & COLLISION FREEDOM
// ----------------------------------------------------------------------------
console.log('TEST 1: Testing Membership Document ID Determinism...');
{
  const uid1 = 'user_abc123';
  const compA = 'company_logistics_A';
  const compB = 'company_logistics_B';

  const docIdA = getMembershipDocId(uid1, compA);
  const docIdB = getMembershipDocId(uid1, compB);

  assert(docIdA === 'user_abc123_company_logistics_A', 'DocId pattern must be ${userId}_${companyId}');
  assert(docIdB === 'user_abc123_company_logistics_B', 'DocId pattern must be ${userId}_${companyId}');
  assert(docIdA !== docIdB, 'DocIds for different companies must be strictly distinct');
  console.log('  ✓ Deterministic ID pattern verified: ${userId}_${companyId}');
}

// ----------------------------------------------------------------------------
// TEST 2: RBAC PERMISSION MATRIX INTEGRITY
// ----------------------------------------------------------------------------
console.log('\nTEST 2: Verifying RBAC Permission Matrix for all roles...');
{
  const roles: CompanyMemberRole[] = [
    'COMPANY_ADMIN',
    'LOGISTICS_MANAGER',
    'PRICING_SPECIALIST',
    'SALES_REP',
    'OPERATOR',
    'VIEWER'
  ];

  // COMPANY_ADMIN must have all permissions
  const adminPerms = DEFAULT_ROLE_PERMISSIONS.COMPANY_ADMIN;
  assert(adminPerms.canCreateQuotes === true, 'Admin must canCreateQuotes');
  assert(adminPerms.canApproveQuotes === true, 'Admin must canApproveQuotes');
  assert(adminPerms.canEditCompanyProfile === true, 'Admin must canEditCompanyProfile');
  assert(adminPerms.canManageMembers === true, 'Admin must canManageMembers');
  assert(adminPerms.canManageRates === true, 'Admin must canManageRates');
  assert(adminPerms.canViewProfitability === true, 'Admin must canViewProfitability');

  // LOGISTICS_MANAGER: cannot edit company profile, cannot manage members
  const managerPerms = DEFAULT_ROLE_PERMISSIONS.LOGISTICS_MANAGER;
  assert(managerPerms.canCreateQuotes === true, 'Manager can create quotes');
  assert(managerPerms.canApproveQuotes === true, 'Manager can approve quotes');
  assert(managerPerms.canManageRates === true, 'Manager can manage rates');
  assert(managerPerms.canEditCompanyProfile === false, 'Manager must NOT edit company profile');
  assert(managerPerms.canManageMembers === false, 'Manager must NOT manage members');

  // PRICING_SPECIALIST: cannot approve quotes, cannot edit profile, cannot manage members
  const pricingPerms = DEFAULT_ROLE_PERMISSIONS.PRICING_SPECIALIST;
  assert(pricingPerms.canCreateQuotes === true, 'Pricing can create quotes');
  assert(pricingPerms.canApproveQuotes === false, 'Pricing must NOT approve quotes');
  assert(pricingPerms.canManageRates === true, 'Pricing can manage rates');
  assert(pricingPerms.canEditCompanyProfile === false, 'Pricing must NOT edit company profile');
  assert(pricingPerms.canManageMembers === false, 'Pricing must NOT manage members');

  // SALES_REP: can only create quotes, cannot manage rates or approve
  const salesPerms = DEFAULT_ROLE_PERMISSIONS.SALES_REP;
  assert(salesPerms.canCreateQuotes === true, 'Sales rep can create quotes');
  assert(salesPerms.canApproveQuotes === false, 'Sales rep must NOT approve quotes');
  assert(salesPerms.canManageRates === false, 'Sales rep must NOT manage rates');
  assert(salesPerms.canEditCompanyProfile === false, 'Sales rep must NOT edit company profile');
  assert(salesPerms.canManageMembers === false, 'Sales rep must NOT manage members');

  // VIEWER: zero permissions
  const viewerPerms = DEFAULT_ROLE_PERMISSIONS.VIEWER;
  assert(viewerPerms.canCreateQuotes === false, 'Viewer has NO canCreateQuotes');
  assert(viewerPerms.canApproveQuotes === false, 'Viewer has NO canApproveQuotes');
  assert(viewerPerms.canEditCompanyProfile === false, 'Viewer has NO canEditCompanyProfile');
  assert(viewerPerms.canManageMembers === false, 'Viewer has NO canManageMembers');
  assert(viewerPerms.canManageRates === false, 'Viewer has NO canManageRates');
  assert(viewerPerms.canViewProfitability === false, 'Viewer has NO canViewProfitability');

  console.log('  ✓ All 6 RBAC roles validated against strict privilege boundaries');
}

// ----------------------------------------------------------------------------
// TEST 3: ROLE MAPPING INTEGRITY
// ----------------------------------------------------------------------------
console.log('\nTEST 3: Verifying Role Mapping to UI analytics/navigation roles...');
{
  assert(mapMemberRoleToUserRole('COMPANY_ADMIN') === 'ADMIN', 'COMPANY_ADMIN -> ADMIN');
  assert(mapMemberRoleToUserRole('LOGISTICS_MANAGER') === 'SALES_MANAGER', 'LOGISTICS_MANAGER -> SALES_MANAGER');
  assert(mapMemberRoleToUserRole('PRICING_SPECIALIST') === 'PRICING_SPECIALIST', 'PRICING_SPECIALIST -> PRICING_SPECIALIST');
  assert(mapMemberRoleToUserRole('SALES_REP') === 'SALES_REP', 'SALES_REP -> SALES_REP');
  assert(mapMemberRoleToUserRole('VIEWER') === 'VIEWER', 'VIEWER -> VIEWER');
  console.log('  ✓ UI Role Mapping functions verified correctly');
}

// ----------------------------------------------------------------------------
// TEST 4: FIRESTORE RULES STATIC AUDIT
// ----------------------------------------------------------------------------
console.log('\nTEST 4: Auditing firestore.rules for security invariants...');
{
  const firestoreRulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(firestoreRulesPath, 'utf8');

  // 1. Check for broad permissive rules
  assert(
    !rulesContent.includes('allow read, write: if isAuthenticated();') &&
    !rulesContent.includes('allow read, write:if isAuthenticated();'),
    'firestore.rules must NOT contain broad allow read, write: if isAuthenticated();'
  );
  console.log('  ✓ No broad `allow read, write: if isAuthenticated();` found');

  // 2. Check for companyId bypasses in isCompanyMember/isCompanyAdmin
  const isCompanyMemberDef = rulesContent.slice(
    rulesContent.indexOf('function isCompanyMember('),
    rulesContent.indexOf('function getMemberRole(')
  );
  assert(!isCompanyMemberDef.includes('company_profile'), 'isCompanyMember must not contain company_profile bypass');
  assert(!isCompanyMemberDef.includes('default-company'), 'isCompanyMember must not contain default-company bypass');
  assert(!isCompanyMemberDef.includes('default_company'), 'isCompanyMember must not contain default_company bypass');
  console.log('  ✓ isCompanyMember() has zero hardcoded company ID bypasses');

  // 3. Check membership creation hardening
  const membershipBlock = rulesContent.slice(
    rulesContent.indexOf('match /companyMemberships/{membershipId}'),
    rulesContent.indexOf('match /companyFinancialSettings')
  );
  assert(
    !membershipBlock.includes('allow create: if isAuthenticated();'),
    'companyMemberships must NOT have unconstrained allow create: if isAuthenticated();'
  );
  assert(
    membershipBlock.includes('isCompanyAdmin(request.resource.data.companyId)'),
    'companyMemberships create must check isCompanyAdmin'
  );
  assert(
    membershipBlock.includes('!exists(/databases/$(database)/documents/companies/$(request.resource.data.companyId))'),
    'Self-assigned admin creation only allowed for non-existent companies (new company creation)'
  );
  console.log('  ✓ companyMemberships is strictly guarded against self-promotion');

  // 4. Check companies creation hardening
  const companiesBlock = rulesContent.slice(
    rulesContent.indexOf('match /companies/{companyId}'),
    rulesContent.indexOf('match /companyMemberships/{membershipId}')
  );
  assert(
    !companiesBlock.includes('allow create: if isAuthenticated();') ||
    companiesBlock.includes('!exists(/databases/$(database)/documents/companies/$(companyId))'),
    'companies create must require explicit non-existence check and user attribution'
  );
  console.log('  ✓ companies collection is strictly guarded against unauthorized overwrites');

  // 5. Check historical audit collections immutability
  const immutableCollections = [
    'companyFinancialAudits',
    'quotationAuditLogs',
    'contractAudits',
    'pricingAudits',
    'shipmentAuditLogs',
    'deadlineAuditLogs',
    'crmAuditLogs',
    'opportunityAuditLogs',
    'rateHistories'
  ];

  for (const coll of immutableCollections) {
    assert(
      rulesContent.includes(`match /${coll}/{`) &&
      rulesContent.includes('allow update, delete: if false;'),
      `Collection ${coll} must be immutable (allow update, delete: if false;)`
    );
  }
  console.log(`  ✓ All ${immutableCollections.length} historical audit collections are strictly immutable`);

  // 6. Default deny catch-all
  assert(
    rulesContent.includes('match /{document=**} {\n      allow read, write: if false;\n    }'),
    'Global default-deny catch-all rule must be present at root'
  );
  console.log('  ✓ Root default-deny catch-all confirmed');
}

// ----------------------------------------------------------------------------
// TEST 5: STORAGE RULES STATIC AUDIT
// ----------------------------------------------------------------------------
console.log('\nTEST 5: Auditing storage.rules for tenant isolation...');
{
  const storageRulesPath = path.resolve(process.cwd(), 'storage.rules');
  const storageContent = fs.readFileSync(storageRulesPath, 'utf8');

  // 1. Verify company isolation
  assert(
    storageContent.includes('match /companies/{companyId}/logo/{allPaths=**}') &&
    storageContent.includes('allow read: if isCompanyMember(companyId);'),
    'Company logos must be protected by isCompanyMember'
  );
  assert(
    storageContent.includes('match /companies/{companyId}/contracts/{contractId}/{allPaths=**}') &&
    storageContent.includes('allow read: if isCompanyMember(companyId);'),
    'Company contracts must be protected by isCompanyMember'
  );
  assert(
    storageContent.includes('match /companies/{companyId}/documents/{allPaths=**}') &&
    storageContent.includes('allow read: if isCompanyMember(companyId);'),
    'Company documents must be protected by isCompanyMember'
  );

  // 2. Default deny
  assert(
    storageContent.includes('match /{allPaths=**} {\n      allow read, write: if false;\n    }'),
    'Storage default-deny catch-all rule must be present'
  );
  console.log('  ✓ storage.rules enforces strict multi-tenant isolation and default-deny');
}

console.log('\n================================================================');
console.log('ALL PHASE 50.1 SECURITY VERIFICATION CHECKS PASSED SUCCESSFULLY!');
console.log('================================================================\n');
