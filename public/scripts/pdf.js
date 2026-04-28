function eksportujDoExcel() {
    var tabela = document.getElementById('tabela');
    var wb = XLSX.utils.table_to_book(tabela, { sheet: 'Arkusz1' });
    XLSX.writeFile(wb, 'tabela.xlsx');
}
