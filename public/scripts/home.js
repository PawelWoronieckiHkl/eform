 document.getElementById('accept-rodo-btn').addEventListener('click', async () => {
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