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
		console.log(isPolicyAccepted, 'is policy accepted')
		return isPolicyAccepted ? false : true
	}
}

async function checkEmployeePassword(login, password) {
	const employee = await db.getEmployeeByLogin(login);
	if (!employee) {
		console.log("Nie ma takiego pracownika");
		return { valid: false, employee: null };
	}


	if (password === employee.password) {
		console.log("Hasło pracownika poprawne (bez hashowania)");
		return { valid: true, employee };
	}


	if (bcrypt.compareSync(password, employee.password)) {
		console.log("Hasło pracownika poprawne (bcrypt)");
		return { valid: true, employee };
	}

	console.log("Hasło pracownika nieprawidłowe");
	return { valid: false, employee: null };
}


module.exports = { checkPassword, checkFirstLogon, checkEmployeePassword };
