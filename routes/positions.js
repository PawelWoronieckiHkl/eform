const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireLogin } = require('../middleware/loginMixture');
const db = require("../db/db_helper.js");
const adminDb = require("../db/admin/db_helper.js");
const ownerService = require('../services/owner.js');
const fs = require('fs');
const path = require('path');
const itemBuilder = require('../services/itemBuilder')
const versionManager = require("../services/versionManager")
const { photoPath, dataDir } = require('../config');
const { group } = require('console');
const { fileExists } = require('../utils/fileManager');
const { ordersManager } = require('../utils/saveOrdersOutput.js');
const { file } = require('pdfkit');
// Konfiguracja multer do przechowywania plików tymczasowo
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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

// Middleware do automatycznego dodawania users dla owner'ów
router.use(async (req, res, next) => {
  // Ustaw owner dla wszystkich widoków
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

router.post('/save', requireLogin, upload.any(), async (req, res) => {
  try {
    // Parsuj JSON z pola 'data'
    const formData = JSON.parse(req.body.data);
    const total = formData.total;

    // Odczytaj pliki z req.files
    const files = req.files || [];
    console.log(formData, 'form data received in /save endpoint');


    const result = await db.insertNewForm(formData);

    // Przenumeruj pozycje w zamówieniu
    await db.reindexOrderPositions(formData.order);

    if (files.length > 0) {
      const orderpos = await db.getOrderpos(result[0].insertId);
      console.log('ORDERPOS W SAVE:', orderpos);
      const saver = new ordersManager();
      const orderNo = await db.getOrderNo(formData.order);
      saver.setOutputPath(req, formData.order, orderNo, orderpos);
      await saver.saveAttachments(files,result[0].insertId);

    }
    res.json({
      status: "success",
      message: "Dane zapisane poprawnie",
      filesProcessed: files.length
    });
  } catch (error) {
    console.error('Błąd przy zapisywaniu:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

router.patch('/edit/save', requireLogin, async (req, res) => {
  try {
    const formData = req.body;
    const total = req.body.total;
    const result = await db.updatePosition(formData, total);

    res.json({ status: "success", message: "Dane zapisane poprawnie" });
  } catch (err) {
    console.error('Błąd podczas zapisu pozycji:', err);
    return res.status(400).json({ error: "Niepoprawne dane" });
  }
});

 
router.delete('/:positionId/delete', requireLogin, async (req, res) => {
  try {
    // Pobierz pozycję przed usunięciem (potrzebujemy order_id)
    const position = await db.getPosition(req.params.positionId);

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Nie znaleziono pozycji'
      });
    }

    const orderId = position.order_id;

    // Usuń pozycję
    const response = await db.deletePosition(req.params.positionId);

    if (response) {
      // Przenumeruj pozostałe pozycje w zamówieniu
      await db.reindexOrderPositions(orderId);

      return res.status(200).json({
        success: true,
        message: 'position.delete_msg'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Błąd podczas usuwania pozycji'
      });
    }
  } catch (error) {
    console.error('Error deleting position:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas usuwania pozycji'
    });
  }
});



router.get('/photo', requireLogin, async (req, res) => {
  try {
    const { photoName, groupNumber, folderName } = req.query;


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



router.get('/:positionId/edit/', requireLogin, async (req, res) => {
  // console.log(req.params.orderId);
  let result = await db.getPosition(req.params.positionId);

  console.log(result, 'result z getPosition w /:positionId/edit');
  let orderId = result.order_id;
  if (result) {
    return res.render('edit_position.njk', { position: result, orderId: orderId })
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
      position.group_name,
      position.parameters_short
    )

  )

  if (result) {
    // Przenumeruj pozycje w zamówieniu
    await db.reindexOrderPositions(orderId);

    const newPositionId = result[0].insertId;
    return res.status(200).json({ redirect: `/position/${newPositionId}/edit` })
  }
  else {
    return res.status(400).json({
      success: false,
    })
  }
})

router.get('/:positionId/data', requireLogin, async (req, res) => {
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

router.post('/favorites/toggle', requireLogin, async (req, res) => {
  const currentUser = ownerService.getCurrentUser(req);
  const userId = currentUser.userId; // lub z JWT: req.user.id
  const { productValue, groupNumber } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Brak autoryzacji' });
  }

  // Sprawdź, czy już istnieje ulubiony
  try {
    const exists = await db.checkFavoriteExists(userId, productValue, groupNumber);

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

router.get('/:positionId', requireLogin, async (req, res) => {
  let result = await db.getPosition(req.params.positionId);

  const parametersDesc = JSON.parse(result.json_parameters_desc);
  const values = result.json_parameters
  const parameters_short = result.parameters_short || {};
  console.log('PARAMETERS SHORT:', parameters_short);
  if (result) {
    console.log('SPRAWDZAMY POZYCJE', req.session.user?.showPrices)
    if (!req.session.user?.showPrices) {
      return res.render('position_sent.njk', { position: result, parameters: parametersDesc, values: values, parameters_short: parameters_short, isAdmin: req.session.user?.isAdmin })
    }
    else {
      return res.render('position_sent-prices.njk', { position: result, parameters: parametersDesc, values: values, parameters_short: parameters_short, isAdmin: req.session.user?.isAdmin })
    }
  }
  else {
    return res.status(400).json({
      success: false,
    })
  }
})

router.get('/favs/:groupNr', requireLogin, async (req, res) => {
  const groupNumber = req.params.groupNr;
  const currentUser = ownerService.getCurrentUser(req);
  const userId = currentUser.userId; // lub z JWT: req.user.id}
  const favs = await db.getFavs(userId, groupNumber);
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
    const files = fs.readdirSync(basePath);

    const normalizedFiles = {};
    for (const file of files) {
      const normalized = normalizeFilename(file);
      normalizedFiles[normalized] = file;
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

router.post('/versions/update/', requireLogin, async (req, res) => {
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

// Endpoint do przesuwania pozycji w górę
router.post('/:id/move-up', requireLogin, async (req, res) => {
  try {
    const positionId = req.params.id;
    const result = await db.movePositionUp(positionId);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error moving position up:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Endpoint do przesuwania pozycji w dół
router.post('/:id/move-down', requireLogin, async (req, res) => {
  try {
    const positionId = req.params.id;
    const result = await db.movePositionDown(positionId);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error moving position down:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/favs/clear/:groupNr', requireLogin, async (req, res) => {
  try {
    const groupNumber = req.params.groupNr;
    const favsToDelete = req.body.favList;
    const currentUser = ownerService.getCurrentUser(req);
    const userId = currentUser.userId;
    for (const fav of favsToDelete) {

      await db.removeFavorite(userId, fav, groupNumber);
    }
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database operation failed' });
  }
});
module.exports = router;