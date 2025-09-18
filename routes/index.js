const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/loginMixture');
const db = require("../db/db_helper.js");
const path = require('path')
const fs = require('fs');
const langManager = require('../services/setLanguage')
const verManager = require('../services/versionManager.js')
const { dataDir, localesDir, availabeLanguages } = require('../config');
const { readWord } = require('../utils/readWord.js')
router.get('/translations', (req, res) => {
  const lang = req.getLocale();
  const filePath = path.join(localesDir, `${lang}.json`);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Translation file not found' });
    }
    try {
      const translations = JSON.parse(data);
      res.json(translations);
    } catch (parseError) {
      console.error('Błąd parsowania JSON:', parseError);
      res.status(500).json({ error: 'Invalid translation JSON' });
    }
  });
});

router.get('/env', requireLogin,(req, res) => {
  const versionsHuman = {
    dev: 'Deweloperska',
    test: "Testowa",
    archive: "Archiwalna"
  }
  let ver = process.env?.NODE_ENV ?? false
  let versionString = false
  if (ver) {
    versionString = versionsHuman[ver]
  }

  return res.json({ status: "success", body: { version: versionString } });
});
router.get('/languages', (req, res) => {
  const lang = req.getLocale();

  return res.json({ status: "success", body: { lang: lang, availableLanguages: availabeLanguages } });
});


router.get('/change-language', (req, res) => {
  const lang = req.query.lang;
  langManager.setLang(lang, res)
  const redirectPath = req.get('Referrer') || '/';
  res.redirect(redirectPath);
});

router.get("/", requireLogin, async (req, res) => {

  user = await db.getUserData(req.session.user.pin);
  const mustAcceptRODO = req.session.mustAcceptRODO || false;
  console.log(mustAcceptRODO, 'must accept RODO')
  const orders = await db.getUserOrders(user.id, 4, 0);
  const ordersSent = await db.getUserOrders(user.id, 4, 0, true);
  return res.render("home.njk", { user: user, orders: orders, ordersSent: ordersSent, limit: 4, mustAcceptRODO: mustAcceptRODO });
});
router.get("/delivery-time",requireLogin, async (req, res) => {
  const deliveryTimes = await db.getDeliveryTimes(req.session.user.pin)
  res.render("delivery.njk", { deliveryTimes: deliveryTimes });
});


router.get("/contact",requireLogin, (req, res) => {
  res.render("contact.njk");
});

router.get("/terms",requireLogin,async (req, res) => {
  try {

    const html = await readWord('rodo', `${req.session.user?.organization}_regulations`);
    res.render("terms.njk", { contentHtml: html });
  } catch (err) {
    console.error(err);

    const html = await readWord('rodo', `COZY_regulations`);
    res.render("terms.njk", { contentHtml: html });
  }
});



router.get("/privacy",requireLogin, async (req, res) => {
  try {

    const html = await readWord('rodo', `${req.session.user?.organization ?? "COZY"}_privacy`);
    res.render("privacy.njk", { contentHtml: html });
  } catch (err) {
    console.error(err);
    const html = await readWord('rodo', `COZY_privacy`);
    res.render("privacy.njk", { contentHtml: html });
  }
});

router.get('/config-num',requireLogin, async (req, res) => {
  const num = await verManager.getConfigNum()
  if (num) {
    return res.status(200).json({
      success: true,
      name: num
    });
  }
  else {
    return res.status(400).json({
      success: false,
      message: `Nie znaleziono konfiguracji`
    })
  }
});
module.exports = router;