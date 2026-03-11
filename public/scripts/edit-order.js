
import {get } from './components/api_connector.js';

async function getAddrId(){
    let data = await get('/orders/address');
    console.log(data, 'ADDRESSES IN EDIT ORDER');
}

async function getMailId(){
    let data = await get('/orders/mail');
    console.log(data, 'MAILS IN EDIT ORDER');
}

