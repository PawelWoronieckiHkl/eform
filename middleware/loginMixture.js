const db = require("../db/db_helper.js");
const usersDb = require("../db/users.js");

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/user/login");
  }
  next();
}

async function addOrganizationsForAdmin(req, res, next) {
  // Override res.render to add organizations for admin users
  const originalRender = res.render;

  res.render = async function (view, options = {}) {
    if (req.session.user && req.session.user.isAdmin) {
      try {
        options.organizations = await usersDb.getAllOrganizations();
        options.admin = true;
      } catch (error) {
        console.error('Error fetching organizations:', error);
        options.organizations = [];
      }
    }

    return originalRender.call(this, view, options);
  };

  next();
}


function requirePermission(req, res, next) {
  if (req.session.user?.isOwner) {
    return next(); // Owners have all permissions
  }
  const sessionShow = req.session.user?.showPrices;
  const paramShow = req.session.user?.showPricesOnce ?? false;
  console.log('sessionShow', sessionShow, 'paramShow', paramShow, "REQUIRE PERMISSION");
  if (!sessionShow && !paramShow) {
    return res.redirect("/user/no-permission");
  }

  next();
}

async function checkOrderOwnership(req, res, next) {
  try {
    if (req.session.user?.isOwner) {
      return next(); // Owners have all permissions
    }

    const userId = req.session.user?.userId;
    const orderId = req.params.orderId;
    console.log(userId, orderId, 'in checkOrderOwnership middleware');
    if (!userId) {
      return res.redirect('/user/no-permission');
    }
    const order = await db.checkOwner(orderId, userId);
    console.log(order, 'order ownership check result');
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
    if (owner) {
      console.warn("Missing identifiers: ident or ownerIdent");
    }
    console.log(owner, 'in isOwner function');
    if (owner.orgIdent.toUpperCase() == owner.userIdent.toUpperCase()) {

      return true;
    } else {

      return false;
    }
  } catch (error) {
    console.error("Error in isOwner function:", error);
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

module.exports = { requireLogin, requirePermission, checkOrderOwnership, isOwner, requireOwner, addOrganizationsForAdmin };