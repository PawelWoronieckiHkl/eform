const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/loginMixture');
const db = require("../db/db_helper.js");
const fs = require('fs');
const path = require('path');
const itemBuilder = require('../services/itemBuilder')
const versionManager = require("../services/versionManager")
const { photoPath, dataDir } = require('../config');
const { group } = require('console');

function normalizeFilename(filename) {
  if (filename) {
    return filename
      .split('.')[0]                        // usuń rozszerzenie
      .replace(/~\d+$/, '')                 // usuń końcowe _123 jeśli jest
      .replace(/\s+/g, '')                  // usuń spacje
      .replace(/_+/g, '')                   // usuń podkreślenia
      .toLowerCase();                      // zamień na małe litery
  }
  return '';
}



router.post('/save', requireLogin, async (req, res) => {
  try {
    const formData = req.body;

    const result = await db.insertNewForm(formData);
    res.json({ status: "success", message: "Dane zapisane poprawnie" });
  } catch (err) {
    return res.status(400).json({ error: "Niepoprawne dane" });
  }
});

router.patch('/edit/save', requireLogin, async (req, res) => {
  try {
    const formData = req.body;

    const result = await db.updatePosition(formData);

    res.json({ status: "success", message: "Dane zapisane poprawnie" });
  } catch (err) {
    return res.status(400).json({ error: "Niepoprawne dane" });
  }
});


// router.patch('/save',requireLogin, async(req,res) => {
//     try {
//       const formData = req.body;

//       const result = await db.updateForm(formData);
//       res.json({ status: "success", message: "Dane zapisane poprawnie" });
//     } catch (err) {
//       return res.status(400).json({ error: "Niepoprawne dane" });
//     }
//   });

router.delete('/:positionId/delete', requireLogin, async (req, res) => {
  // console.log(req.params.orderId);
  let response = await db.deletePosition(req.params.positionId);
  if (response) {
    return res.status(200).json({
      success: true,
      message: `position.delete_msg`
    });
  }
  else {
    return res.status(400).json({
      success: false,
      message: `Nie znaleziono Pozycji`
    })
  }
})

router.get('/photo',requireLogin, async (req, res) => {
  try {
    const { photoName, groupNumber, folderName } = req.query;
    console.log('Odebrano zapytanie o zdjęcie:', { photoName, groupNumber, folderName });

    if (!photoName || !groupNumber || !folderName) {
      return res.status(400).json({ error: 'Brak wymaganych danych' });
    }

    const basePath = path.join(photoPath, groupNumber.toString(), folderName);
    console.log('Sprawdzana ścieżka:', basePath);
    let exists = false;
    let actualFileName = null;

    try {
      const files = fs.readdirSync(basePath);
      const normalizedTarget = normalizeFilename(photoName);

      for (const file of files) {
        if (normalizeFilename(file) === normalizedTarget) {
          exists = true;
          actualFileName = file;
          break;
        }
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        exists = false;
      } else {
        throw err;
      }
    }

    return res.json({
      exists,
      photoName: actualFileName || photoName
    });
  } catch (err) {
    console.error("Błąd sprawdzania zdjęcia:", err);
    return res.status(500).json({ error: "Błąd serwera" });
  }
});



router.get('/:positionId/edit/', requireLogin,async (req, res) => {
  // console.log(req.params.orderId);
  let result = await db.getPosition(req.params.positionId);

  if (result) {
    return res.render('edit_position.njk', { position: result })
  }
  else {
    return res.status(400).json({
      success: false,
    })
  }
})

router.post('/:positionId/duplicate/', requireLogin, async (req, res) => {
  // console.log(req.params.orderId);
  const position = await db.getPosition(req.params.positionId);
  const orderId = position.order_id;
  const result = await db.insertNewForm(
    itemBuilder.buildOrderItemStructure(
      position.order_id,
      position.list_price,
      position.discount_percentage,
      position.discount,
      position.unit_price,
      position.total_price,
      position.name,
      position.commision,
      position.json_parameters,
      position.json_parameters_desc,
      position.amount,
      position.comment,
      position.ver,
      position.asortment_group_number,
      position.lang,
      position.department,
      position.group_name
    )

  )

  if (result) {
    return res.status(200).json({ redirect: `/orders/order/${orderId}` })
  }
  else {
    return res.status(400).json({
      success: false,
    })
  }
})

router.get('/:positionId/data',requireLogin, async (req, res) => {
  let result = await db.getPosition(req.params.positionId);

  if (result) {
    return res.status(200).json({ position: result })
  }
  else {
    return res.status(400).json({
      success: false,
    })
  }
})

router.post('/favorites/toggle', requireLogin,async (req, res) => {
  const userId = req.session.user.userId; // lub z JWT: req.user.id
  const { productValue, groupNumber } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Brak autoryzacji' });
  }

  // Sprawdź, czy już istnieje ulubiony
  try {
    const exists = await db.checkFavoriteExists(userId, productValue, groupNumber);
    console.log(exists)
    if (exists) {
      await db.removeFavorite(userId, productValue, groupNumber);
      res.json({ isFavorite: false });
    } else {
      await db.addFavorite(userId, productValue, groupNumber);
      res.json({ isFavorite: true });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

router.get('/:positionId',requireLogin, async (req, res) => {
  let result = await db.getPosition(req.params.positionId);

  const parametersDesc = JSON.parse(result.json_parameters_desc);
  const values = result.json_parameters
  if (result) {
    console.log('SPRAWDZAMY POZYCJE', req.session.user?.showPrices)
    if (!req.session.user?.showPrices) {
      return res.render('position_sent.njk', { position: result, parameters: parametersDesc, values: values })
    }
    else {
      return res.render('position_sent-prices.njk', { position: result, parameters: parametersDesc, values: values })
    }
  }
  else {
    return res.status(400).json({
      success: false,
    })
  }
})

router.get('/favs/:groupNr',requireLogin, async (req, res) => {
  const groupNumber = req.params.groupNr;
  const userId = req.session.user.userId; // lub z JWT: req.user.id}
  const favs = await db.getFavs(userId, groupNumber);
  console.log(favs)
  if (!favs || favs.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'Brak ulubionych produktów'
    });
  }
  else {
    const productValues = favs.map(fav => fav.product_value);
    return res.json({
      success: true,
      favorites: productValues
    });
  }
})

router.post('/check-images', requireLogin, async (req, res) => {
  try {
    const { options, groupNumber, folderName } = req.body;

    if (!Array.isArray(options) || !groupNumber || !folderName) {
      return res.status(400).json({ error: 'Brak wymaganych danych' });
    }

    const result = {};
    const basePath = path.join(photoPath, groupNumber.toString(), folderName);
    console.log('Sprawdzana ścieżka:', basePath);
    const files = fs.readdirSync(basePath);

    const normalizedFiles = {};
    for (const file of files) {
      const normalized = normalizeFilename(file);
      normalizedFiles[normalized] = file;
      console.log(file)
    }

    for (const opt of options) {
      const originalValue = opt.VALUE;
      const normalizedValue = normalizeFilename(originalValue);

      if (normalizedFiles[normalizedValue]) {

        const originalFileName = normalizedFiles[normalizedValue];

        result[originalValue] = originalFileName;
      } else {
        result[originalValue] = null;
      }
    }

    return res.json(result);
  } catch (err) {
    console.error("Błąd sprawdzania obrazów:", err);
    return res.status(500).json({ error: "Błąd serwera" });
  }
});

router.get('/version/:groupNr/', requireLogin, async (req, res) => {
  const lang = req.getLocale();
  let version = await db.getAppVersion(req.params.groupNr, process.env.NODE_ENV || 'dev');

  return res.status(200).json({ version: version })
})

router.post('/versions/update/',requireLogin, async (req, res) => {
  try {
    const paths = req.body;

    if (!paths || !Array.isArray(paths)) {
      return res.status(400).json({ error: "Nieprawidłowy format ścieżek" });
    }

    const results = [];


    const manager = await versionManager.checkVersion(paths);

    res.json({
      success: true,
    });

  } catch (error) {
    console.error('Błąd aktualizacji wersji:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});




module.exports = router;