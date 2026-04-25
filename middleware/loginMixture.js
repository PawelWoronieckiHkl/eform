const db = require("../db/db_helper.js");
const usersDb = require("../db/users.js");
const { customOrgSorting } = require('../utils/otherBossUtilities.js');
const { log } = require('../utils/logging');

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/user/login");
  }
  next();
}

function addOrganizationsForAdmin(req, res, next) {
  const originalRender = res.render.bind(res);

  res.render = function (view, options, callback) {
    let renderOptions = options;
    let renderCallback = callback;

    if (typeof renderOptions === 'function') {
      renderCallback = renderOptions;
      renderOptions = {};
    }

    if (!renderOptions || typeof renderOptions !== 'object') {
      renderOptions = {};
    }

    if (!req.session.user || !req.session.user.isAdmin) {
      return originalRender(view, renderOptions, renderCallback);
    }

    usersDb.getAllOrganizations()
      .then((orgs) => {
        const organizations = Array.isArray(orgs) ? orgs : [];
        renderOptions.organizations = customOrgSorting(organizations);
        renderOptions.admin = true;
        const selectedOrgId = req.session.user?.organization;
        if (selectedOrgId) {
          const selectedOrg = organizations.find(o => o.id === selectedOrgId || o.id === parseInt(selectedOrgId, 10));
          renderOptions.selectedOrgIdent = selectedOrg?.ident?.toUpperCase() || null;
        }
        originalRender(view, renderOptions, renderCallback);
      })
      .catch((error) => {
        log('Error fetching organizations:', error);
        renderOptions.organizations = [];
        renderOptions.admin = true;
        originalRender(view, renderOptions, renderCallback);
      });
  };

  next();
}


function requirePermission(req, res, next) {
  if (req.session.user?.isOwner) {
    return next();
  }
  const sessionShow = req.session.user?.showPrices;
  const paramShow = req.session.user?.showPricesOnce ?? false;
  log('sessionShow', sessionShow, 'paramShow', paramShow, "REQUIRE PERMISSION");
  if (!sessionShow && !paramShow) {
    return res.redirect("/user/no-permission");
  }

  next();
}

async function checkOrderOwnership(req, res, next) {
  try {
    if (req.session.user?.isOwner) {
      return next();
    }

    const userId = req.session.user?.userId;
    const orderId = req.params.orderId;
    // log(userId, orderId, 'in checkOrderOwnership middleware');
    if (!userId) {
      return res.redirect('/user/no-permission');
    }
    const order = await db.checkOwner(orderId, userId);
    // log(order, 'order ownership check result');
    if (!order) {
      return res.redirect('/user/no-permission');
    }


    next();

  } catch (err) {
    next(err);
  }
}

async function isOwner(owner) {
  try {
    if (!owner || !owner.orgIdent || !owner.userIdent) {
      log("Missing identifiers: ident or ownerIdent");
      return false;
    }
    log(JSON.stringify(owner), 'in isOwner function');
    return owner.orgIdent.toUpperCase() === owner.userIdent.toUpperCase();
  } catch (error) {
    log("Error in isOwner function:", error);
    return false;
  }
}

function requireOwner(req, res, next) {
  if (!req.session.user?.isOwner) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Owner privileges required."
    });
  }
  next();
}

function requireGroup(req, res, next) {
  const isGroup = req.session.user?.isGroup || req.session.context_user?.isGroup || false;
  if (!isGroup) {
    return res.redirect('/user/no-permission');
  }
  next();
}

function requireGroupShop(req, res, next) {
  if (!req.session.user?.isGroupShop) {
    return res.redirect('/user/no-permission');
  }
  next();
}

module.exports = { requireLogin, requirePermission, checkOrderOwnership, isOwner, requireOwner, requireGroup, requireGroupShop, addOrganizationsForAdmin };