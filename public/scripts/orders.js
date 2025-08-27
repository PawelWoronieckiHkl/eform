import { showToast } from "./components/toast.js";
import { createInfoDialog } from "./components/htmlManipulator.js";
import { validate } from './base.js'
// import { deleteDiag } from './order.js'
const otherAddrFlag = { value: false };
const addrFlag = { value: false };
async function prepareRestData() {

	const orderCommision = document.getElementById("commission-input").value;
	const comment = document.getElementById('comment').value;
	const orderContactInfo = {
		'name': document.getElementById('name').value,
		'phone': document.getElementById('phone').value,
		'email': document.getElementById('email').value,
		'street': document.getElementById("street").value,
		'city': document.getElementById("city").value,
		'zip': document.getElementById("zip").value,
		'country': document.getElementById("country_code")?.value ?? '',

	}
	const orderSendAddress = {
		'name': document.getElementById('sendName').value,
		'phone': document.getElementById('sendPhone').value,
		'email': document.getElementById('sendEmail').value,
		'street': document.getElementById("sendStreet").value,
		'city': document.getElementById("sendCity").value,
		'zip': document.getElementById("sendZip").value,
		'country': document.getElementById("sendCountry_code")?.value ?? '',

	}
	console.log(addrFlag.value, otherAddrFlag.value)
	let body = JSON.stringify({
		commission: orderCommision,
		...(addrFlag.value ? { orderContactInfo: orderContactInfo } : false),
		comment: comment,
		...(otherAddrFlag.value ? { orderSendAddress: orderSendAddress } : false)
	})
	return body;
}


async function createOrder() {
	const requestBody = await prepareRestData();

	try {
		const response = await fetch("/orders/save-order", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: requestBody,
		});
		const result = await response.json();

		if (result.redirect) {
			newOrderButton.disabled = true;
			showToast('success', t('orders.saved_success_label'));
			setTimeout(() => {
				window.location.href = result.redirect;
			}, 500);

		}
	}

	catch (error) {
		console.error(error);
	}
}
async function updateOrder(orderId) {
	const requestBody = await prepareRestData();
	try {
		const response = await fetch(`/orders/update-order/${orderId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: requestBody,
		});
		const result = await response.json();

		if (result.redirect) {
			showToast('success', t('orders.saved_success_label'));
			window.location.href = result.redirect;
		}
	}
	catch (error) {
		console.error(error);
	}
}

const deletePositionBtns = document.querySelectorAll('.delete-position-btn');
const confirmationDialog = document.getElementById('delete-dialog');
const closeBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');
const statusInfo = document.getElementById('status-info');

async function deleteItem(path) {
	const res = await fetch(path, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' }
	});
	if (!res.ok) throw new Error(`${t('order.error_word')}: ${res.statusText}`);
	const data = await res.json();
	statusInfo.innerHTML = t(data.message) + `. ${t('order.redirecting_word')}`;

	statusInfo.classList.add(data.success ? 'alert-success' : 'alert-danger');
	document.getElementById('for-sure').style.display = 'none';
	if (data.success) {
		closeBtn.hidden = confirmBtn.hidden = true;
		setTimeout(() => {
			if (path.includes('position')) location.reload();
			else window.location.href = '/orders';
		}, 300);
	}
}

function deleteDiag(btn) {
	btn.addEventListener('click', () => {
		confirmationDialog.showModal();
		closeBtn.onclick = () => confirmationDialog.close();
		confirmBtn.onclick = () => deleteItem(btn.dataset.href);
	});
}
console.log(deletePositionBtns)
deletePositionBtns.forEach(deleteDiag);


function buildAndShowDialog(btn, functionName) {
	const parent = document.getElementById('dialog-container');
	const title = functionName === 'sendOrder'
		? `${t('orders.send_order')}`
		: functionName === 'copyItem'
			? `${t('orders.open_as_new')}`
			: "";
	const label = functionName === 'sendOrder'
		? `${t('orders.send_word')}`
		: functionName === 'copyItem'
			? `${t('orders.accept')}`
			: "";

	const { buttons, dialog } = createInfoDialog({
		title: title,
		message: `${t('orders.are_you_sure')}`,
		buttons: [
			{
				label: `${t('orders.abort')}`,
				action: () => console.log("Anulowano"),
				className: "btn btn-secondary me-1",
				id: "cancel-btn"
			},
			{
				label: label,
				action: () => {
					if (functionName == 'sendOrder') {
						sendOrder(btn)
					}
					else if (functionName == 'copyItem') {
						copyItem(btn)
					}
				},
				className: "btn btn-success ms-1",
				id: "confirm-btn"
			}
		],
		parent
	});
}

async function sendOrder(sendBtn) {
	const orderId = sendBtn.dataset.id
	try {
		const response = await fetch(`/orders/send/${orderId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: 'sent' })
		});
		const result = await response.json();
		console.log(response)
		if (result.status === "success") {
			showToast('success', `${t('orders.send_success_label')}`);
			setTimeout(() => {
				window.location.href = result.redirect;
			}, 1500);

		}
		else {
			showToast('error', result.message);
		}
	}
	catch (error) {
		showToast('error', error);
	}
}

function toggleAddressDropdown(addrCheckId, addrClass) {
	const checkbox = document.getElementById(addrCheckId);
	const newAddrFields = document.querySelectorAll(addrClass);
	let addrFlag;
	if (checkbox.checked) {
		newAddrFields.forEach(row => row.classList.remove('d-none'));
		addrFlag = true
	} else {
		newAddrFields.forEach(row => row.classList.add('d-none'));
		addrFlag = false
	}
	return addrFlag
}




const updateOrderButton = document.getElementById('update-order');
const newOrderButton = document.getElementById("save-order-btn");

if (updateOrderButton) {

	const orderId = updateOrderButton.dataset.id;
	updateOrderButton.addEventListener('click', () => {
		if (validate('.validate')) {
			updateOrder(orderId)
		}
	})
}

else if (newOrderButton) {
	const runCreateOrder = () => {
		if (validate('.validate')) {
			createOrder();
		} else {
			console.log('no nie true');
			return;
		}
	};

	newOrderButton.addEventListener('click', runCreateOrder);

	document.addEventListener('keydown', (event) => {
		// Sprawdzamy, czy Enter został wciśnięty
		if (event.key === 'Enter') {
			event.preventDefault(); // opcjonalnie, by nie submitować formularza domyślnie
			runCreateOrder();
		}
	});
}

const sendBtns = document.querySelectorAll('.send-order-btn');
sendBtns.forEach(btn => {
	btn.addEventListener('click', async (event) => {
		event.stopPropagation();
		buildAndShowDialog(btn, 'sendOrder');
	});
});




document.getElementById('show-addresses-checkbox')?.addEventListener('change', () => { addrFlag.value = toggleAddressDropdown('show-addresses-checkbox', '.new-addr') });


document.getElementById('show-send-address-checkbox')?.addEventListener('change', () => {
	otherAddrFlag.value = toggleAddressDropdown('show-send-address-checkbox', '.new-send-addr');
});

const copyOrderBtns = document.querySelectorAll('.copy-order-btn');

async function copyItem(btn) {
	const orderId = btn.dataset.id;
	try {
		const response = await fetch(`/orders/copy/${orderId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			}
		});
		const result = await response.json();
		if (result.redirect) {
			showToast('success', t('orders.copied_success_label'));
			setTimeout(() => {
				window.location.href = result.redirect;
			}, 500);
		}
	} catch (error) {
		showToast('error', error.message);
	}
}

copyOrderBtns.forEach(btn => {
	btn.addEventListener('click', async (event) => {
		event.stopPropagation();
		buildAndShowDialog(btn, 'copyItem');
	});
});

const textarea = document.getElementById('comment');
const charCount = document.getElementById('charCount');

textarea.addEventListener('input', function () {
	charCount.textContent = `${this.value.length}/250`;
});