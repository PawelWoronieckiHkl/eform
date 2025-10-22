const rodoBtn = document.getElementById('accept-rodo-btn');

if (rodoBtn) {
  rodoBtn.addEventListener('click', async () => {
    try {
      const resp = await fetch('/user/accept-rodo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true })
      });

      if (resp.ok) {
        document.getElementById('rodo-modal').style.display = 'none';
        window.location.reload();
      } else {
        alert('{{ __("base.error_when_accepting") }}');
      }
    } catch (e) {
      alert('{{ __("base.error_when_accepting") }}');
      console.error(e);
    }
  });
}

const ordersToggle = document.getElementById('orders-toggle');
console.log(ordersToggle.checked, 'sprawdzam skrypt');
const ordersSection = document.getElementById('last-orders-section');

// Handle checkbox change
ordersToggle.addEventListener('change', function () {
  if (this.checked) {
    ordersSection.classList.remove('d-none');
    localStorage.setItem('show-orders', 'true');
  } else {
    ordersSection.classList.add('d-none');
    localStorage.setItem('show-orders', 'false');
  }
});
