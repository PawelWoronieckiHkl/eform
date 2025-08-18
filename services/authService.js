const db = require("../db/db_helper.js");
const dateUtils = require('../utils/humanize_date.js')
const bcrypt = require("bcryptjs");


async function checkPassword(pin, password) {
	const dbPassword = await db.getDbPassword(pin);
	if (dbPassword) {
		if (bcrypt.compareSync(password, dbPassword)) {
			console.log("Hasło poprawne");
			return true;
		}
		else if (password === dbPassword) {
			console.log("Hasło poprawne (bez haszowania)");
			return true;
		}

	} else {
		console.log("Nie ma takiego użytkownika");
		return false;
	}
}

async function checkFirstLogon(pin) {
	const firstLoginDate = await db.getFirstLogonInfo(pin)
	if (!firstLoginDate) {
		const data = await db.uodateFirstLogonInfo(pin)
		return true

	}
	else {
		const isPolicyAccepted = await db.getPolicyState(pin)
		console.log(isPolicyAccepted ,'is policy accepted')
		return isPolicyAccepted ? false : true
	}
}


module.exports = { checkPassword, checkFirstLogon };
