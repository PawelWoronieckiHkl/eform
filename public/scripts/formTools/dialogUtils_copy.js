import {
  logFunctionName,
  buildValuesToDisplay,
  resetDependences,
  updateFieldInputs,
  updateFieldStates,
} from './formTools.js';
import {
  showToast,
  showToastInContainer
} from '../components/index.js';
import { createElement } from '../components/htmlManipulator.js'
export class DialogManager {
  constructor() {
    this.isMultiChoice = false; // Nowa flaga
    this.isLink;
    this.isInfo;
    this.selectedValues = [];
    this.currentSort = 'favorites';
    this.dialog = document.getElementById('color-dialog');
    this.dialogContainer = document.getElementById('dialog-container');
    this.listContainer = document.getElementById('dynamic-options-list');
    this.dialogTitle = document.getElementById('dialog-title');
    this.confirmButton = document.getElementById('dialog-confirm');
    this.closeButton = document.getElementById('dialog-close');
    this.extraInfo = document.getElementById('additional-info');
    this.options = [];
    this.param = null;
    this.groupNumber = null;
    this.activeFilters = {};


    if (this.confirmButton) {
      this.confirmButton.addEventListener('click', () => this.handleConfirm());
    }

    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.handleCancel());
    }
  }


  async initialize(param, options, groupNumber, filters, attrs) {
    logFunctionName('DialogManager.initialize');
    this.param = param;
    this.options = options;
    this.groupNumber = groupNumber;
    this.filters = filters
    this.attrValues = attrs
    this.isMultiChoice = param?.MULTI == 'true' ?? false;
    // do zmiany oficjalnie
    this.isLink = param?.LINK == 'true' ?? false;
    // do zmiany oficjalnie
    this.isInfo = param?.INFO == 'true' ?? false;

    this.selectedValues = [];
    this.confirmButton.style.display = this.isMultiChoice ? 'inline-block' : 'none';
    if (this.dialogTitle) {

      this.dialogTitle.textContent = param.DESCRIPTION;
    }

    // Pobranie mapy obrazów
    const imageMap = await this.fetchImageMap(param, options, groupNumber);

    // Przygotowanie interfejsu
    this.setupUI();

    if (this.attrValues && this.attrValues != undefined && Object.keys(this.attrValues).length > 0) {
      this.getUniqueCategories()
    }    // Renderowanie opcji
    await this.renderOptions(imageMap);

    // Pokazanie dialogu
    this.dialog.showModal();
  }

  // Pobranie mapy obrazów z serwera
  async fetchImageMap(param, options, groupNumber) {
    const response = await fetch('/position/check-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        options: options,
        groupNumber: groupNumber,
        folderName: param.NAME
      })
    });

    return await response.json();
  }

  // Przygotowanie interfejsu użytkownika
  setupUI() {
    // Czyszczenie listy opcji
    if (this.listContainer) {
      this.listContainer.innerHTML = '';
    }

    // Usunięcie wcześniejszych elementów UI, jeśli istnieją
    this.removeExistingUIElements();

    // Dodanie pola wyszukiwania i filtrów przed listą opcji
    this.addSearchAndFilters();

    this.setupExtraInfo('Istnieją normy dotyczące ChildSafety',
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1");

  }


  setupExtraInfo(text, link) {
    // Ensure we have a container reference; if missing, create and attach it inside dialog
    let container = this.extraInfo;
    if (!container) {
      container = document.createElement('div');
      container.id = 'additional-info';
      // place it near the top of dialog (after title if present)
      if (this.dialogTitle && this.dialogTitle.parentElement) {
        this.dialogTitle.parentElement.insertBefore(container, this.dialogTitle.nextSibling);
      } else if (this.dialogContainer) {
        this.dialogContainer.insertBefore(container, this.dialogContainer.firstChild);
      } else {
        document.body.appendChild(container);
      }
      this.extraInfo = container;
    }

    // Reset container
    container.className = 'additional-info mb-2 dialog-extra-info';
    container.innerHTML = '';

    // If neither info nor link is enabled, hide the container
    if (!this.isInfo && !this.isLink) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    // Create two clearly separated inner blocks (if present) with small titles
    if (this.isInfo && text) {
      const infoBlock = createElement('div', { class: ['extra-block', 'extra-info-block'] }, container);
      createElement('div', { class: ['extra-title'], text: 'UWAGA' }, infoBlock);
      createElement('div', { class: ['extra-content'], text: text, style: { wordBreak: 'break-word' } }, infoBlock);
    }

    if (this.isLink && link) {
      const linkBlock = createElement('div', { class: ['extra-block', 'extra-link-block'] }, container);
      createElement('div', { class: ['extra-title'], text: 'LINK DO INSTRUKCJI' }, linkBlock);
      const linkContent = createElement('div', { class: ['extra-content'] }, linkBlock);
      // anchor via createElement so attributes are set through helper
      createElement('a', { href: link, target: '_blank', rel: 'noopener noreferrer', text: link, style: { wordBreak: 'break-word' } }, linkContent);
    }
  }

  // Usunięcie wcześniejszych elementów UI
  removeExistingUIElements() {
    // Usunięcie wcześniejszego pola wyszukiwania
    const existingSearch = this.dialogContainer.querySelector('.search-container');
    if (existingSearch) existingSearch.remove();

    // Usunięcie wcześniejszych kontrolek filtrowania
    const existingFilters = this.dialogContainer.querySelector('.filter-controls');
    if (existingFilters) existingFilters.remove();
  }

  // Dodanie pola wyszukiwania i filtrów
  addSearchAndFilters() {
    // Tworzenie kontenera dla wyszukiwania i filtrów
    const controlsContainer = document.createElement('div');
    controlsContainer.classList.add('dialog-controls');

    // Dodanie pola wyszukiwania
    const searchContainer = this.createSearchField();
    controlsContainer.appendChild(searchContainer);


    // Dodanie kontrolek filtrowania
    const filterControls = this.createFilterControls();
    if (filterControls) {
      controlsContainer.appendChild(filterControls);
    }
    const sortingContainer = this.createSortingControls(this.handleSortChange.bind(this), this.currentSort || 'favorites');
    controlsContainer.appendChild(sortingContainer);
    // Wstawienie kontrolek przed listą opcji
    if (this.dialogContainer && this.listContainer) {
      this.dialogContainer.insertBefore(controlsContainer, this.listContainer);
    }
  }

  createSortingControls(onSortChange, currentSort = 'favorites') {
    const options = [
      { value: 'favorites', label: `${t('form.favorites_first')}` },
      { value: 'az', label: 'A-Z' },
      { value: 'za', label: 'Z-A' }
    ];

    const sortingContainer = createElement('div', {
      class: ['sorting-controls', 'mb-2'],

    });

    // Label - TYLKO TEKST, bez zdarzeń!
    // createElement('label', {
    //   for: 'sortOptions',
    //   class: ['sorting-label'],
    //   text: 'Sortuj: '
    // }, sortingContainer);

    // Select - TU JEST MIEJSCE NA ZDARZENIE
    const select = createElement('select', {
      id: 'sortOptions',
      class: ['form-select', 'sorting-select'],
      onchange: (e) => {
        const selectedValue = e.target.value;
        if (typeof onSortChange === 'function') {
          onSortChange(selectedValue); // Wywołaj przekazaną funkcję
        }
      }
    }, sortingContainer);

    // Opcje z domyślnie wybraną wartością
    for (const [idx, opt] of options.entries()) {
      createElement('option', {
        value: opt.value,
        text: opt.label,

      }, select);
    }

    return sortingContainer;
  }


  handleSortChange(sortMethod) {
    this.currentSort = sortMethod;
    this.applySorting(sortMethod);
  }
  createSearchField() {
    const searchContainer = document.createElement('div');
    searchContainer.classList.add('search-container', 'mb-2');

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = t('form.search_input_placeholder');
    searchInput.classList.add('search-input', 'form-control');
    searchInput.addEventListener('input', () => this.handleSearch(searchInput));

    searchContainer.appendChild(searchInput);

    this.searchInput = searchInput;
    return searchContainer;
  }

  // Tworzenie kontrolek filtrowania
  createFilterControls() {
    const existingControls = this.dialogContainer.querySelector('.dialog-controls');
    const filterControls = createElement('div', {
      class: ['filter-controls', 'mb-2'],
      style: { border: '1px solid gray' },
      existingControls
    });

    const isFilters = Object.keys(this.filters).length > 0;
    if (!isFilters) {
      filterControls.classList.add('d-none')
    }

    for (const [filterName, filterValues] of Object.entries(this.filters)) {
      const filterGroup = createElement('div', { class: ['filter-group', 'me-3'] }, filterControls);


      createElement('label', {
        class: ['filter-label'],
        text: this.formatFilterName(filterName) + ': '
      }, filterGroup);

      // Dropdown Bootstrap
      const dropdown = createElement('div', { class: ['dropdown', 'd-inline-block'] }, filterGroup);

      const dropdownToggle = createElement('button', {
        class: ['btn', 'btn-outline-secondary', 'dropdown-toggle'],
        type: 'button',
        id: `${filterName}-dropdown`,
        'data-bs-toggle': 'dropdown',
        'aria-expanded': 'false',
        text: `${t("form.check_word")} ${this.formatFilterName(filterName)}`
      }, dropdown);

      const dropdownMenu = createElement('ul', {
        class: ['dropdown-menu', 'p-2', 'dropdown-scroll'],
        'aria-labelledby': `${filterName}-dropdown`,
        style: { maxHeight: '320px', overflowY: 'auto' }
      }, dropdown);

      // "Wszystkie"
      const allLi = createElement('li', {}, dropdownMenu);
      const allCheckbox = createElement('input', {
        type: 'checkbox',
        class: ['dropdown-option', 'form-check-input', 'me-2'],
        value: '',
        id: `${filterName}-all`
      }, allLi);
      createElement('label', {
        class: ['form-check-label'],
        text: t("form.all_word"),
        for: `${filterName}-all`
      }, allLi);

      // Pozostałe opcje (posortowane)
      const sortedValues = Array.isArray(filterValues)
        ? Array.from(filterValues).sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))
        : [];

      sortedValues.forEach(value => {
        const li = createElement('li', {}, dropdownMenu);
        const checkbox = createElement('input', {
          type: 'checkbox',
          class: ['dropdown-option', 'form-check-input', 'me-2'],
          value: value,
          id: `${filterName}-${value}`
        }, li);
        createElement('label', {
          class: ['form-check-label'],
          text: value,
          for: `${filterName}-${value}`
        }, li);
      });


      // Obsługa zmian (delegacja zdarzeń)
      dropdownMenu.addEventListener('change', (e) => this.handleFilter(e, filterName));
    }
    const clearFiltersBtn = createElement('button', {
      class: ['btn', 'btn-outline-secondary', 'clear-filters-btn'],
      type: 'button',
      id: `clear-filters-btn`,
      'aria-expanded': 'false',
      text: `${t("form.reset_filters")}`,
      style: { float: 'right', backgroundColor: '#fff', color: '#000' }
    }, filterControls);

    // Clear all filters: uncheck specific checkboxes, check the "-all" ones,
    // reset activeFilters object and refresh visible options.
    clearFiltersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // reset checkbox states inside filterControls
      const checkboxes = filterControls.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        if (cb.id && cb.id.endsWith('-all')) {
          cb.checked = true;
        } else {
          cb.checked = false;
        }
      });

      // reset active filters state
      this.activeFilters = {};

      // refresh displayed options (keep current search term)
      const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase() : '';
      this.filterAndDisplayOptions(searchTerm, this.activeFilters);
    });

    return filterControls;
  }

  // Formatowanie nazwy filtra (pierwsza litera duża, reszta małe)
  formatFilterName(name) {
    return name
  }

  // Pobieranie dostępnych filtrów z opcji
  getAvailableFilters() {

    return this.filters
  }

  // Pobranie unikalnych kategorii z opcji
  getUniqueCategories() {
    const attrVals = this.attrValues.ATTR_VALUE
    const attrDesc = this.attrValues.ATTR_DESCRIPTION
    const categories = new Set();
    this.options.forEach(option => {

      const foundEntry = attrVals.find(entry => Object.keys(entry)[0] === option.VALUE);
      if (foundEntry) {
        const value = foundEntry[option.VALUE];
        option.ATTR_VALUE = value
      }
      const foundDesc = attrDesc.find(entry => Object.keys(entry)[0] === option.VALUE);
      if (foundDesc) {
        const value = foundDesc[option.VALUE];
        option.ATTR_DESC = value
      }
    });
    return Array.from(categories);
  }

  // Renderowanie opcji
  async renderOptions(imageMap) {
    if (!this.listContainer) return;

    this.listContainer.innerHTML = '';
    this.listContainer.classList.add('options-grid');

    const favs = await this.fetchFavorites(tempGroupNumber);

    const favoriteOptions = [];
    const otherOptions = [];
    const safeFavs = Array.isArray(favs) ? favs : [];

    for (const option of this.options) {
      if (safeFavs.includes(option.VALUE)) {
        favoriteOptions.push(option);
      } else {
        otherOptions.push(option);
      }
    }
    this.counter = document.getElementById('object-count');

    this.counter.textContent = this.options.length;

    for (const option of favoriteOptions) {
      const optionElement = this.createOptionElement(option, imageMap, true);
      this.listContainer.appendChild(optionElement);
    }

    for (const option of otherOptions) {
      const optionElement = this.createOptionElement(option, imageMap, false);
      this.listContainer.appendChild(optionElement);
    }


    if (this.currentSort) {
      this.applySorting(this.currentSort);
    }
  }

  // Tworzenie elementu opcji
  createOptionElement(option, imageMap, isFav) {
    const colorBox = document.createElement('div');
    colorBox.classList.add('image-box');
    colorBox.id = option.VALUE;
    colorBox.dataset.paramName = this.param.NAME;
    colorBox.dataset.paramDescription = option.DESCRIPTION;
    if (this.isMultiChoice) {
      colorBox.classList.add('multi-selectable'); // Nowa klasa dla stylizacji
    }
    // Dodanie wszystkich właściwości opcji jako atrybuty data-*
    for (const [key, value] of Object.entries(option)) {
      // Pomijamy standardowe pola
      if (['VALUE', 'DESCRIPTION', 'ROW_NUM'].includes(key)) continue;

      // Dodaj właściwość jako atrybut data-*
      if (value) {
        colorBox.dataset[key.toLowerCase()] = value;
      }
    }
    if (option.ATTRIBUTES) {
      try {


        for (const [attrKey, attrValue] of Object.entries(option.ATTRIBUTES)) {
          const sanitizedKey = attrKey.replace(/ /g, '-').toLowerCase();
          colorBox.setAttribute(`data-${sanitizedKey}`, attrValue);
        }
      }
      catch (err) { 'blad' }
    }
    // Dodanie obsługi kliknięcia
    colorBox.addEventListener('click', () => this.handleOptionClick(colorBox));

    // Dodanie obrazu jeśli istnieje
    const filename = imageMap[option.VALUE];

    if (filename) {
      const imageWrapper = this.createImageWrapper(option, filename);
      colorBox.appendChild(imageWrapper);
    }

    // Dodanie nazwy i opisu
    const colorName = document.createElement('p');
    colorName.classList.add('image-name');
    if (option?.ALIAS) {
      colorName.innerHTML = `${option.ALIAS}<br>${option.ALIAS_DESCRIPTION}`;
    }
    else {
      colorName.innerHTML = `${option.VALUE}<br>${option.DESCRIPTION}`;
    }

    colorName.dataset.id = `${option.ROW_NUM}-${this.param.NAME}`;
    colorName.dataset.value = option.VALUE;


    createElement('img', {
      class: ['icon', 'heart-icon'],
      src: isFav ? '/img/heart-on.png' : '/img/heart-off.png',
      alt: 'Podgląd',
      loading: 'lazy',
      onclick: async (e) => {
        e.stopPropagation();
        await this.favouriteBehavior(e.currentTarget, option);
      }
    }, colorBox);

    // stock status indicator based on option.ATTR_VALUE (ZERO, SAFE, LOW)
    // create a small colored dot on the option box (no text)
    if (option?.ATTR_VALUE) {
      try {
        const raw = String(option?.ATTR_VALUE || '');
        const match = raw.match(/ZERO|SAFE|LOW/i);
        const status = match ? match[0].toUpperCase() : null;
        if (status) {
          const map = {
            ZERO: { class: 'stock-zero' },
            SAFE: { class: 'stock-safe' },
            LOW: { class: 'stock-low' }
          };
          const info = map[status] || { class: 'stock-unknown' };

          // create a tiny dot badge and append it to the option box (color via CSS)
          if (status == "ZERO") {
            colorBox.classList.add("unavailable")
          }
          if (option?.ATTR_DESC) {
            let circleElem = createElement('span', {
              class: ['stock-badge', info.class, 'has-tooltip'],
              'aria-hidden': 'true'
            }, colorBox);
            circleElem.dataset.tooltip = option.ATTR_DESC
          }

          else {
            let circleElem = createElement('span', {
              class: ['stock-badge', info.class],
              'aria-hidden': 'true'
            }, colorBox);
          }
        }
      } catch (err) {
        console.error('Error creating stock badge', err);
      }
    }


    if (isFav) { colorBox.classList.add('favorite'); }

    colorBox.appendChild(colorName);

    return colorBox;
  }


  async fetchFavorites(groupNumber) {
    try {
      const response = await fetch(`/position/favs/${groupNumber}`, {
        method: 'GET',
        credentials: 'include', // jeśli korzystasz z sesji/cookies
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Błąd pobierania ulubionych: ${response.status}`);
      }

      const data = await response.json();
      // data.success === true, data.favorites - tablica ulubionych
      return data.favorites;
    } catch (error) {
      console.error('Błąd pobierania ulubionych:', error);
      return [];
    }
  }

  // Przykład użycia:
  applySorting(sortMethod) {

    const container = this.listContainer;
    if (!container) return;

    // Pobierz elementy (np. divy .image-box)
    const items = Array.from(container.querySelectorAll('.image-box'));

    // Sortuj według wybranej metody
    items.sort((a, b) => {
      switch (sortMethod) {
        case 'az':
          return a.querySelector('.image-name').textContent.localeCompare(
            b.querySelector('.image-name').textContent
          );
        case 'za':
          return b.querySelector('.image-name').textContent.localeCompare(
            a.querySelector('.image-name').textContent
          );
        case 'favorites':
          // Załóżmy, że ulubione mają klasę 'favorite'
          const aFav = a.classList.contains('favorite') ? 1 : 0;
          const bFav = b.classList.contains('favorite') ? 1 : 0;
          return bFav - aFav;
        default:
          return 0; // brak sortowania
      }
    });

    // Wyczyść kontener i dodaj posortowane elementy
    container.innerHTML = '';
    items.forEach(item => container.appendChild(item));
  }


  // favouriteBehavior wywoływana przy kliknięciu serduszka
  async favouriteBehavior(element, option) {
    try {
      const productValue = option.VALUE;
      const groupNumber = tempGroupNumber;

      const response = await fetch('/position/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productValue, groupNumber })
      });

      if (response.ok) {
        const result = await response.json();
        element.src = result.isFavorite
          ? '/img/heart-on.png'
          : '/img/heart-off.png';
        const parent = element.parentElement;
        if (parent) {
          parent.classList.toggle('favorite', result.isFavorite);
        }
      } else {
        // Obsługa błędu serwera
        console.error('Błąd serwera:', response.status);
      }
    } catch (error) {
      console.error('Błąd połączenia:', error);
      // Możesz dodać fallback do localStorage, jeśli chcesz
    }
  }

  // Tworzenie wrappera dla obrazu
  createImageWrapper(option, filename) {

    let normalizedValue = option.VALUE

    // console.log(normalizedValue, 'normalizedValue')
    const imageSrc = `/photos/${this.groupNumber}/${this.param.NAME}/${filename}`;
    const colorImage = document.createElement('img');
    colorImage.classList.add('diag-image');
    colorImage.src = imageSrc;
    colorImage.alt = option.DESCRIPTION;
    colorImage.loading = 'lazy';

    const previewOverlay = document.createElement('img');
    previewOverlay.classList.add('preview-box');
    previewOverlay.src = '/img/window.png';
    previewOverlay.alt = 'Podgląd';
    previewOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handlePreviewClick(imageSrc);
    });

    const imageWrapper = document.createElement('div');
    imageWrapper.classList.add('image-wrapper');
    imageWrapper.appendChild(colorImage);
    imageWrapper.appendChild(previewOverlay);

    return imageWrapper;
  }

  // Obsługa kliknięcia opcji
  handleOptionClick(clickedElement) {

    if (this.isMultiChoice) {
      // TRYB WIELOKROTNEGO WYBORU
      // 1. Toggle zaznaczenia
      clickedElement.classList.toggle('active');

      // 2. Pobranie wartości
      const value = clickedElement.querySelector('.image-name').dataset.value;

      // 3. Aktualizacja listy wybranych wartości
      const index = this.selectedValues.indexOf(value);
      if (index === -1) {
        this.selectedValues.push(value);
      } else {
        this.selectedValues.splice(index, 1);
      }

    }
    else {
      document.querySelectorAll('.image-box').forEach(e => e.classList.remove('active'));
      clickedElement.classList.add('active');
      this.handleConfirm()
      document.getElementById('dialog-confirm').click();
    }

  }



  // Obsługa kliknięcia podglądu
  handlePreviewClick(imageSrc) {
    const previewDialog = document.getElementById('image-preview-dialog');
    const previewImage = document.getElementById('preview-image');
    previewImage.src = imageSrc;
    previewDialog.showModal();
  }

  // Obsługa wyszukiwania
  handleSearch(searchInput) {
    const searchTerm = searchInput.value.toLowerCase();
    this.filterAndDisplayOptions(searchTerm, this.activeFilters);

  }

  // Obsługa filtrowania
  handleFilter(event, filterName) {
    const dropdownMenu = event.currentTarget;
    const escapedFilterName = CSS.escape(filterName); // ESCAPUJEMY!
    const allCheckbox = dropdownMenu.querySelector(`#${escapedFilterName}-all`);
    const otherCheckboxes = Array.from(
      dropdownMenu.querySelectorAll(`input[type="checkbox"]:not([id="${escapedFilterName}-all"])`)
    );
    if (event.target.id === `${filterName}-all`) {
      if (event.target.checked) {
        otherCheckboxes.forEach(cb => { cb.checked = false; });
        this.activeFilters[filterName] = [];
      }
    } else {
      if (allCheckbox.checked) {
        allCheckbox.checked = false;
      }
      const checked = otherCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
      if (checked.length > 0) {
        this.activeFilters[filterName] = checked;
      } else {
        delete this.activeFilters[filterName];
      }
    }

    const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase() : '';
    this.filterAndDisplayOptions(searchTerm, this.activeFilters);
  }


  filterAndDisplayOptions(searchTerm, filters) {
    if (!this.listContainer) return;
    let numberOfOptions = 0;
    const optionElements = this.listContainer.querySelectorAll('.image-box');

    // Upewnij się, że searchTerm to string i zamień na małe litery
    const normalizedSearchTerm = (searchTerm || '').toLowerCase();

    optionElements.forEach(element => {
      const name = element.querySelector('.image-name').textContent.toLowerCase();
      const matchesSearch = !normalizedSearchTerm || name.includes(normalizedSearchTerm);
      // Pobierz pełne dane opcji z this.options
      const option = this.options.find(
        o => o.VALUE === element.querySelector('.image-name').dataset.value
      );

      let matchesFilters = true;

      // Sprawdź każdy aktywny filtr
      for (const [filterName, selectedValues] of Object.entries(filters)) {
        // Pobierz wartość atrybutu z obiektu ATTRIBUTES
        const attributeValue = option.ATTRIBUTES?.[filterName];

        // Jeśli filtr jest aktywny i wartość nie pasuje do żadnej z wybranych
        if (selectedValues.length > 0 &&
          (!attributeValue || !selectedValues.includes(attributeValue))) {
          matchesFilters = false;
          break;
        }
      }

      element.style.display = (matchesSearch && matchesFilters) ? 'block' : 'none';
      if (element.style.display == "block") { numberOfOptions++ }
    });
    this.counter.textContent = numberOfOptions
  }

  handleConfirm() {



    const selectedData = this.getSelectedValue();

    if (!selectedData) {
      showToastInContainer(this.dialog, 'warning', t('form.empty_select_warning'));
      return;
    }

    // Wywołanie funkcji obsługi z zewnętrznego modułu
    if (typeof window.dialogConfirmHandler === 'function') {

      window.dialogConfirmHandler(selectedData);

    } else {

      // Domyślna obsługa, jeśli handler nie jest zdefiniowany
      const values = window.formValues || {};
      const inputs = window.formInputs || {};
      updateFormWithSelectedValue(values, inputs, selectedData, this.options);
    }
    this.dialog.close();
  }

  // Obsługa przycisku anulowania
  handleCancel() {
    this.removeExistingUIElements()
    this.dialog.close();
  }

  removeExistingUIElements() {
    const existingControls = this.dialogContainer.querySelector('.dialog-controls');
    if (existingControls) existingControls.remove();
  }

  getSelectedValue() {
    const activeBoxes = document.querySelectorAll('.image-box.active');
    if (activeBoxes.length === 0) return [];

    return Array.from(activeBoxes).map(activeBox => ({
      value: activeBox.querySelector('.image-name').dataset.value,
      paramName: activeBox.dataset.paramName,
      paramDescription: activeBox.dataset.paramDescription
    }));
  }



}

// Funkcja pomocnicza do aktualizacji formularza
function updateFormWithSelectedValue(values, inputs, selectedData, options) {

  let valuesString = false;
  let { value, paramName, paramDescription } = selectedData;
  if (selectedData.length > 1) {
    ({ value, paramName, paramDescription } = selectedData[0]);
    valuesString = selectedData.map(obj => obj.value).join('|');
    value = valuesString
  }

  const currentInput = inputs[paramName];
  if (currentInput && currentInput.tagName === "BUTTON") {
    const currentOption = options[paramName].find(v => v.VALUE === value)
    if (currentOption?.ALIAS) {
      currentInput.innerText = `${currentOption.ALIAS} - ${currentOption.ALIAS_DESCRIPTION}`;
    }

    else if (currentOption?.VALUE == "<NONE>") {
      currentInput.innerText = paramDescription
    }
    else {
      currentInput.innerText = `${value} - ${paramDescription}`;
      if (valuesString) {
        currentInput.innerText = `${valuesString}`;
      }
      else {
        currentInput.innerText = `${value} - ${paramDescription}`;
      }
    }

    currentInput.value = value;
  }

  return [value, paramName];
}

const dialogManager = new DialogManager();

// Funkcja do tworzenia dialogu - wywoływana z createInputField
export async function createDialog(param, options, grNr, filters, attrs) {
  logFunctionName('createDialog');

  await dialogManager.initialize(param, options, grNr, filters, attrs);

  // Przechwyć aktualne options w closure
  window.dialogConfirmHandler = (selectedData) => {
    const values = window.formValues || {};
    const inputs = window.formInputs || {};

  };
}


export function getInfoFromDialog(values, inputs, options, selectedData = null) {
  logFunctionName('getInfoFromDialog');

  // Jeśli nie przekazano selectedData, pobierz wszystkie aktywne elementy
  if (!selectedData) {
    const activeBoxes = document.querySelectorAll('.image-box.active');

    // Jeśli nie ma żadnych zaznaczonych elementów, zakończ
    if (activeBoxes.length === 0) return;

    // Pobierz dane dla wszystkich zaznaczonych elementów
    const selectedItems = Array.from(activeBoxes).map(box => ({
      value: box.querySelector('.image-name').dataset.value,
      paramName: box.dataset.paramName,
      paramDescription: box.dataset.paramDescription
    }));

    // Ustaw selectedData w zależności od liczby elementów:
    // - Dla 1 elementu: pojedynczy obiekt
    // - Dla wielu elementów: tablica obiektów
    selectedData = selectedItems.length === 1 ? selectedItems[0] : selectedItems;
  }

  const result = updateFormWithSelectedValue(
    values,
    inputs,
    selectedData,
    options,
    'siema'
  );

  document.getElementById("color-dialog").close();
  return result;
}
