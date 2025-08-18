import { showToast } from "./components/toast.js";
import { createInfoDialog } from "./components/htmlManipulator.js";
import { generateExcel, generatePdf } from "./components/generators.js" 

const closeBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');
const deletePositionBtns = document.querySelectorAll('.delete-position-btn');
const deleteOrderBtn = document.getElementById('delete-order-btn');
const confirmationDialog = document.getElementById('delete-dialog');
const statusInfo = document.getElementById('status-info');
const commentBtn = document.getElementById('comment-btn');
const editIcon = document.getElementById('edit-comment-btn');


// DELETE dialog
export async function deleteItem(path) {
  const res = await fetch(path, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`${t('order.error_word')}: ${res.statusText}`);
  const data = await res.json();
  document.getElementById('for-sure').style.display='none';
  statusInfo.innerHTML = t(`${data.message}`) + `. ${t('order.redirecting_word')}`;
  statusInfo.classList.add(data.success ? 'alert-success' : 'alert-danger');
  if (data.success) {
    closeBtn.hidden = confirmBtn.hidden = true;
    setTimeout(() => {
      if (path.includes('position')) location.reload();
      else window.location.href = '/orders';
    }, 2500);
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
    createDuplicateDiag(btn)
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
        id: "cancel-btn",
        action: async () => { } // Pusta akcja - zamknie dialog automatycznie
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

  diag.show();
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
      showToast('success', `${t('orders.item_copied')}`);
      setTimeout(() => {
        window.location.href = result.redirect;
      }, 1500);
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
				action: () => console.log("Anulowano"),
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
			showToast('success',`${t('orders.send_success_label')}`);
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

const sendBtn = document.querySelector('.send-order-btn')
if (sendBtn){
sendBtn.addEventListener('click', async (event) => {
		event.stopPropagation();
		buildAndShowDialog(sendBtn)
	});}
// commentBtn.addEventListener('click', editComment);
// editIcon.addEventListener('click', editComment);

// function editComment() {
//   const commentInput = document.getElementById('comment-input');
//   const acceptBtn    = document.getElementById('accept-comment-btn');
//   const inputValue = commentInput.dataset.value;
//   commentBtn.classList.add('d-none');
//   editIcon.classList.add('d-none');
//   commentInput.classList.remove('d-none');
//   acceptBtn.classList.remove('d-none');

//     if (inputValue) {
//   commentInput.value = commentInput.dataset.value || commentBtn.textContent.trim();
// }
//   commentInput.focus();


//   const save = async e => {
//     if (e.type === 'keydown' && e.key !== 'Enter') return;

//     const newComment = commentInput.value.trim();

//     if (!newComment) return;

//     try {
//       const res = await fetch(`/orders/${orderId}/comment/update`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ comment: newComment })
//       });
//       if (!res.ok) throw new Error(`Status ${res.status}`);
//       commentBtn.textContent = newComment;
//     } catch (err) {
//       console.error('Błąd aktualizacji komentarza:', err);
//     }

//     commentInput.classList.add('d-none');
//     acceptBtn.classList.add('d-none');
//     commentBtn.classList.remove('d-none');
//     editIcon.classList.remove('d-none');

//     commentInput.removeEventListener('keydown', save);
//     acceptBtn.removeEventListener('click', save);
//   };

//   commentInput.addEventListener('keydown', save);
//   acceptBtn.addEventListener('click', save);
// }

const excelBtn = document.getElementById('generate-excel-btn')
excelBtn.addEventListener('click', () => generateExcel())

const printBtn = document.getElementById('print-button')
printBtn.addEventListener('click', () => {
  generatePdf()
});


window.addEventListener('scroll', function () {
  const navbar = document.getElementById('order-nav');
  const scrollTrigger = 150;

  if (window.scrollY > scrollTrigger) {
    navbar.classList.add('navbar-scrolled');
  } else {
    navbar.classList.remove('navbar-scrolled');
  }
});