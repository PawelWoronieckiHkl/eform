
import {get } from './components/api_connector.js';

async function getAddrId(){
    let data = await get('/orders/address');
    console.log(data, 'ADDRESSES IN EDIT ORDER');
}

async function getMailId(){
    let data = await get('/orders/mail');
    console.log(data, 'MAILS IN EDIT ORDER');
}

// countrySelect init — locale from <html lang>
(function () {
    const langToCountry = { pl: 'pl', de: 'de', en: 'gb', nl: 'nl', fr: 'fr' };
    const currentCountry = langToCountry[document.documentElement.lang] || 'pl';
    const preferredList = [currentCountry].concat(['pl', 'de', 'gb', 'nl', 'fr'].filter(function (c) { return c !== currentCountry; }));
    $(function () {
        if ($.fn.countrySelect) {
            $('#country').countrySelect({ preferredCountries: preferredList, defaultCountry: currentCountry });
            $('#sendCountry').countrySelect({ preferredCountries: preferredList, defaultCountry: currentCountry });
        }
    });
}());

