const express = require('express');
const router = express.Router();
const { requireLogin, isOwner } = require('../middleware/loginMixture');
const authService = require('../services/authService')
const ownerService = require('../services/owner.js');
const logService = require('../services/logService.js');
const db = require("../db/db_helper.js");
const adminDb = require("../db/admin/db_helper.js");
const langManager = require('../services/setLanguage')
const langVer = require('../services/languageManager')
const { dataDir, localesDir } = require('../config');
const path = require("path");
const { updateClients } = require('../services/dbUserSync')

router.get("/login", (req, res) => {

    updateClients()
    res.render("login.njk");
});

router.post("/accept-rodo", async (req, res, next) => {
    try {
        const { accepted } = req.body;
        if (accepted) {
            const currentUser = ownerService.getCurrentUser(req);
            const pin = currentUser.pin;

            await db.setUserAcceptedRODO(pin, true);
            req.session.mustAcceptRODO = false;
            return res.status(200).json({ message: "RODO accepted" });
        } else {
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error destroying session:", err);
                    return res.status(500).json({ message: "Error accepting RODO" });
                }
                return res.status(200).json({ message: "RODO not accepted" });
            });
            return res.status(400).json({ message: "RODO not accepted" });
        }
    } catch (err) {
        console.error(err);
        return next(err);
    }

});
router.post("/auth/login", async (req, res, next) => {
    try {
        const { pin, password } = req.body;
        const isValid = await authService.checkPassword(pin, password);
        const isEmployeeLogin = await authService.checkEmployeePassword(pin, password);
        console.log(isEmployeeLogin, 'is employee login result')
        if (isValid) {
            const isFirst = await authService.checkFirstLogon(pin)
            console.log(isFirst, 'first logon check result')
            let owner = await db.getOwner(pin);
            const userId = await db.getUserId(pin)
            req.session.user = { userId, pin, password, showPrices: false, organization: (owner.orgIdent).toUpperCase() };
            req.session.user.isOwner = await isOwner(owner);
            req.session.user.isAdmin = pin == "admin";

            req.session.user.organization = owner.orgId;
            console.log(req.session.user, 'session user after login')
            console.log(req.session.user.isOwner, 'is owner???')

            // Zapisz historię logowania
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
            const organization = await db.getOwner(user.pin);

            req.session.user = { pin: user.pin, password: user.password, showPrices: false, organization: organization.orgId, userId: user.id };
            req.session.user.isOwner = false;
            req.session.user.isEmployee = true;
            req.session.employee = { name: employee.name, surname: employee.surname, id: employee.id, login: employee.login, phone: employee.phone };

            console.log(req.session.employee, 'session employee after login')
            req.session.mustAcceptRODO = false;
            return res.redirect("/");
        } else {
            return res.render("login.njk", { message: "Dane nieprawidłowe" });
        }
    } catch (err) {
        return next(err);
    }
});


router.get('/tutorial', requireLogin, async (req, res) => {
    return res.render('tutorial.njk');
});

router.get('/employee-info'), requireLogin, async (req, res) => {
    if (req.session.user.isEmployee) {
        return res.json({
            success: true,
            employee: req.session.employee
        });
    } else {
        return res.json({
            success: false,
            message: 'Użytkownik nie jest pracownikiem'
        });
    }
}

router.get('/logo', requireLogin, async (req, res) => {
    const currentUser = ownerService.getCurrentUser(req);
    const pin = currentUser.pin;
    console.log(pin, 'pin in get logo', req.session.user?.organization)
    let photoFilename = await db.getUserLogo(pin);
    if (req.session.user?.isAdmin){
        photoFilename = await db.getLogo(req.session.user.organization);
    }
    const photoPath = path.join(__dirname, '..', 'img', photoFilename)
    console.log(photoPath, 'photo_path')
    res.sendFile(photoPath);
})

router.post("/logout", requireLogin, (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.redirect("/");
        if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'archive' || process.env.NODE_ENV === 'test') {
            return res.redirect("http://192.168.0.8")
        }
        res.redirect("/user/login");
    });
});



router.get('/no-permission', requireLogin, async (req, res) => {
    return res.render('no-permission.njk');
});
router.get('/rodo', requireLogin, async (req, res) => {
    const currentUser = ownerService.getCurrentUser(req);
    const pin = currentUser.pin;

    return res.render('rodo.njk');
});

router.get('/owner/', requireLogin, async (req, res) => {
    const currentUser = ownerService.getCurrentUser(req);
    const pin = currentUser.pin

    let response = await db.getOwner(pin);
    if (response) {
        return res.status(200).json({
            success: true,
            idents: response
        });
    }
    else {
        return res.status(400).json({
            success: false,
            message: `Nie znaleziono Pozycji`
        })
    }
})

router.get('/name', requireLogin, async (req, res) => {

    const pin = req.session.user.pin;
    console.log(pin, 'pin in getUserName')
    let response = await db.getUserName(pin);
    console.log(response, 'response from getUserName')
    if (response) {
        return res.status(200).json({
            success: true,
            name: response,
            pin: pin
        });
    }
    else {
        return res.status(400).json({
            success: false,
            message: `Nie znaleziono Nazwy`
        })
    }
});

router.post("/auth/check-password", async (req, res, next) => {
    try {
        const { password, remember, orderId } = req.body;
        const currentUser = req.session.user
        const pin = currentUser.pin;
        console.log(pin, 'pin in check-password')
        let isValid = await authService.checkPassword(pin, password);
        if (pin === 'admin') {
            isValid = true;
        }
        let redirectUrl;

        if (isValid) {
            if (remember) {
                req.session.user.showPrices = true;
            } else {
                req.session.user.showPrices = false;
                req.session.user.showPricesOnce = true;  // lub można też delete req.session.user.showPrices

            }
            return res.status(200).json({
                success: true
            });
        } else {
            return res.status(200).json({
                success: false
            })
        }
    } catch (err) {
        return next(err);
    }
});
router.get('/isOwner', requireLogin, async (req, res) => {
    return res.status(200).json({
        success: true,
        name: response
    });
});

// ===== EMPLOYEE MANAGEMENT ROUTES =====

router.get('/employee-panel', requireLogin, async (req, res) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const userId = currentUser.userId;

        const employees = await db.getEmployeesByUserId(userId);

        return res.render("user/user_panel.njk", { employees });
    } catch (err) {
        console.error('Error loading employee panel:', err);
        return res.status(500).render('error.njk', { message: 'Błąd podczas ładowania panelu pracowników' });
    }
});

router.get('/employees', requireLogin, async (req, res) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const userId = currentUser.userId;

        const employees = await db.getEmployeesByUserId(userId);

        return res.status(200).json({
            success: true,
            employees
        });
    } catch (err) {
        console.error('Error fetching employees:', err);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas pobierania pracowników'
        });
    }
});

router.get('/employee/add', requireLogin, async (req, res) => {
    return res.render("user/add_employee.njk");
});

router.post('/employee/add', requireLogin, async (req, res) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const userId = currentUser.userId;

        const { name, surname, login, password, phone } = req.body;

        if (!name || !surname || !login || !password) {
            return res.status(400).json({
                success: false,
                message: 'Wszystkie pola są wymagane'
            });
        }

        const employeeData = {
            name,
            surname,
            login,
            password,
            phone: phone || '',
            userId
        };

        const employeeId = await db.addEmployee(employeeData);
        if (employeeId.success == false) {
            if (employeeId.info == 'USER_EXISTS') {
                return res.status(400).json({
                    success: false,
                    message: 'Użytkownik o podanym loginie już istnieje'
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Pracownik został dodany',
            employeeId,
            redirect: '/user/employee-panel'
        });
    } catch (err) {
        console.error('Error adding employee:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Błąd podczas dodawania pracownika'
        });
    }
});

router.delete('/employee/:id', requireLogin, async (req, res) => {
    try {
        const employeeId = req.params.id;
        const currentUser = ownerService.getCurrentUser(req);
        const userId = currentUser.userId;

        // Sprawdź czy pracownik należy do tego użytkownika
        const employee = await db.getEmployeeById(employeeId);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Pracownik nie znaleziony'
            });
        }

        if (employee.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Brak uprawnień'
            });
        }

        await db.deleteEmployee(employeeId);

        return res.status(200).json({
            success: true,
            message: 'Pracownik został usunięty'
        });
    } catch (err) {
        console.error('Error deleting employee:', err);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas usuwania pracownika'
        });
    }
});

router.get('/employee/:id/orders', requireLogin, async (req, res) => {
    try {
        const employeeId = req.params.id;
        const currentUser = ownerService.getCurrentUser(req);
        const userId = currentUser.userId;

        const employee = await db.getEmployeeById(employeeId);

        if (!employee) {
            return res.status(404).render('error.njk', { message: 'Pracownik nie znaleziony' });
        }

        if (employee.user_id !== userId) {
            return res.status(403).render('error.njk', { message: 'Brak uprawnień' });
        }

        const orders = await db.getEmployeeOrders(employeeId);
        const ordersCount = await db.countEmployeeOrders(employeeId);

        return res.render("user/employee_orders.njk", {
            employee,
            orders,
            ordersCount
        });
    } catch (err) {
        console.error('Error loading employee orders:', err);
        return res.status(500).render('error.njk', { message: 'Błąd podczas ładowania zamówień' });
    }
});

router.get('/employee-panel', requireLogin, async (req, res) => {
    return res.render("user/user_panel.njk");
});

module.exports = router;