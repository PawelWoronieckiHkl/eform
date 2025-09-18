const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/loginMixture');
const authService = require('../services/authService')
const db = require("../db/db_helper.js");
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
            const pin = req.session.user.pin;
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

        if (isValid) {
            const isFirst = await authService.checkFirstLogon(pin)
            console.log(isFirst, 'first logon check result')
            let owner = await db.getOwner(pin);
            console.log(owner, 'siema')
            const userId = await db.getUserId(pin)
            req.session.user = { userId, pin, password, showPrices: false, organization: (owner.orgIdent).toUpperCase() };


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
            return res.redirect("/");
        } else {
            return res.render("login.njk", { message: "Dane nieprawidłowe" });
        }
    } catch (err) {
        return next(err);
    }
});


router.get('/logo', requireLogin, async (req, res) => {
    const pin = req.session.user.pin;
    const photoFilename = await db.getUserLogo(pin)

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
    const pin = req.session.user.pin;

    return res.render('rodo.njk');
});

router.get('/owner/',requireLogin, async (req, res) => {
    const pin = req.session.user.pin

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

router.get('/name',requireLogin, async (req, res) => {
    const pin = req.session.user.pin;
    console.log(pin, 'pin in getUserName')
    let response = await db.getUserName(pin);
    console.log(response, 'response from getUserName')
    if (response) {
        return res.status(200).json({
            success: true,
            name: response
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
        const pin = req.session.user.pin;
        const isValid = await authService.checkPassword(pin, password);

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


module.exports = router;