document.querySelectorAll('input[type="number"]').forEach(function(input) {
  input.addEventListener('keydown', function(e) {
    // Pozwól na: backspace, delete, tab, escape, enter, kropka, strzałki, home, end
    if (
      [46, 8, 9, 27, 13, 110, 190].includes(e.keyCode) ||
      // Pozwól na Ctrl/cmd+A/C/V/X/Z
      ((e.keyCode == 65 || e.keyCode == 67 || e.keyCode == 86 || e.keyCode == 88 || e.keyCode == 90) && (e.ctrlKey || e.metaKey)) ||
      // Pozwól na strzałki, home, end
      (e.keyCode >= 35 && e.keyCode <= 40)
    ) {
      return;
    }
    // Zablokuj wszystko poza cyframi
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