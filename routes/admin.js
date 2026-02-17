const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/loginMixture');
const logService = require('../services/logService.js');
const { formatLoginTime } = require('../utils/humanize_date.js');
const db = require("../db/db_helper.js");

router.use(async (req, res, next) => {
    if (req.session.user?.isOwner) {
        try {
            res.locals.users = await db.getUsersByOwner(req);
        } catch (error) {
            console.error('Error loading users for owner:', error);
            res.locals.users = [];
        }
    }
    next();
});


function requireAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).render('no-permission.njk');
    }
    next();
}

router.get('/', requireLogin, requireAdmin, async (req, res) => {
    res.render('admin/admin_panel.njk');
});

router.get('/login-history', requireLogin, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const loginHistory = await logService.getRecentLogins(limit);

        let formattedLoginHistory = [];
        if (loginHistory && loginHistory.length > 0) {
            formattedLoginHistory = loginHistory.map(login => ({
                ...login,
                login_time_formatted: formatLoginTime(login.login_time)
            }));
        }

        const totalLogins = loginHistory ? loginHistory.length : 0;

        res.render('admin/login_history.njk', {
            loginHistory: formattedLoginHistory,
            currentPage: page,
            limit: limit,
            totalLogins: totalLogins,
            hasNextPage: totalLogins === limit, 
            hasPrevPage: page > 1
        });
    } catch (error) {
        console.error('Error fetching login history:', error);
        res.status(500).render('error.njk', {
            message: 'Błąd podczas pobierania historii logowań'
        });
    }
});

router.get('/api/login-history', requireLogin, requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const userPin = req.query.user_pin || null;
        const userIdent = req.query.user_ident || null;

        let loginHistory;
        if (userPin) {
            loginHistory = await logService.getUserLoginHistory(userPin, limit);
        } else if (userIdent) {
            loginHistory = await logService.getUserLoginHistoryByIdent(userIdent, limit);
        } else {
            loginHistory = await logService.getRecentLogins(limit);
        }


        if (loginHistory && loginHistory.length > 0) {
            loginHistory = loginHistory.map(login => ({
                ...login,
                login_time_formatted: formatLoginTime(login.login_time),
                login_time: login.login_time 
            }));
        }

        res.json({
            success: true,
            data: loginHistory || [],
            count: loginHistory ? loginHistory.length : 0
        });
    } catch (error) {
        console.error('Error fetching login history API:', error);
        res.status(500).json({
            success: false,
            message: 'Błąd podczas pobierania historii logowań'
        });
    }
});

router.get('/users', requireLogin, requireAdmin, (req, res) => {
    res.render('admin/placeholder.njk', {
        title: 'Zarządzanie Użytkownikami',
        message: 'Ta funkcja zostanie wkrótce dodana.'
    });
});

router.get('/organizations', requireLogin, requireAdmin, (req, res) => {
    res.render('admin/placeholder.njk', {
        title: 'Zarządzanie Organizacjami',
        message: 'Ta funkcja zostanie wkrótce dodana.'
    });
});

router.get('/reports', requireLogin, requireAdmin, (req, res) => {
    res.render('admin/placeholder.njk', {
        title: 'Raporty Zamówień',
        message: 'Ta funkcja zostanie wkrótce dodana.'
    });
});

router.get('/settings', requireLogin, requireAdmin, (req, res) => {
    res.render('admin/placeholder.njk', {
        title: 'Ustawienia Systemowe',
        message: 'Ta funkcja zostanie wkrótce dodana.'
    });
});

router.get('/logs', requireLogin, requireAdmin, (req, res) => {
    res.render('admin/placeholder.njk', {
        title: 'Logi Systemowe',
        message: 'Ta funkcja zostanie wkrótce dodana.'
    });
});

module.exports = router;