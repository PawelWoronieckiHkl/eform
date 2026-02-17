const express = require('express');
const router = express.Router();
const { requireLogin, isOwner } = require('../middleware/loginMixture');
const authService = require('../services/authService')
const ownerService = require('../services/owner.js');
const logService = require('../services/logService.js');
const db = require("../db/db_helper.js");
const langManager = require('../services/setLanguage')
const langVer = require('../services/languageManager')
const { dataDir, localesDir } = require('../config');
const path = require("path");
const { updateClients } = require('../services/dbUserSync');
const hashUser = require('../utils/hashUser').hashUser;



router.use(async (req, res, next) => {
    res.locals.owner = req.session?.user?.isOwner || false;
    res.locals.admin = req.session?.user?.isAdmin || false;
    res.locals.isEmployee = req.session?.user?.isEmployee || false;

    if (req.session?.user?.isOwner) {
        try {
            res.locals.users = await db.getUsersByOwner(req);
        } catch (error) {
            console.error('Error loading users for owner:', error);
            res.locals.users = [];
        }
    }
    next();
});


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
        if (isValid) {
            const isFirst = await authService.checkFirstLogon(pin)
            let owner = await db.getOwner(pin);

            if (!owner) {
                return res.render("login.njk", { message: "Dane nieprawidłowe" });
            }

            const userId = await db.getUserId(pin)
            req.session.user = { userId, pin, password, showPrices: false, organization: (owner.orgIdent).toUpperCase(), orgId: owner.orgId, ident: owner.userIdent };
            req.session.user.isOwner = await isOwner(owner);
            req.session.user.isAdmin = pin == "admin";

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
});

router.get('/edit-user', requireLogin, async (req, res) => {
    let currentUser = ownerService.getCurrentUser(req);
    let user = await db.getUserData(currentUser.pin);
    const success = req.query.success === '1';
    return res.render('edit_user.njk', { user, success });
});

router.post('/update-user', requireLogin, async (req, res) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const pin = currentUser.pin;

        const { tax_id, street, zip, city, email } = req.body;

        if (!tax_id || !street || !zip || !city || !email) {
            return res.status(400).render('edit_user.njk', {
                user: await db.getUserData(pin),
                error: 'Wszystkie pola są wymagane'
            });
        }

        const trimmedData = {
            tax_id: tax_id.trim(),
            street: street.trim(),
            zip: zip.trim(),
            city: city.trim(),
            email: email.trim()
        };

        if (!trimmedData.tax_id || !trimmedData.street || !trimmedData.zip || !trimmedData.city || !trimmedData.email) {
            return res.status(400).render('edit_user.njk', {
                user: await db.getUserData(pin),
                error: 'Żadne pole nie może być puste'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedData.email)) {
            return res.status(400).render('edit_user.njk', {
                user: await db.getUserData(pin),
                error: 'Nieprawidłowy format adresu email'
            });
        }

        await db.updateUserData(pin, trimmedData);

        return res.redirect('/');
    } catch (err) {
        console.error('Error updating user:', err);
        return res.status(500).render('edit_user.njk', {
            user: await db.getUserData(req.session.user.pin),
            error: 'Błąd podczas aktualizacji danych użytkownika'
        });
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

    let photoFilename = await db.getUserLogo(pin);
    if (req.session.user?.isAdmin) {
        photoFilename = await db.getLogo(req.session.user.organization);
    }
    const photoPath = path.join(__dirname, '..', 'img', photoFilename)
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


router.post("/add-delivery-address", requireLogin, async (req, res) => {
    try {
        const { name, phone, street, city, zip, country } = req.body;
        const currentUser = ownerService.getCurrentUser(req);
        const userId = await db.getUserId(currentUser.pin);
        const payload = {
            name: (name || '').trim(),
            phone: (phone || '').trim(),
            street: (street || '').trim(),
            city: (city || '').trim(),
            zip: (zip || '').trim(),
            country: (country || '').trim(),
            email: ''
        };

        if (!payload.name || !payload.phone || !payload.street || !payload.city || !payload.zip || !payload.country) {
            return res.status(400).json({
                success: false,
                message: 'Wszystkie pola adresu dostawy są wymagane'
            });
        }

        const insertResult = await db.insertDeliveryAddress(payload, userId);
        console.log('Insert Result:', insertResult);
        return res.status(200).json({
            success: true,
            message: 'Adres dostawy został zapisany',
            data: {
                id: insertResult?.insertId || null,
                userId,
                ...payload
            }
        });
    } catch (error) {
        console.error('Error adding delivery address:', error);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas zapisu adresu dostawy'
        });
    }
});


router.post("/add-mail-address", requireLogin, async (req, res) => {
    try {
        const { mail } = req.body;
        const currentUser = ownerService.getCurrentUser(req);
        const userId = await db.getUserId(currentUser.pin);


        const email = (mail || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Podaj poprawny adres email'
            });
        }

        const insertResult = await db.insertMailAddress({ mail: email }, userId);
        
        return res.status(200).json({
            success: true,
            message: 'Adres email został zapisany',
            data: {
                userId,
                mail: email
            }
        });
    } catch (error) {
        console.error('Error adding mail address:', error);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas zapisu adresu email'
        });
    }
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
    const mailAdresses = await db.getUserMail(pin)


    let response = await db.getUserName(pin);

    if (response) {
        return res.status(200).json({
            success: true,
            name: response,
            pin: pin,
            email: mailAdresses.user_email
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
                req.session.user.showPricesOnce = true;

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


router.get('/employee/edit/:id', requireLogin, async (req, res) => {
    const empDetails = await db.getEmployeeById(req.params.id);
    return res.render("user/edit_employee.njk", { employee: empDetails });
});


router.post('/employee/edit/:id', requireLogin, async (req, res) => {
    try {
        const employeeId = req.params.id;
        const currentUser = ownerService.getCurrentUser(req);
        const userId = currentUser.userId;
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

        const { name, surname, login, password, phone } = req.body;

        const updatedData = {
            name,
            surname,
            login,
            phone: phone || ''
        };

        if (password && password.trim() !== '') {
            updatedData.password = password;
        }

        await db.updateEmployee(employeeId, updatedData);

        return res.status(200).json({
            success: true,
            message: 'Pracownik został zaktualizowany'
        });
    } catch (err) {
        console.error('Error updating employee:', err);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas aktualizacji pracownika'
        });
    }
});


router.delete('/employee/:id', requireLogin, async (req, res) => {
    try {
        const employeeId = req.params.id;
        const currentUser = ownerService.getCurrentUser(req);
        const userId = currentUser.userId;
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


router.get('/uid', requireLogin, async (req, res) => {
    const contextUser = ownerService.getCurrentUser(req);
    const ident = await db.getUserIdent(contextUser.pin)
    const uid = hashUser(ident);
    return res.json({ success: true, uid: uid });
});

module.exports = router;