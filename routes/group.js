const express = require('express');
const router = express.Router();
const { requireLogin, requireGroup } = require('../middleware/loginMixture');
const ownerService = require('../services/owner.js');
const db = require('../db/db_helper.js');
const OrderSender = require('../services/sendOrderService');
const mailBot = require('../services/mailBot/mailBot');
const orderService = require('../services/orderService.js');
const { generatePdf } = require('../services/mailBot/pdfGenerator');
const { getExtraAttachments } = require('../services/mailBot/extraAttachments');
const { buildItemProductionDays } = require('../services/productionDays');
const path = require('path');
const { log } = require('../utils/logging');

// ── Middleware: wszystkie trasy wymagają zalogowania i roli 'group' ──────────

router.use(requireLogin, requireGroup);

router.use((req, res, next) => {
    res.locals.isGroup = req.session?.user?.isGroup || false;
    res.locals.isGroupShop = req.session?.user?.isGroupShop || false;
    next();
});

// ── GET /group/shops ─ lista sklepów ────────────────────────────────────────

router.get('/shops', async (req, res, next) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const shops = await db.getGroupUsersByParentId(currentUser.userId);
        return res.render('group/shops.njk', {
            shops,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        log('[group/shops] Error:', err);
        return next(err);
    }
});

// ── GET /group/shops/new ─ formularz dodania sklepu ─────────────────────────

router.get('/shops/new', async (req, res) => {
    return res.render('group/shop_form.njk', { shop: null, mode: 'new' });
});

// ── POST /group/shops ─ zapisz nowy sklep ────────────────────────────────────

router.post('/shops', async (req, res, next) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const { ident, pin, password, street, zip, city, phone, email, tax_id } = req.body;

        if (!ident || !pin || !password) {
            return res.render('group/shop_form.njk', {
                shop: req.body,
                mode: 'new',
                error: 'Pola: identyfikator, pin i hasło są wymagane.'
            });
        }

        if (await db.isGroupLoginTaken(pin)) {
            return res.render('group/shop_form.njk', {
                shop: req.body,
                mode: 'new',
                error: 'Podany pin jest już zajęty.'
            });
        }

        if (await db.isGroupIdentTaken(ident)) {
            return res.render('group/shop_form.njk', {
                shop: req.body,
                mode: 'new',
                error: 'Podany identyfikator jest już zajęty.'
            });
        }

        const result = await db.addGroupUser({
            parentUserId: currentUser.userId,
            ident: ident.trim(),
            pin: pin.trim(),
            password,
            street: (street || '').trim(),
            zip: (zip || '').trim(),
            city: (city || '').trim(),
            phone: (phone || '').trim(),
            email: (email || '').trim(),
            taxId: (tax_id || '').trim()
        });

        if (!result.success) {
            return res.render('group/shop_form.njk', {
                shop: req.body,
                mode: 'new',
                error: 'Błąd podczas dodawania sklepu. Sprawdź czy identyfikator lub pin nie są zajęte.'
            });
        }

        return res.redirect('/group/shops?success=added');
    } catch (err) {
        log('[group/shops POST] Error:', err);
        return next(err);
    }
});

// ── GET /group/shops/:id/edit ─ formularz edycji ─────────────────────────────

router.get('/shops/:id/edit', async (req, res, next) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const shop = await db.getGroupUserById(req.params.id);

        if (!shop || shop.user_id !== currentUser.userId) {
            return res.redirect('/group/shops?error=notfound');
        }

        return res.render('group/shop_form.njk', { shop, mode: 'edit' });
    } catch (err) {
        log('[group/shops/:id/edit] Error:', err);
        return next(err);
    }
});

// ── POST /group/shops/:id ─ zapisz edycję ────────────────────────────────────

router.post('/shops/:id', async (req, res, next) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const id = parseInt(req.params.id, 10);
        const shop = await db.getGroupUserById(id);

        if (!shop || shop.user_id !== currentUser.userId) {
            return res.redirect('/group/shops?error=notfound');
        }

        const { ident, pin, password, street, zip, city, phone, email, tax_id } = req.body;

        if (!ident || !pin) {
            return res.render('group/shop_form.njk', {
                shop: { ...shop, ...req.body, id },
                mode: 'edit',
                error: 'Pola: identyfikator i pin są wymagane.'
            });
        }

        if (await db.isGroupLoginTaken(pin, id)) {
            return res.render('group/shop_form.njk', {
                shop: { ...shop, ...req.body, id },
                mode: 'edit',
                error: 'Podany pin jest już zajęty.'
            });
        }

        if (await db.isGroupIdentTaken(ident, id)) {
            return res.render('group/shop_form.njk', {
                shop: { ...shop, ...req.body, id },
                mode: 'edit',
                error: 'Podany identyfikator jest już zajęty.'
            });
        }

        await db.updateGroupUser(id, {
            ident: ident.trim(),
            pin: pin.trim(),
            street: (street || '').trim(),
            zip: (zip || '').trim(),
            city: (city || '').trim(),
            phone: (phone || '').trim(),
            email: (email || '').trim(),
            taxId: (tax_id || '').trim()
        });

        if (password && password.trim()) {
            await db.updateGroupUserPassword(id, password.trim());
        }

        return res.redirect('/group/shops?success=updated');
    } catch (err) {
        log('[group/shops/:id POST] Error:', err);
        return next(err);
    }
});

// ── DELETE /group/shops/:id ─ usuń sklep (AJAX) ──────────────────────────────

router.delete('/shops/:id', async (req, res, next) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const id = parseInt(req.params.id, 10);
        const shop = await db.getGroupUserById(id);

        if (!shop || shop.user_id !== currentUser.userId) {
            return res.status(403).json({ success: false, message: 'Brak uprawnień.' });
        }

        await db.deleteGroupUser(id);
        return res.status(200).json({ success: true });
    } catch (err) {
        log('[group/shops DELETE] Error:', err);
        return res.status(500).json({ success: false, message: 'Błąd serwera.' });
    }
});

// ── GET /group/pending-orders ─ oczekujące zamówienia sklepów ─────────────────

router.get('/pending-orders', requireLogin, requireGroup, async (req, res, next) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const orders = await db.getPendingOrdersByParentUserId(currentUser.userId);
        return res.render('group/pending_orders.njk', {
            title: 'Oczekujące zamówienia',
            orders,
        });
    } catch (err) {
        log('[group/pending-orders GET] Error:', err);
        return next(err);
    }
});

// ── POST /group/approve-order/:orderId ─ zatwierdź i wyślij ──────────────────

router.post('/approve-order/:orderId', requireLogin, requireGroup, async (req, res) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const orderId = parseInt(req.params.orderId, 10);

        // Weryfikacja: zamówienie należy do jednego ze sklepów tej grupy
        const shop = await db.getGroupUserByOrderId(orderId);
        if (!shop || shop.parent_user_id !== currentUser.userId) {
            return res.status(403).json({ success: false, message: 'Brak uprawnień.' });
        }

        let extraMail = process.env.EXTRA_MAIL ? process.env.EXTRA_MAIL.split(',') : false;

        await db.changeOrderStatus(orderId, 'sent');
        await db.appendShopNumberToOrderIdx(orderId, shop.id);

        const { orderDetails, orderItems } = await db.getOrderDataToSend(orderId);
        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Zamówienie jest puste.' });
        }

        const sender = new OrderSender.OrderSender(req, orderDetails, orderItems);
        const sendData = await sender.init();
        await sender.saveToFile();

        const user = await db.getUserData(currentUser.pin);
        const shopLabel = `${shop.ident} (id: ${shop.id})`;
        const clientName = `${user.client_name} (${user.ident}) / ${shopLabel}`;
        const photoFile = await db.getUserLogo(currentUser.pin);
        const logoPath = path.join(__dirname, '../img/', photoFile);
        const { cleanOrderItems, total } = await orderService.jsonTextBackToMap(orderItems);
        const productionTimes = currentUser?.orgId ? await db.getGroupDeliveryTimes(currentUser.orgId) : {};
        const { maxProdDays } = buildItemProductionDays(cleanOrderItems, productionTimes);
        const attachments = await getExtraAttachments(sender.slopePaths);
        const lang = req.getLocale();
        const mail = await db.getUserMail(currentUser.pin);
        const orderIdx = await db.getUserOrderId(orderId);

        let confirmationEmail;
        if (orderDetails?.contact_info_id) {
            const contactInfo = await db.getMailById(orderDetails.contact_info_id);
            confirmationEmail = contactInfo?.email || mail.user_email;
        } else {
            confirmationEmail = mail.user_email;
        }

        const mainRecipient = mail.organization_email;
        let bccList = [confirmationEmail, mail.organization_email2, extraMail, 'pawel.woroniecki@hkl.eu'].filter(Boolean).flat();
        const pdf = await generatePdf(orderDetails, cleanOrderItems, lang, logoPath, sendData, orderIdx, true, maxProdDays);
        const orgData = await db.getOrgInfo(req.session.user.organization);

        if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'dev') {
            bccList = [confirmationEmail, extraMail, 'pawel.woroniecki@hkl.eu', 'krzysztof.krawczyk@hkl.eu'].filter(Boolean).flat();
        }

        mailBot.sendMail(
            mainRecipient,
            lang,
            pdf,
            attachments,
            {
                klient: clientName,
                orderNr: orderIdx,
                logoPath: logoPath,
                orderDetails: sendData,
                organization: orgData
            },
            bccList.join(', ')
        );

        return res.json({ success: true, message: 'Zamówienie zatwierdzone i wysłane.', redirect: '/group/pending-orders' });
    } catch (err) {
        log('[group/approve-order POST] Error:', err);
        return res.status(500).json({ success: false, message: 'Błąd serwera.' });
    }
});

// ── POST /group/reject-order/:orderId ─ odrzuć (cofnij do active) ────────────

router.post('/reject-order/:orderId', requireLogin, requireGroup, async (req, res) => {
    try {
        const currentUser = ownerService.getCurrentUser(req);
        const orderId = parseInt(req.params.orderId, 10);

        const shop = await db.getGroupUserByOrderId(orderId);
        if (!shop || shop.parent_user_id !== currentUser.userId) {
            return res.status(403).json({ success: false, message: 'Brak uprawnień.' });
        }

        await db.changeOrderStatus(orderId, 'active');
        return res.json({ success: true, message: 'Zamówienie odrzucone.', redirect: '/group/pending-orders' });
    } catch (err) {
        log('[group/reject-order POST] Error:', err);
        return res.status(500).json({ success: false, message: 'Błąd serwera.' });
    }
});

module.exports = router;
