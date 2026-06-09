/**
 * Resolve effective organization id for price/SUB display.
 * Admin uses selected organization or context client's org — not HKL admin orgId.
 */
function getEffectiveOrgId(req) {
  const sessionUser = req.session?.user;
  const contextUser = req.session?.context_user;
  if (!sessionUser) return null;

  if (sessionUser.isAdmin) {
    if (contextUser?.orgId != null) return contextUser.orgId;
    if (sessionUser.organization != null && sessionUser.organization !== '') {
      const parsed = parseInt(sessionUser.organization, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  if (contextUser?.orgId != null) return contextUser.orgId;
  return sessionUser.orgId ?? null;
}

/**
 * Set res.locals for SUB price visibility (org vs client view).
 * Org/owner/admin-with-context: regular prices + keychain for SUB.
 * Client: SUB prices only.
 */
function applySubPriceLocals(req, res) {
  const isTestEnv = process.env.NODE_ENV === 'test';
  const sessionUser = req.session?.user;
  const contextUser = req.session?.context_user;
  const effectiveOrgId = getEffectiveOrgId(req);
  const nonHklOrg = effectiveOrgId != null && Number(effectiveOrgId) !== 3;

  let canViewSubPrices = false;
  let viewAsOrganization = false;
  let isClient = false;

  if (isTestEnv && sessionUser) {
    if (sessionUser.isAdmin && contextUser && nonHklOrg) {
      // Admin + wybrany klient org (np. Luxan) → widok jak organizacja (zwykłe ceny, SUB po keychain)
      viewAsOrganization = true;
    } else if (sessionUser.isOwner && !sessionUser.isAdmin) {
      const orgId = contextUser?.orgId ?? sessionUser.orgId;
      canViewSubPrices = orgId != null && Number(orgId) !== 3;
    }

    isClient = !sessionUser.isOwner
      && !sessionUser.isAdmin
      && !sessionUser.isEmployee
      && sessionUser.orgId != null
      && Number(sessionUser.orgId) !== 3;
  }

  res.locals.canViewSubPrices = canViewSubPrices;
  res.locals.viewAsOrganization = viewAsOrganization;
  res.locals.isClient = isClient;
  res.locals.showSub = sessionUser?.showSubParams || false;

  if (contextUser) {
    res.locals.selectedUser = {
      client_name: contextUser.clientName,
      ident: contextUser.ident
    };
    res.locals.selectedUserIdent = contextUser.ident;
  }
}

module.exports = { getEffectiveOrgId, applySubPriceLocals };
