const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/loginMixture');
const db = require("../db/db_helper.js");
const path = require('path')
const fs = require('fs');
const langManager = require('../services/setLanguage')
const { dataDir,localesDir,availabeLanguages } = require('../config');
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

router.get('/env', (req, res) => {
      const versionsHuman = {
      dev:'Deweloperska',
      test:"Testowa",
      archive:"Archiwalna"
    }
  let ver = process.env?.NODE_ENV ?? false
  let versionString = false
  if(ver){
    versionString = versionsHuman[ver]
  }

  return res.json({ status: "success", body: {version:versionString} });
  });
router.get('/languages', (req, res) => {
  const lang = req.getLocale(); 
  
  return res.json({ status: "success", body: {lang:lang, availableLanguages: availabeLanguages } });
  });


router.get('/change-language', (req, res) => {
  const lang = req.query.lang;
  langManager.setLang(lang,res)
  const redirectPath = req.get('Referrer') || '/';
  res.redirect(redirectPath);
});

router.get("/", requireLogin, async (req, res)  => {
    
    user = await db.getUserData(req.session.user.pin);
    const mustAcceptRODO = req.session.mustAcceptRODO || false;
    console.log(mustAcceptRODO, 'must accept RODO')
    const orders = await db.getUserOrders(user.id, 4, 0);
    const ordersSent = await db.getUserOrders(user.id, 4, 0,true);
    return res.render("home.njk", { user:user, orders:orders,ordersSent:ordersSent, limit: 4, mustAcceptRODO: mustAcceptRODO });
});
router.get("/delivery-time", async (req, res) => {
  const deliveryTimes = await db.getDeliveryTimes(req.session.user.pin)
	res.render("delivery.njk", {deliveryTimes:deliveryTimes});
});


router.get("/contact", (req, res) => {
	res.render("contact.njk");
});

router.get("/terms", (req, res) => {
	res.render("terms.njk");
});

router.get("/privacy", (req, res) => {
	res.render("privacy.njk");
});


module.exports = router;