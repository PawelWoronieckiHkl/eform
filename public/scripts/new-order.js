import { openAddAddressModal, sendAddressData } from './createNewAddress.js';
import { get, del } from './components/api_connector.js';

function toggleBtns(select, btnIds) {
    const edit = document.getElementById('update-order');
    if (edit) {
        btnIds.forEach(btnId => {

            const btn = document.getElementById(btnId);
            console.log(btn, select, select.value)

            if (select.value) {
                btn.classList.remove('d-none');
            } else {
                btn.classList.add('d-none');
            }
        });
    }

    select.addEventListener('change', () => {
        btnIds.forEach(btnId => {

            const btn = document.getElementById(btnId);
            console.log(btn, select, select.value)

            if (select.value) {
                btn.classList.remove('d-none');
            } else {
                btn.classList.add('d-none');
            }
        });
    });
}

async function openEditAddressModal() {
    const addrId = document.getElementById('address-select').value;
    if (!addrId) return;
    const url = `/address/${addrId}`;
    await get(url).then(addressResponse => {
        const currentAddress = addressResponse.addressData;

        const fields = [
            ["name", "Nazwa adresu"],
            ["phone", "Telefon"],
            ["street", "Ulica"],
            ["city", "Miasto"],
            ["zip", "Kod pocztowy"],
            ["country", "Kraj"]];

        openAddAddressModal(fields, `/address/${addrId}`, {
            title: "Edytuj adres",
            requestMethod: "PUT",
            initialData: currentAddress,
            onSubmit: (_response, payload) => {
                const addressSelect = document.getElementById('address-select');
                const selectedOption = addressSelect.options[addressSelect.selectedIndex];
                if (selectedOption) {
                    selectedOption.textContent = formatAddressOption(payload);
                }
            }
        });
    })
}

async function openEditMailModal() {
    const mailSelect = document.getElementById('mail-select');
    const mailId = mailSelect?.value;
    if (!mailId) return;

    const mailResponse = await get(`/address/mail/${mailId}`);
    const fields = [["mail", "Email"]];

    openAddAddressModal(fields, `/address/mail/${mailId}`, {
        title: "Edytuj adres Email",
        requestMethod: "PUT",
        initialData: { mail: mailResponse.mail?.email || '' },
        onSubmit: (_response, payload) => {
            const selectedOption = mailSelect.options[mailSelect.selectedIndex];
            if (selectedOption) {
                selectedOption.textContent = payload.mail;
            }
        }
    });
}

async function deleteSelectedAddress() {
    const addressSelect = document.getElementById('address-select');
    const addrId = addressSelect?.value;
    if (!addrId) return;

    const shouldDelete = window.confirm('Czy na pewno usunac wybrany adres dostawy?');
    if (!shouldDelete) return;

    await del(`/address/${addrId}`);
    removeSelectedOption(addressSelect);
}

async function deleteSelectedMail() {
    const mailSelect = document.getElementById('mail-select');
    const mailId = mailSelect?.value;
    if (!mailId) return;

    const shouldDelete = window.confirm('Czy na pewno usunac wybrany adres email?');
    if (!shouldDelete) return;

    await del(`/address/mail/${mailId}`);
    removeSelectedOption(mailSelect);
}

function removeSelectedOption(select) {
    if (!select) return;

    const selectedValue = select.value;
    if (!selectedValue) return;

    const optionToRemove = select.querySelector(`option[value="${selectedValue}"]`);
    if (optionToRemove) {
        optionToRemove.remove();
    }

    select.value = "";
    select.dispatchEvent(new Event('change'));
}

function formatAddressOption(payload) {
    return `${payload.name || ''}  (${payload.street || ''} ${payload.city || ''} ${payload.zip || ''} ${payload.country || ''})`.trim();
}




const editAddressBtn = document.getElementById('edit-delivery-address-btn');
if (editAddressBtn) {
    editAddressBtn.addEventListener('click', openEditAddressModal);
}

const deleteAddressBtn = document.getElementById('delete-delivery-address-btn');
if (deleteAddressBtn) {
    deleteAddressBtn.addEventListener('click', deleteSelectedAddress);
}

const editMailBtn = document.getElementById('edit-mail-btn');
if (editMailBtn) {
    editMailBtn.addEventListener('click', openEditMailModal);
}

const deleteMailBtn = document.getElementById('delete-mail-btn');
if (deleteMailBtn) {
    deleteMailBtn.addEventListener('click', deleteSelectedMail);
}

document.addEventListener('DOMContentLoaded', () => {
    const addressSelect = document.getElementById('address-select');
    toggleBtns(addressSelect, ['edit-delivery-address-btn', 'delete-delivery-address-btn']);
    const mailSelect = document.getElementById('mail-select');
    toggleBtns(mailSelect, ['edit-mail-btn', 'delete-mail-btn']);
});

