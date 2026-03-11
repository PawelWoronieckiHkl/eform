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

router.get('/:id?orderId', requireLogin, async (req, res) => {
    try {
        const address = await db.getAddressById(req.params.id);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Adres nie znaleziony'
            });
        }
        else {
            return res.status(200).json({
                success: true,
                address
            });
        }
    } catch (err) {
        console.error('Error fetching address:', err);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas pobierania adresu'
        });
    }
});

router.get('/mail/:id?orderId', requireLogin, async (req, res) => {
    try {
        if (req.params.orderId){
            console.log('ORDER ID IN MAIL GET:', req.params.orderId);
        }
        const mail = await db.getMailById(req.params.id);
        if (!mail) {
            return res.status(404).json({
                success: false,
                message: 'Adres email nie znaleziony'
            });
        }
        else {
            return res.status(200).json({
                success: true,
                mail
            });
        }
    } catch (err) {
        console.error('Error fetching mail:', err);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas pobierania adresu email'
        });
    }
});

router.put('/:id', requireLogin, async (req, res) => {
    try {
        const { name, phone, street, city, zip, country } = req.body;
        const payload = {
            name: (name || '').trim(),
            phone: (phone || '').trim(),
            street: (street || '').trim(),
            city: (city || '').trim(),
            zip: (zip || '').trim(),
            country: (country || '').trim()
        };

        if (!payload.name || !payload.phone || !payload.street || !payload.city || !payload.zip || !payload.country) {
            return res.status(400).json({
                success: false,
                message: 'Wszystkie pola adresu dostawy są wymagane'
            });
        }

        await db.updateAddress(req.params.id, payload);
        return res.status(200).json({
            success: true,
            message: 'Adres dostawy został zaktualizowany'
        });
    } catch (error) {
        console.error('Error updating delivery address:', error);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas aktualizacji adresu dostawy'
        });
    }
});

router.put('/mail/:id', requireLogin, async (req, res) => {
    try {
        const { mail } = req.body;
        const email = (mail || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Podaj poprawny adres email'
            });
        }

        await db.updateMail(req.params.id, { mail: email });
        return res.status(200).json({
            success: true,
            message: 'Adres email został zaktualizowany'
        });
    } catch (error) {
        console.error('Error updating mail address:', error);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas aktualizacji adresu email'
        });
    }
});

router.delete('/:id', requireLogin, async (req, res) => {
    try {
        await db.deleteAddress(req.params.id);
        return res.status(200).json({
            success: true,
            message: 'Adres dostawy został usunięty'
        });
    } catch (error) {
        console.error('Error deleting delivery address:', error);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas usuwania adresu dostawy'
        });
    }
});

router.delete('/mail/:id', requireLogin, async (req, res) => {
    try {
        await db.deleteMail(req.params.id);
        return res.status(200).json({
            success: true,
            message: 'Adres email został usunięty'
        });
    } catch (error) {
        console.error('Error deleting mail address:', error);
        return res.status(500).json({
            success: false,
            message: 'Błąd podczas usuwania adresu email'
        });
    }
});




module.exports = router;