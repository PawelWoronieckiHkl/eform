const db = require("../db/db_helper.js");
const dateUtils = require('../utils/humanize_date.js')
const bcrypt = require("bcryptjs");
const { requireLogin, isOwner } = require('../middleware/loginMixture');
const logService = require('../services/logService.js');
const langManager = require('../services/setLanguage')
const langVer = require('../services/languageManager')
const { dataDir, localesDir } = require('../config');

async function handleAuthLogin(req, res, next, pin, password) {
    try {
        const isValid = await checkPassword(pin, password);
        const isEmployeeLogin = await checkEmployeePassword(pin, password);
        if (isValid) {
            const isFirst = await checkFirstLogon(pin)
            let owner = await db.getOwner(pin);

            if (!owner) {
                return res.render("login.njk", { message: "Dane nieprawidłowe" });
            }

            const userId = await db.getUserId(pin)
            req.session.user = { userId, pin, password, showPrices: false, organization: (owner.orgIdent).toUpperCase(), orgId: owner.orgId, ident: owner.userIdent };
            req.session.user.isOwner = await isOwner(owner);
            const role = await db.getUserRole(pin);
            req.session.user.isAdmin = role === "admin";

            await logService.logUserLogin(pin, await db.getUserIdent(pin));
            langVer.checkTranslateLegacy(localesDir)
            let lang;
            try {
                lang = await db.getLanguage(pin)
            }
            catch {
                lang = 'en'
            }
            if (!req.cookies.lang) {
                langManager.setLang(lang, res)
            }
            req.session.mustAcceptRODO = isFirst;

            if (req.session.user.isAdmin) {
                req.session.user.isOwner = true;
            }

            return res.redirect("/");

        } else if (isEmployeeLogin) {
            const employee = await db.getEmployeeByLogin(pin);
            const user = await db.getUserByEmployye(pin);

            if (!user) {
                return res.render("login.njk", { message: "Dane nieprawidłowe" });
            }

            const organization = await db.getOwner(user.pin);

            if (!organization) {
                return res.render("login.njk", { message: "Dane nieprawidłowe" });
            }
            req.session.user = { pin: user.pin, password: user.password, showPrices: false, organization: organization.orgId, userId: user.id };
            req.session.user.isOwner = false;
            req.session.user.isEmployee = true;
            req.session.employee = { name: employee.name, surname: employee.surname, id: employee.id, login: employee.login, phone: employee.phone };

            logEmployeeLogin = await db.logEmployeeLogin(employee.id);

            req.session.mustAcceptRODO = false;
            return res.redirect("/");
        } else {
            return res.render("login.njk", { message: "Dane nieprawidłowe" });
        }
    } catch (err) {
        return next(err);
    }
}

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


module.exports = { checkPassword, checkFirstLogon, checkEmployeePassword, handleAuthLogin};
