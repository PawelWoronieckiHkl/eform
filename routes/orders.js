const express = require('express');
const router = express.Router();
const { requireLogin, checkOrderOwnership, requireOwner, isOwner } = require('../middleware/loginMixture');
const db = require("../db/db_helper.js");
const adminDb = require("../db/admin/db_helper.js");
const orderService = require('../services/orderService.js');
const ownerService = require('../services/owner.js');
const mailBot = require('../services/mailBot/mailBot');
const path = require('path');
const OrderSender = require("../services/sendOrderService");
const { generatePdf } = require('../services/mailBot/pdfGenerator');
const { buildOrderItemStructure } = require('../services/itemBuilder.js');
const { getPriceAfterDiscount } = require('../services/getDiscount.js');
const { SyncProdStatus, setParcelHref } = require('../services/prodStatus.js');
const {getExtraAttachments} = require('../services/mailBot/extraAttachments');
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


router.get('/edit/:orderId', requireLogin, async (req, res) => {

    const orderData = await db.getOrderDetails(req.params.orderId);

    res.render('edit_order.njk', {
        orderData: orderData
    })
})


router.get("/userOrders", requireLogin, requireOwner, async (req, res) => {
    try {
        const { userIdent } = req.query;

        if (!userIdent) {
            delete req.session.context_user;
            return res.redirect('/orders');
        }

        // Ustawienie kontekstu użytkownika na podstawie userIdent
        await ownerService.setContextUserByIdent(req, userIdent);

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const userId = await db.getUserIdByIdent(userIdent);

        // Pobierz zamówienia dla konkretnego użytkownika
        const [orders, totalOrders] = await Promise.all([
            db.getUserOrders(userId, limit, offset),
            db.countUserOrders(userId)
        ]);

        const totalPages = Math.ceil(totalOrders / limit);

        // Pobierz dane użytkownika dla nagłówka
        const selectedUser = await db.getUserData(userIdent);

        res.render("orders_owner.njk", {
            orders,
            page,
            limit,
            totalOrders,
            totalPages,
            admin: req.session.user.isAdmin,
            owner: req.session.user.isOwner,
            selectedUser: selectedUser,
            selectedUserIdent: userIdent
        });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/", requireLogin, async (req, res) => {


    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    let orders, totalOrders;
    const currentUser = ownerService.getCurrentUser(req);

    if (req.session.user?.isEmployee) {
        [orders, totalOrders] = await Promise.all([
            db.getUserOrders(currentUser.userId, limit, offset, false, false, req.session.employee.id),
            db.countUserOrders(currentUser.userId, false, false, req.session.employee.id)
        ]);
    }
    else {
        [orders, totalOrders] = await Promise.all([
            db.getUserOrders(currentUser.userId, limit, offset),
            db.countUserOrders(currentUser.userId)
        ]);
    }
    // console.log(req.session.user.isOwner, 'IS OWNER IN ORDERS LIST@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
    const totalPages = Math.ceil(totalOrders / limit);
    if (req.session.user?.isOwner) {
        res.render("orders_owner.njk", {
            orders,
            page,
            limit,
            totalOrders,
            admin: req.session.user.isAdmin,
            owner: req.session.user.isOwner,
            totalPages,

        });
    }
    else {
        res.render("orders.njk", {
            orders,
            page,
            limit,
            totalOrders,
            totalPages,
            admin: req.session.user.isAdmin,
            owner: req.session.user.isOwner,
            isEmployee: req.session.user?.isEmployee || false
        });
    }
});

router.get('/organization-orders?:history', requireLogin, requireOwner, async (req, res) => {
    ownerService.clearContextUser(req);
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;
    const history = req.query.history === 'true';

    const currentUser = ownerService.getCurrentUser(req);
    let [orders, totalOrders] = [];
    if (history) {
        [orders, totalOrders] = await Promise.all([
            db.getUserOrders(currentUser.userId, limit, offset, history, req.session.user.organization),
            db.countUserOrders(currentUser.userId, history, req.session.user.organization)
        ]);
    } else {
        [orders, totalOrders] = await Promise.all([
            db.getUserOrders(currentUser.userId, limit, offset, false, req.session.user.organization),
            db.countUserOrders(currentUser.userId, false, req.session.user.organization)
        ]);
    }


    const totalPages = Math.ceil(totalOrders / limit);

    if (req.session.user?.isOwner) {
        if (history) {
            res.render('owner/organization_orders_history.njk', {
                orders,
                page,
                limit,
                totalOrders,
                totalPages
            });
            return;
        }
        else {
            res.render('owner/organization_orders.njk', {
                orders,
                page,
                limit,
                totalOrders,
                totalPages
            });
            return;
        }
    }
});



router.get("/history", requireLogin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const currentUser = ownerService.getCurrentUser(req);
    let orders, totalOrders;
    const user = await db.getOwner(currentUser.pin);
    let status = new SyncProdStatus();
    const files = await status.init(user.orgIdent, user.userIdent);

    if (req.session.user?.isEmployee) {
        [orders, totalOrders] = await Promise.all([
            db.getUserOrders(currentUser.userId, limit, offset, true, false, req.session.employee.id),
            db.countUserOrders(currentUser.userId, true, false, req.session.employee.id)
        ]);
    }
    else {
        [orders, totalOrders] = await Promise.all([
            db.getUserOrders(currentUser.userId, limit, offset, true),
            db.countUserOrders(currentUser.userId, true)
        ]);
    }

    const totalPages = Math.ceil(totalOrders / limit);
    if (req.session.user?.isOwner) {
        res.render("orders_history_owner.njk", {
            orders,
            page,
            limit,
            totalOrders,
            owner: req.session.user.isOwner,
            totalPages
        });
    }
    else {
        res.render("orders_history.njk", {
            orders,
            page,
            limit,
            totalOrders,
            totalPages,
            owner: req.session.user.isOwner,
            isEmployee: req.session.user?.isEmployee || false
        });
    }

});

router.get('/history/order/:orderId', requireLogin, checkOrderOwnership, async (req, res) => {

    const { orderDetails, orderItems } = await db.getOrderWithItems(req.params.orderId);
    const currentUser = ownerService.getCurrentUser(req);
    // console.log(orderDetails, 'CURRENT USER IN ORDER HISTORY VIEW');
    let statuses = await db.getUserStatuses(currentUser.ident, orderDetails.order_idx);
    statuses = setParcelHref(statuses);
    
    if (orderItems) {
        const heads = Object.keys(orderItems[0].json_parameters);
        let { cleanOrderItems, total } = await orderService.jsonTextBackToMap(orderItems);
        const totalPrice = await db.getTotal(orderDetails.id)

        if (req.session.user?.showPrices || req.session.user?.showPricesOnce) {
            res.render("order_sent_prices.njk",
                {
                    orderDetails: orderDetails, orderItems: orderItems, heads: heads, cleanOrderItems: cleanOrderItems, total: total, totalPrice: totalPrice, statuses: statuses

                }
            );
            req.session.user.showPricesOnce = false;
            return;
        } else {
            return res.render("order_sent.njk",
                {
                    orderDetails: orderDetails, orderItems: orderItems, heads: heads, cleanOrderItems: cleanOrderItems, total: total, owner: req.session.user.isOwner, statuses: statuses

                }
            );
        }
    }
    else {
        return res.render('order.njk', { orderDetails: orderDetails[0] });
    }


});



router.get("/add-order", requireLogin, async (req, res) => {
    const currentUser = ownerService.getCurrentUser(req);
    const addr = await db.getUserAddresses(currentUser.userId)

    res.render("new-order.njk", { addr: addr });
});


router.get('/order/:orderId/:prices(true|false)?', requireLogin, checkOrderOwnership, async (req, res) => {
    const { orderDetails, orderItems } = await db.getOrderWithItems(req.params.orderId);
    const clientDiscount = await getPriceAfterDiscount(req.params.orderId);
    if (orderItems) {
        const heads = Object.keys(orderItems[0].json_parameters);
        let { cleanOrderItems, total } = await orderService.jsonTextBackToMap(orderItems);
        const totalPrice = await db.getTotal(orderDetails.id)

        // console.log(total, ' total order')
        if (req.session.user?.showPrices || req.session.user?.showPricesOnce) {
            res.render('order_prices.njk', {
                orderDetails,
                orderItems,
                heads,
                cleanOrderItems,
                total,
                isEmployee: req.session.user?.isEmployee || false,
                totalPrice: totalPrice
            });
            req.session.user.showPricesOnce = false; // Reset after first access
            return;  // zakończ obsługę
        } else {
            res.render('order.njk', {
                orderDetails,
                orderItems,
                heads,
                cleanOrderItems,
                discount: clientDiscount,
                total,
                isEmployee: req.session.user?.isEmployee || false,
                totalPrice: totalPrice
            });
            return;
        }
    } else {
        res.render('order.njk', { orderDetails });
    }
});


router.get('/order/:orderId/discount-info', requireLogin, checkOrderOwnership, async (req, res) => {
    try {
        const discountInfo = await getPriceAfterDiscount(req.params.orderId);
        return res.json({
            success: true,
            data: discountInfo
        });
    } catch (error) {
        console.error('Error fetching discount info:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching discount info'
        });
    }
});

router.get('/order-details/:orderId', requireLogin, checkOrderOwnership, async (req, res) => {
    try {
        const order = await db.getOrderDataToSend(req.params.orderId);
        const { orderDetails, orderItems } = await db.getOrderWithItems(req.params.orderId);
        let { cleanOrderItems, total } = await orderService.jsonTextBackToMap(orderItems);
        const sender = new OrderSender.OrderSender(order.orderDetails, order.orderItems);
        const sendData = sender.getData();
        const totalPrice = await db.getTotal(order.orderDetails.id);
        res.json({ success: true, data: { sendData, totalPrice, cleanOrderItems, total } });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ success: false, message: 'Error fetching order details' });
    }
});


router.post('/order/:orderId/set-discount', requireLogin, checkOrderOwnership, async (req, res) => {
    try {
        const { discountPercentage, discountValue } = req.body;
        const orderId = req.params.orderId;
        const result = await db.saveDiscount(orderId, discountPercentage, discountValue);
        if (result) {
            return res.json({
                success: true,
                message: 'Rabat został zapisany pomyślnie',
                data: result
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Błąd podczas zapisywania rabatu'
            });
        }
    } catch (error) {
        console.error('Error saving discount:', error);
        return res.status(500).json({
            success: false,
            message: 'Wewnętrzny błąd serwera podczas zapisywania rabatu'
        });
    }
});

router.get('/orderpdf/:orderId/:showPrices?/:short?', requireLogin, checkOrderOwnership, async (req, res) => {
    try {
        const { orderDetails, orderItems } = await db.getOrderWithItems(req.params.orderId);
        const order = await db.getOrderDataToSend(req.params.orderId);

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Nie można wygenerować PDF dla pustego zamówienia"
            });
        }

        const heads = Object.keys(orderItems[0].json_parameters);
        let { cleanOrderItems, total } = await orderService.jsonTextBackToMap(orderItems);
        const sender = new OrderSender.OrderSender(order.orderDetails, order.orderItems);
        const sendData = sender.getData();
        // console.log('SEND DATA IN ORDER PDF', sendData);
        const totalPrice = await db.getTotal(order.orderDetails.id)
        const currentUser = ownerService.getCurrentUser(req);
        const photoFile = await db.getUserLogo(currentUser?.pin);
        const logoPath = path.join(__dirname, '../img/', photoFile);

        // Konwertuj logo do base64 z obsługą błędów
        const fs = require('fs');
        let logoDataUri = null;
        try {
            console.log('Próba odczytu logo z:', logoPath);
            if (fs.existsSync(logoPath)) {
                const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
                logoDataUri = `data:image/png;base64,${logoBase64}`;
                console.log('Logo pomyślnie załadowane');
            } else {
                console.log('Plik logo nie istnieje:', logoPath);
            }
        } catch (error) {
            console.error('Błąd przy odczycie logo:', error);
        }

        // Konfiguracja i18n tak jak w pdfGenerator.js
        const nunjucks = require('nunjucks');
        const confLang = require('../services/mailBot/conf');
        const lang = req.getLocale();
        const i18n = confLang(lang);
        const __ = (key) => i18n.__(key, { locale: lang });

        // Konfiguracja Nunjucks z funkcją tłumaczenia
        const env = nunjucks.configure('templates', {
            autoescape: true,
            trimBlocks: true,
            lstripBlocks: true
        });
        env.addGlobal('__', __);

        console.log('Dane przekazywane do template:', {
            orderDetails: orderDetails.id,
            itemsCount: orderItems.length,
            photoFile,
            logoPath: logoDataUri ? 'LOGO_LOADED' : 'NO_LOGO'
        });
        console.log(req.session.user.showPrices, 'show prices in session before render', req.session.user.showPricesOnce);

        // Określ czy pokazać ceny (sprawdź przed resetowaniem showPricesOnce)
        const shouldShowPrices = req.session.user?.showPrices || req.session.user?.showPricesOnce || req.params.showPrices === 'true';
        const isShort = req.params.short === 'true';
        // console.log(req.params.short, isShort, 'isShort param', req.params.showPrices, shouldShowPrices, 'should show prices in pdf');
        // Wyrenderuj template do HTML
        let html;
        if (!isShort) {
            html = env.render('order_to_print.njk', {
                orderDetails,
                orderItems,
                heads,
                cleanOrderItems,
                total,
                photoFile,
                logoPath: logoDataUri,
                prices: shouldShowPrices,
                totalPrice: totalPrice,
                sendData: sendData
            });
        }
        else {
            html = env.render('order_to_print_short.njk', {
                orderDetails,
                orderItems,
                heads,
                cleanOrderItems,
                total,
                photoFile,
                logoPath: logoDataUri,
                prices: shouldShowPrices,
                sendData: sendData,
                totalPrice: totalPrice,

            });
        }


        // Użyj Playwright do wygenerowania PDF z HTML
        const { chromium } = require('playwright');
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext();
        const page = await context.newPage();

        await page.setContent(html, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        const pdfBuffer = await page.pdf({
            format: 'A3',
            landscape: true,
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });

        await browser.close();

        // Ustaw nagłówki dla pobrania pliku
        const fileName = `zamowienie_${orderDetails.id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Wyślij PDF
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Błąd generowania PDF:', error);
        res.status(500).json({
            success: false,
            message: "Błąd podczas generowania PDF: " + error.message
        });
    }
});


router.get("/order/:orderId/new-position/", requireLogin, (req, res) => {

    res.render("form.njk", { orderId: req.params.orderId });
});

router.post('/send/:orderId', requireLogin, checkOrderOwnership, async (req, res) => {
    try {
        let extraMail = process.env.EXTRA_MAIL ? process.env.EXTRA_MAIL.split(',') : false;
        const id = req.params.orderId;
        const status = req.body.status;
        const response = await db.changeOrderStatus(id, 'sent');
        await db.updateOrderPriceOnSend(id, req.body.prices);
        const { orderDetails, orderItems } = await db.getOrderDataToSend(req.params.orderId);

        if (orderItems || orderItems.length > 0) {
            const sender = new OrderSender.OrderSender(req, orderDetails, orderItems);
            const sendData = await sender.init()

            const currentUser = ownerService.getCurrentUser(req);
            const user = await db.getUserData(currentUser?.pin)
            const clientName = user.client_name
            const photoFile = await db.getUserLogo(currentUser?.pin)
            const logoPath = path.join(__dirname, '../img/', photoFile)
            const heads = Object.keys(orderItems[0].json_parameters);
            let { cleanOrderItems, total } = await orderService.jsonTextBackToMap(orderItems);
            const attachments = await getExtraAttachments(sender.slopePaths);
            const lang = req.getLocale();
            const mail = await db.getUserMail(currentUser?.pin)
            const orderIdx = await db.getUserOrderId(req.params.orderId)
            let mailList = [mail.user_email, mail.organization_email, mail.organization_email2, extraMail, 'pawel.woroniecki@hkl.eu'];
            const pdf = await generatePdf(orderDetails, cleanOrderItems, lang, logoPath, sendData, orderIdx)
            const orgData = await db.getOrgInfo(req.session.user.organization)

            if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'dev') {
                mailList = [extraMail, 'pawel.woroniecki@hkl.eu', 'krzysztof.krawczyk@hkl.eu']
            }
            // console.log(clientName, orderDetails, 'CLIENT NAME IN SEND ORDER ?@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');

            mailBot.sendMail(
                mailList,
                lang,
                pdf,
                attachments,
                {
                    klient: clientName,
                    orderNr: orderIdx,
                    logoPath: logoPath,
                    orderDetails: sendData,
                    organization: orgData
                }
            );

        }
        else {
            return res.status(400).json({
                success: false,
                message: "Nie możesz wysłać pustego zamówienia"
            });
        }

        return res.json({ status: "success", message: "Dane zapisane poprawnie", redirect: "/orders/history" });
    }
    catch (err) {
        console.error(err);
    }
});
router.post('/copy/:orderId', checkOrderOwnership, requireLogin, async (req, res) => {
    let orderAddress = null;
    let sendAddress = null;

    const orderId = req.params.orderId;
    const { orderDetails, orderItems } = await db.getOrderWithItems(orderId);
    if (!orderDetails || !orderItems) {
        return res.status(404).json({ status: "error", message: "Nie znaleziono zamówienia" });
    }

    if (orderDetails?.order_address_id) {
        orderAddress = await db.duplicateOrderAddress(orderDetails.order_address_id);
        console.log(orderAddress, 'ORDER ADDRESS TO COPY');
    }
    if (orderDetails?.send_address_id) {
        sendAddress = await db.duplicateSendAddress(orderDetails.send_address_id);
        console.log(sendAddress, 'SEND ADDRESS TO COPY');
    }

    const newOrderId = await db.insertNewOrder(orderDetails.commision, orderAddress, orderDetails.user_id, orderDetails.comment, sendAddress);
    if (!newOrderId) {
        return res.status(500).json({ status: "error", message: "Nie udało się skopiować zamówienia" });
    }
    for (const item of orderItems) {

        // console.log(item, 'ITEM TO COPY');
        let body = buildOrderItemStructure(
            newOrderId,
            item.list_price,
            item.dicsount_percentage,
            item.discount,
            item.unit_price,
            item.total_price,
            item.name,
            item.commision,
            item.json_parameters,
            item.json_parameters_desc,
            item.amount,
            item.comment,
            item.ver,
            item.asortment_group_number,
            item.lang,
            item.department,
            item.group_name,
            item.parameters_short
        );
        // console.log(body, 'BODY TO INSERT AS NEW ITEM');
        // console.log(item.total_price, item.unit_price, 'PRICES IN ITEM TO COPY');
        const newItem = await db.insertNewForm(body);
    }
    return res.json({ status: "success", message: "Zamówienie skopiowane poprawnie", redirect: `/orders/order/${newOrderId}` });
});


router.post('/lock', requireLogin, async (req, res) => {
    try {
        let { status } = req.body;
        if (req.session) req.session.user.showPrices = status;
        return res.json({ status: 'success', refresh: true })
    }
    catch (err) {
        console.error(err);
    }
});
router.post('/save-order', requireLogin, async (req, res) => {
    try {
        let { commission, orderContactInfo, comment, orderSendAddress } = req.body;

        let response
        let sendAddrId = null;
        let addrId = null;
        if (orderContactInfo) {
            response = await db.insertOrderAddress(orderContactInfo)
            addrId = response;
        }
        if (orderSendAddress) {
            response = await db.insertSendAddress(orderSendAddress);
            sendAddrId = response
        }

        const currentUser = ownerService.getCurrentUser(req);
        let id = 0;
        if (req.session.user.isEmployee) {
            console.log(req.session?.employee.id ?? null, 'employeeId w insertNewOrder')

            id = await db.insertNewOrder(commission, addrId, currentUser.userId, comment, sendAddrId, 0, req.session?.employee.id ?? null);
        }
        else {
            id = await db.insertNewOrder(commission, addrId, currentUser.userId, comment, sendAddrId);
        }
        return res.json({ status: "success", message: "Dane zapisane poprawnie", redirect: `/orders/order/${id}` });
    }
    catch (err) {
        console.error(err);
    }
});

router.put('/update-order/:orderId', requireLogin, checkOrderOwnership, async (req, res) => {
    try {
        const { commission, orderContactInfo, orderSendAddress, comment } = req.body;
        const { orderId } = req.params;
        const existingOrder = await db.getOrderDetails(orderId);
        let response = false;
        if (existingOrder) {
            response = await db.updateOrderDetails(orderId, comment, commission, orderContactInfo, orderSendAddress);
        }
        else {
            response = await db.insertOrderAddress(orderContactInfo)
            const addrId = response[0].insertId;
            const currentUser = ownerService.getCurrentUser(req);
            response = db.insertNewOrder(commission, addrId, currentUser.userId);
        }

        return res.json({ response: response, redirect: `/orders/order/${orderId}` });
    }
    catch (err) {
        console.error(err);
    }
})

router.delete('/order/:orderId/delete/', requireLogin, checkOrderOwnership, async (req, res) => {
    // console.log(req.params.orderId);
    let response = await db.deleteOrder(req.params.orderId);
    if (response) {
        return res.status(200).json({
            success: true,
            message: `order.remove_message`
        });
    }
    else {
        return res.status(400).json({
            success: false,
            message: `Nie znaleziono zamówienia`
        })
    }
})

router.patch('/:orderId/comment/update', requireLogin, async (req, res) => {
    const { orderId } = req.params;
    const { comment } = req.body;

    try {
        const orderRows = await db.getOrderDetails(orderId);
        if (!orderRows || orderRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Zamówienie nie istnieje.' });
        }
        await db.updateOrderComment(orderId, comment);

        return res.json({
            success: true,
            data: { orderId: +orderId, comment }
        });
    } catch (err) {
        console.error('Błąd przy aktualizacji komentarza:', err);
        return res.status(500).json({ success: false, error: 'Wewnętrzny błąd serwera.' });
    }
});

// Clear context user endpoint
router.get('/clear-context', requireLogin, requireOwner, async (req, res) => {
    try {
        ownerService.clearContextUser(req);
        res.redirect('/orders');
    } catch (err) {
        console.error('Error clearing context user:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});




module.exports = router;
