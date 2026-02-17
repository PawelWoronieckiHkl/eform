document.querySelectorAll('input[type="number"]').forEach(function(input) {
  input.addEventListener('keydown', function(e) {
    
    if (
      [46, 8, 9, 27, 13, 110, 190].includes(e.keyCode) ||
      
      ((e.keyCode == 65 || e.keyCode == 67 || e.keyCode == 86 || e.keyCode == 88 || e.keyCode == 90) && (e.ctrlKey || e.metaKey)) ||
      
      (e.keyCode >= 35 && e.keyCode <= 40)
    ) {
      return;
    }
    
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  });
});

document.querySelectorAll('input[type="number"]').forEach(function(input) {
  input.addEventListener('input', function(e) {
    this.value = this.value.replace(/[^0-9]/g, '');
  });
});