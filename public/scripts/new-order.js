import { openAddAddressModal, sendAddressData } from './createNewAddress.js';
import {get } from './components/api_connector.js';

function toggleBtns(select, btnIds){
    select.addEventListener('change', () => {
        btnIds.forEach(btnId => {

            const btn = document.getElementById(btnId);
            console.log(btn, select, select.value)
            
            if (select.value) {
            btn.classList.remove('d-none');
        } else {
            btn.classList.add('d-none');
        }});
    });
}

async function openEditAddressModal(){
    const addrId = document.getElementById('address-select').value;
    if (!addrId) return;
    const url = `/address/${addrId}`;
    await get(url).then(addressData => {
        const fields = [
                ["name", "Nazwa adresu"],
                ["phone", "Telefon"],
                ["street", "Ulica"],
                ["city", "Miasto"],
                ["zip", "Kod pocztowy"],
                ["country", "Kraj"]]
        const updateUrl =  '/address/id';
    })
} 




const editAddressBtn = document.getElementById('edit-delivery-address-btn');
if (editAddressBtn) {
    editAddressBtn.addEventListener('click', openEditAddressModal);
}

document.addEventListener('DOMContentLoaded', () => {
    const addressSelect = document.getElementById('address-select');
    toggleBtns(addressSelect, ['edit-delivery-address-btn', 'delete-delivery-address-btn']);
    const mailSelect = document.getElementById('mail-select');
    toggleBtns(mailSelect, ['edit-mail-btn', 'delete-mail-btn']);
});

