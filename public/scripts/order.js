import { showToast } from "./components/toast.js";
import { createInfoDialog, createElement } from "./components/htmlManipulator.js";
import { generateExcel, generatePdf } from "./components/generators.js"
import { createDialog } from "./formTools/dialogUtils_copy.js";


const closeBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');
const deletePositionBtns = document.querySelectorAll('.delete-position-btn');
const deleteOrderBtn = document.getElementById('delete-order-btn');
const confirmationDialog = document.getElementById('delete-dialog');
const statusInfo = document.getElementById('status-info');
const commentBtn = document.getElementById('comment-btn');
const editIcon = document.getElementById('edit-comment-btn');
const unlockBtns = document.querySelectorAll('[id="unlockBtn"]')
const lockBtns = document.querySelectorAll('[id="lockBtn"]')
const sendBtn = document.querySelector('.send-order-btn')
const excelBtns = document.querySelectorAll('[id="generate-excel-btn"]')
const printBtns = document.querySelectorAll('[id="print-button"]')
const shortPrintBtns = document.querySelectorAll('[id="short-print-button"]')
// DELETE dialog
export async function deleteItem(path) {
  const res = await fetch(path, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`${t('order.error_word')}: ${res.statusText}`);
  const data = await res.json();
  document.getElementById('for-sure').style.display = 'none';
  statusInfo.innerHTML = t(`${data.message}`) + `. ${t('order.redirecting_word')}`;
  statusInfo.classList.add(data.success ? 'alert-success' : 'alert-danger');
  if (data.success) {
    closeBtn.hidden = confirmBtn.hidden = true;
    setTimeout(() => {
      if (path.includes('position')) location.reload();
      else window.location.href = '/orders';
    }, 300);
  }
}

export function deleteDiag(btn) {
  btn.addEventListener('click', () => {
    confirmationDialog.showModal();
    closeBtn.onclick = () => confirmationDialog.close();
    confirmBtn.onclick = () => deleteItem(btn.dataset.href);
  });
}

deletePositionBtns.forEach(deleteDiag);
if (deleteOrderBtn) deleteDiag(deleteOrderBtn);

function editBtn() {
  window.location.href = `/edit-position.html?id=${positionId}`;
}


const duplicateBtns = document.querySelectorAll('.duplicate-btn')
duplicateBtns.forEach((btn) => {

  btn.addEventListener('click', async () => {
    // createDuplicateDiag(btn)
    await duplicate(btn)

  })
});


function createDuplicateDiag(btn) {
  const { buttons, diag } = createInfoDialog({
    title: t('position.duplicate_header'),
    message: t('position.duplicate_text'),
    parent: document.body,
    buttons: [
      {
        label: t('order.cancel'),
        className: "btn btn-secondary m-2",
        id: "cancel-btn"
      },
      {
        label: "Ok",
        className: "btn btn-success m-2",
        id: "confirm-btn",
        action: async () => {
          await duplicate(btn)

        }
      }
    ]
  });
  const acceptBtn = buttons[1]
  acceptBtn.focus()

}

async function duplicate(btn) {
  try {
    const id = btn.dataset.id;
    const response = await fetch(`/position/${id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const result = await response.json();

    if (response.ok) {
      // showToast('success', `${t('orders.item_copied')}`);
      setTimeout(() => {
        window.location.href = result.redirect;
      }, 300);
    } else {
      showToast('error', result.error || "Błąd podczas duplikowania");
    }
  } catch (error) {
    showToast('error', error.message || error);
  }
}


function buildAndShowDialog(btn) {
  const parent = document.getElementById('dialog-container');
  const { buttons, dialog } = createInfoDialog({
    title: `${t('orders.send_order')}`,
    message: `${t('orders.are_you_sure')}`,
    buttons: [
      {
        label: `${t('orders.abort')}`,
        className: "btn btn-secondary me-1",
        id: "cancel-btn"
      },
      {
        label: `${t('orders.send_word')}`,
        action: () => sendOrder(btn),
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
      }, 600);

    }
    else {
      showToast('error', result.message);
    }
  }
  catch (error) {
    showToast('error', error);
  }
}

async function unlock(password) {
  try {
    const title = document.getElementById('order-title')
    const checkBoxRes = document.getElementById('checkbox-remember').checked
    const response = await fetch(`/user/auth/check-password`, {
      method: "POST",
      body: JSON.stringify({ password: password.value, remember: checkBoxRes, orderId: title.dataset.id }),
      headers: { "Content-Type": "application/json" }
    });

    const result = await response.json();

    if (result.success) {
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } else {
      const diagInput = document.getElementById('diag-input-container')
      createElement('div', {
        class: ['alert', 'alert-danger', 'mt-3', 'me-4', 'p-2', 'text-center'], role: 'alert', text: 'Hasło nieprawidłowe',

      }, diagInput)
      console.log('HASLO NIEPRAWIDLOWE')
    }
  } catch (error) {
    console.log('error', error.message || error);
  }

}

async function lock() {
  try {
    console.log('lock lock lock')
    const response = await fetch(`/orders/lock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: false })
    });
    const result = await response.json();
    if (result.status == 'success') {
      console.log('lock lock lock', result)
      window.location.reload(response.refresh)
    }
  }
  catch (err) {
    console.warn(err)
    window.location.href = '/'
  }
}

if (sendBtn) {
  sendBtn.addEventListener('click', async (event) => {
    event.stopPropagation();
    buildAndShowDialog(sendBtn)
  });
}

lockBtns.forEach(lockBtn => {
  lockBtn.addEventListener('click', async () => await lock())
})

excelBtns.forEach(btn => {
  btn.addEventListener('click', () => generateExcel())
})

printBtns.forEach(btn => {
  btn.addEventListener('click', () => generatePdf())
})

shortPrintBtns.forEach(btn => {
  btn.addEventListener('click', () => generatePdf(true))
})

window.addEventListener('scroll', function () {
  const navbar = document.getElementById('order-nav');
  const scrollTrigger = 120;

  if (window.scrollY > scrollTrigger) {
    navbar.classList.add('navbar-scrolled');
  } else {
    navbar.classList.remove('navbar-scrolled');
  }
});



unlockBtns.forEach(unlockBtn => {
  unlockBtn.addEventListener('click', function () {
    const parent = document.getElementById('dialog-container');

    const { buttons, diag } = createInfoDialog({
      title: `${t('order.unlock')}`,
      buttons: [
        {
          label: `${t('orders.abort')}`,
          className: "btn btn-secondary me-1",
          id: "cancel-btn"
        },
        {
          enter: true,
          label: `${t('order.unlock')}`,
          action: async () => await unlock(password),
          className: "btn btn-success ms-1",
          id: "confirm-btn"
        }
      ],
      parent,
      input: { name: `${t('login.password_label')}`, id: "password-input", type: 'password' },
      checkbox: { name: `${t('order.remember')}`, id: 'checkbox-remember' }
    });
    const password = document.getElementById('password-input')
  });
});