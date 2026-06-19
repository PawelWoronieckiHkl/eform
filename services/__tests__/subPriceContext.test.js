'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { getEffectiveOrgId, applySubPriceLocals } = require('../subPriceContext');

function mockRes() {
  return { locals: {} };
}

test('getEffectiveOrgId — admin uses context client org, not HKL admin org', () => {
  const req = {
    session: {
      user: { isAdmin: true, organization: '3', orgId: 3 },
      context_user: { orgId: 42, ident: 'luxan' }
    }
  };
  assert.equal(getEffectiveOrgId(req), 42);
});

test('getEffectiveOrgId — owner uses own orgId', () => {
  const req = {
    session: {
      user: { isOwner: true, orgId: 55 },
      context_user: null
    }
  };
  assert.equal(getEffectiveOrgId(req), 55);
});

test('applySubPriceLocals — client account gets isClient and canViewSubPrices=false', () => {
  const req = {
    session: {
      user: { orgId: 42, isOwner: false, isAdmin: false, isEmployee: false, showSubParams: false }
    }
  };
  const res = mockRes();
  applySubPriceLocals(req, res);
  assert.equal(res.locals.isClient, true);
  assert.equal(res.locals.canViewSubPrices, false);
  assert.equal(res.locals.viewAsOrganization, false);
  assert.equal(res.locals.showSub, false);
});

test('applySubPriceLocals — org owner gets canViewSubPrices for non-HKL org', () => {
  const req = {
    session: {
      user: { orgId: 42, isOwner: true, isAdmin: false, showSubParams: true }
    }
  };
  const res = mockRes();
  applySubPriceLocals(req, res);
  assert.equal(res.locals.canViewSubPrices, true);
  assert.equal(res.locals.isClient, false);
  assert.equal(res.locals.showSub, true);
});

test('applySubPriceLocals — admin with client context gets viewAsOrganization', () => {
  const req = {
    session: {
      user: { isAdmin: true, organization: '3', orgId: 3, showSubParams: false },
      context_user: { orgId: 42, ident: 'luxan', clientName: 'Luxan GmbH' }
    }
  };
  const res = mockRes();
  applySubPriceLocals(req, res);
  assert.equal(res.locals.viewAsOrganization, true);
  assert.equal(res.locals.canViewSubPrices, false);
  assert.equal(res.locals.selectedUserIdent, 'luxan');
});

test('applySubPriceLocals — works outside NODE_ENV=test (production)', () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const req = {
    session: {
      user: { orgId: 42, isOwner: false, isAdmin: false, isEmployee: false, showSubParams: false }
    }
  };
  const res = mockRes();
  applySubPriceLocals(req, res);
  assert.equal(res.locals.isClient, true);
  process.env.NODE_ENV = prevEnv;
});
