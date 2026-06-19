const db = require('../db/db_helper.js');
const accessLock = require('./accessLock');

async function isAdminPin(pin) {
  if (!pin) return false;
  if (String(pin).toLowerCase() === 'admin') return true;
  try {
    const role = await db.getUserRole(pin);
    return role === 'admin';
  } catch (_err) {
    return false;
  }
}

async function rejectIfBlockedForLogin(req, res, pin) {
  if (!accessLock.isBlocked()) {
    return false;
  }
  if (await isAdminPin(pin)) {
    return false;
  }
  res.render('login.njk', { message: 'login.technical_break' });
  return true;
}

module.exports = { rejectIfBlockedForLogin, isAdminPin };
