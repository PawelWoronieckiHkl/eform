const express = require('express');
const router = express.Router();
const { requireLogin, requirePermission, checkOrderOwnership } = require('../middleware/loginMixture');
const db = require("../db/db_helper.js");
const orderService = require('../services/orderService.js')
const mailBot = require('../services/mailBot/mailBot')
const path = require('path');
const OrderSender = require("../services/sendOrderService")
const { generatePdf } = require('../services/mailBot/pdfGenerator');
const { buildOrderItemStructure } = require('../services/itemBuilder.js');



router.get('/edit/:orderId', requireLogin, async (req, res) => {

    const orderData = await db.getOrderDetails(req.params.orderId);

    res.render('edit_order.njk', {
        orderData: orderData
    })
})


router.get("/", requireLogin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
        db.getUserOrders(req.session.user.userId, limit, offset),
        db.countUserOrders(req.session.user.userId)
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("orders.njk", {
        orders,
        page,
        limit,
        totalOrders,
        totalPages
    });
});


router.get("/history", requireLogin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
        db.getUserOrders(user.id, limit, offset, true),
        db.countUserOrders(user.id, true)
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("orders_history.njk", {
        orders,
        page,
        limit,
        totalOrders,
        totalPages
    });
});

router.get('/history/order/:orderId', requireLogin, checkOrderOwnership, async (req, res) => {
    const { orderDetails, orderItems } = await db.getOrderWithItems(req.params.orderId);

    if (orderItems) {
        const heads = Object.keys(orderItems[0].json_parameters);
        let { cleanOrderItems, total } = await orderService.jsonTextBackToMap(orderItems);
        if (req.session.user?.showPrices || req.session.user?.showPricesOnce) {
            console.log('WITHOUT PRICES')
            res.render("order_sent_prices.njk",
                { orderDetails: orderDetails, orderItems: orderItems, heads: heads, cleanOrderItems: cleanOrderItems, total: total }
            );
            req.session.user.showPricesOnce = false; 
            return ;
        } else {
            return res.render("order_sent.njk",
                { orderDetails: orderDetails, orderItems: orderItems, heads: heads, cleanOrderItems: cleanOrderItems, total: total }
            );
        }
    }
    else {
        return res.render('order.njk', { orderDetails: orderDetails[0] });
    }


});



router.get("/add-order", requireLogin, async (req, res) => {
    const addr = await db.getUserAddresses(user.id)

    res.render("new-order.njk", { addr: addr });
});


router.get('/order/:orderId/:prices(true|false)?', requireLogin, checkOrderOwnership, async (req, res) => {
    const { orderDetails, orderItems } = await db.getOrderWithItems(req.params.orderId);

    if (orderItems) {
        const heads = Object.keys(orderItems[0].json_parameters);
        let { cleanOrderItems, total } = await orderService.jsonTextBackToMap(orderItems);
        console.log(req.session.user?.showPrices, 'show prices in session', req.session.user?.showPricesOnce, 'show prices once in session');
        console.log(total, 'order')
        if (req.session.user?.showPrices || req.session.user?.showPricesOnce) {
            res.render('order_prices.njk', {
                orderDetails,
                orderItems,
                heads,
                cleanOrderItems,
                total
            });
            req.session.user.showPricesOnce = false; // Reset after first access
            return;  // zakończ obsługę
        } else {
            res.render('order.njk', {
                orderDetails,
                orderItems,
                heads,
                cleanOrderItems,
                total
            });
            return;
        }
    } else {
        res.render('order.njk', { orderDetails });
    }
});


router.get("/order/:orderId/new-position/", requireLogin, (req, res) => {

    res.render("form.njk", { orderId: req.params.orderId });
});

router.post('/send/:orderId', checkOrderOwnership, async (req, res) => {
    try {
        const id = req.params.orderId;
        const { status } = req.body;
        const response = await db.changeOrderStatus(id, 'sent');
        const { orderDetails, orderItems } = await db.getOrderDataToSend(req.params.orderId);

        if (orderItems || orderItems.length > 0) {
            const sender = new OrderSender.OrderSender(orderDetails, orderItems);
            const sendData = sender.init()
            const user = await db.getUserData(req.session.user?.pin ?? '0000')
            const clientName = user.client_name
            console.log('user and username', user, clientName)
            const photoFile = await db.getUserLogo(req.session.user?.pin ?? '0000')
            const logoPath = path.join(__dirname, '../img/', photoFile)

            const heads = Object.keys(orderItems[0].json_parameters);
            let { cleanOrderItems, total } = await orderService.jsonTextBackToMap(orderItems);
            // { orderDetails: orderDetails[0], orderItems: orderItems, heads: heads, cleanOrderItems: cleanOrderItems }
            const lang = req.getLocale();
            const mail = await db.getUserMail(req.session.user?.pin ?? '0000')


            const pdf = await generatePdf(orderDetails, cleanOrderItems, lang, logoPath, sendData)
            console.log(sendData, 'siema')
            mailBot.sendMail(
                [mail.user_email, mail.organization_email, mail.organization_email2],
                lang,
                pdf,
                {
                    klient: clientName,
                    orderNr: `${req.params.orderId}`,
                    logoPath: logoPath,
                    orderDetails: sendData
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
router.post('/copy/:orderId', checkOrderOwnership, async (req, res) => {
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

        console.log(item, 'ITEM TO COPY');
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
            item.lang);

        const newItem = await db.insertNewForm(body);
    }
    return res.json({ status: "success", message: "Zamówienie skopiowane poprawnie", redirect: `/orders/order/${newOrderId}` });
});


router.post('/lock', requireLogin, async (req, res) => {
    try {
        let {status} = req.body;
        if (req.session) req.session.user.showPrices = status;
        return res.json({status:'success', refresh:true})
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


        let id = await db.insertNewOrder(commission, addrId, user.id, comment, sendAddrId);

        return res.json({ status: "success", message: "Dane zapisane poprawnie", redirect: `/orders/order/${id}` });
    }
    catch (err) {
        console.error(err);
    }
});

router.put('/update-order/:orderId', checkOrderOwnership, async (req, res) => {
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
            response = db.insertNewOrder(commission, addrId, user.id);
        }

        return res.json({ response: response, redirect: `/orders/order/${orderId}` });
    }
    catch (err) {
        console.error(err);
    }
})

router.delete('/order/:orderId/delete/', checkOrderOwnership, async (req, res) => {
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




module.exports = router;
