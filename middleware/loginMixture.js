const db = require("../db/db_helper.js");

function requireLogin(req, res, next) {
  // Check session existence
  if (!req.session) {
    console.warn('Brak sesji w request');
    return res.redirect("/user/login");
  }
  // Check user object
  if (!req.session.user || typeof req.session.user !== 'object') {
    console.warn('Brak usera w sesji lub user nie jest obiektem');
    return res.redirect("/user/login");
  }
  // Check userId presence and validity

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