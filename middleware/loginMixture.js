const db = require("../db/db_helper.js");

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/user/login");
    }
    next();
}


function requirePermission(req, res, next) {
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
    const userId = req.session.user?.userId;
    const orderId = req.params.orderId;

    if (!userId) {
      return res.redirect('/user/no-permission');
    }
    const order = await db.checkOwner(orderId, userId);
    if (!order) {
      return res.redirect('/user/no-permission');
    }


    next();

  } catch (err) {
    next(err);
  }
}
module.exports = { requireLogin,requirePermission,checkOrderOwnership};