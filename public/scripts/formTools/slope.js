import { DataLoader } from "./dataLoader.js";
import {
    getPossibleValues,
    createInputField,
    validateFormInput,
    updateFieldInputs,
    updateFieldStates,
    resetDependences,
    buildValuesToDisplay,
    getInfoFromDialog,
    findParamFromValues,
    setDescription,
    fillFields
} from "./formTools.js";
import { validateAllFieldsOnSubmit, clearDisabledValues } from "./validateUtils.js";

import { showToast } from "../components/toast.js";
import { createElement, isEnabled } from "../components/htmlManipulator.js";





export class SourceWindow {
    constructor(typ, onSaveCallback) {
        this.TYP = typ;
        this.onSaveCallback = onSaveCallback; // callback od generateForm
        this.modal = null;
        this.data = null;
        this.allOptionsByParameter = null;
        this.sourceValues = {};
        this.sourceDisplayValues = {};
    }

    async init(catalog, param) {
        this.catalog = catalog;
        this.param = param;

        await this.loadData(catalog, param);


    }

    async show() {

        const photoFile = this.getPhotoPath(this.catalog);
        this.renderModal(photoFile);
        this.attachEvents();
    }

    async loadData() {

        const slopeLoader = new DataLoader();
        const ver = await this.getLegacySlopeVer()
        await slopeLoader.init(ver, this.param.SOURCE, document.documentElement.lang);
        this.data = await slopeLoader.parseData();

        this.allOptionsByParameter = slopeLoader.convertDictValues(this.data.dictValues);

        this.createObject();
    }
    async getLegacySlopeVer() {

        const response = await fetch(`/position/version/${this.param.NAME}`);
        const data = await response.json();
        return data.version
    }
    getPhotoPath() {
        // Buduje ścieżkę do obrazka według this.TYP
        return `/photos/${this.catalog}/TYP/${this.TYP}.jpg`;
    }

    createObject() {
        for (const [key, value] of Object.entries(this.data.params)) {

            if (value.DESCRIPTION && value.ENABLE !== null) {
                // console.log(value, "SPRAWDZAMOCOCHODZI")
                this.sourceValues[value.NAME] = '';
                // Ustaw podstawowe meta-pola na bezpieczne wartości
                // processSourceValues je potem poprawnie zaktualizuje
                this.sourceValues[value.NAME + '___DICT'] = false;
                this.sourceValues[value.NAME + '___VISIBLE'] = true;
                this.sourceValues[value.NAME + '___TITLE'] = value.DESCRIPTION || value.NAME;
                this.sourceValues[value.NAME + '___DESCRIPTION'] = '';
                this.sourceValues[value.NAME + '_ALIAS'] = '';
                this.sourceValues[value.NAME + '_ALIAS___DESCRIPTION'] = '';
            }
        }
    }

    getObject() {
        return this.sourceValues;
    }

    getParameterVisibility() {
        // Zwraca informacje o widoczności i enabled state parametrów
        const visibility = {};
        if (this.data && this.data.params) {
            this.data.params.forEach(param => {
                if (param.NAME && param.ENABLE !== null) {
                    const isVisible = isEnabled(param.ENABLE, this.sourceValues, 'param');
                    const hasOptions = this.allOptionsByParameter[param.NAME] || false

                    // console.log(param.NAME, isVisible, hasOptions, '----- TUTAJ')
                    visibility[param.NAME] = {
                        visible: isVisible,
                        hasDict: hasOptions,
                        description: param.DESCRIPTION || param.NAME
                    };
                }
            });
        }
        return visibility;
    }

    /**
     * Przetwarza wartości z SOURCE (slope) na strukturę z meta-polami
     * @returns {Object} - Rozszerzony obiekt z meta-polami
     */
    //1
    processSourceValues() {
        if (!this.sourceValues || typeof this.sourceValues !== 'object') {
            return this.sourceValues;
        }

        const processedValues = {};
        const visibility = this.getParameterVisibility();

        // Stwórz mapę parametrów dla szybkiego dostępu do DESCRIPTION
        const paramsMap = {};
        if (Array.isArray(this.data.params)) {
            this.data.params.forEach(param => {
                if (param.NAME) {
                    paramsMap[param.NAME] = param;
                }
            });
        }

        // Zbierz wszystkie parametry - z sourceValues (bez meta-pól) i widoczne z visibility
        const visibleParams = Object.keys(visibility).filter(key => visibility[key] && visibility[key].visible);

        // Dodatkowo filtruj parametry które mają ENABLE == null
        const enabledParams = visibleParams.filter(key => {
            const param = this.data.params.find(p => p.NAME === key);
            return param && param.ENABLE !== null;
        });

        const allParams = new Set([
            ...Object.keys(this.sourceValues).filter(key => {
                // Tylko rzeczywiste parametry (bez meta-pól)
                if (key.includes('___') || key.includes('_ALIAS')) return false;

                // Sprawdź czy parametr ma ENABLE !== null
                const param = this.data.params.find(p => p.NAME === key);
                return param && param.ENABLE !== null;
            }),
            ...enabledParams // Tylko widoczne i enabled parametry z visibility
        ]);

        // Przeprocesuj każdy parametr
        for (const subParamName of allParams) {
            // Sprawdź czy parametr ma ENABLE !== null
            const paramDef = this.data.params.find(p => p.NAME === subParamName);
            if (!paramDef || paramDef.ENABLE === null) {
                continue;
            }

            const subParamValue = this.sourceValues[subParamName];

            // Skopiuj podstawową wartość (lub ustaw pustą jeśli nie ma)
            processedValues[subParamName] = subParamValue || '';

            // Dodaj meta-pola dla tego sub-parametru
            if (subParamValue && subParamValue !== '') {

                const paramOptions = this.allOptionsByParameter?.[subParamName];
                if (paramOptions && Array.isArray(paramOptions)) {

                    const foundOption = paramOptions.find(opt => opt.VALUE === subParamValue);

                    if (foundOption) {
                        // Dodaj alias jeśli istnieje
                        if (foundOption.ALIAS) {
                            processedValues[`${subParamName}_ALIAS`] = foundOption.ALIAS;
                            processedValues[`${subParamName}_ALIAS___DESCRIPTION`] = foundOption.ALIAS_DESCRIPTION || '';
                        } else {
                            processedValues[`${subParamName}_ALIAS`] = '';
                            processedValues[`${subParamName}_ALIAS___DESCRIPTION`] = '';
                        }

                        // Dodaj opis
                        processedValues[`${subParamName}___DESCRIPTION`] = foundOption.DESCRIPTION || '';
                    } else {
                        // Brak w słowniku - ustaw puste meta-pola
                        processedValues[`${subParamName}_ALIAS`] = '';
                        processedValues[`${subParamName}_ALIAS___DESCRIPTION`] = '';
                        processedValues[`${subParamName}___DESCRIPTION`] = '';
                    }
                } else {

                    // Brak słownika - ustaw puste meta-pola
                    processedValues[`${subParamName}_ALIAS`] = '';
                    processedValues[`${subParamName}_ALIAS___DESCRIPTION`] = '';
                    processedValues[`${subParamName}___DESCRIPTION`] = '';
                }

                // Sprawdź czy parametr ma opcje (___DICT) i użyj rzeczywistej widoczności
                const paramVisibility = visibility[subParamName];


                // Jeśli mamy informację o widoczności, użyj jej
                if (paramVisibility) {
                    processedValues[`${subParamName}___DICT`] = paramVisibility.hasDict;
                } else {
                    // Fallback dla przypadków gdy visibility nie jest dostępna
                    const dictValue = !!(paramOptions && paramOptions.length > 0);
                    processedValues[`${subParamName}___DICT`] = dictValue;
                    // console.log(`${subParamName}___DICT set to ${dictValue} (from paramOptions fallback)`);
                }

                // Ustaw ___TITLE z DESCRIPTION parametru jeśli dostępne
                const sourceParam = paramsMap[subParamName];
                processedValues[`${subParamName}___TITLE`] = sourceParam?.DESCRIPTION || subParamName;
                processedValues[`${subParamName}___VISIBLE`] = paramVisibility ? paramVisibility.visible : true;
            } else {
                // Pusta wartość - ustaw puste meta-pola
                processedValues[`${subParamName}_ALIAS`] = '';
                processedValues[`${subParamName}_ALIAS___DESCRIPTION`] = '';
                processedValues[`${subParamName}___DESCRIPTION`] = '';

                // Użyj rzeczywistej widoczności dla ___DICT i ___VISIBLE
                const paramVisibility = visibility[subParamName];

                // Debug dla pustych wartości
                // console.log(`${subParamName} (empty): paramVisibility=${!!paramVisibility}, hasDict=${paramVisibility?.hasDict}`);

                // Dla pustych wartości: jeśli mamy informację o widoczności, użyj jej
                if (paramVisibility) {
                    processedValues[`${subParamName}___DICT`] = paramVisibility.hasDict;
                    // console.log(`${subParamName}___DICT set to ${paramVisibility.hasDict} (from visibility, empty value)`);
                } else {
                    // Fallback dla przypadków gdy visibility nie jest dostępna
                    processedValues[`${subParamName}___DICT`] = false;
                    // console.log(`${subParamName}___DICT set to false (fallback, empty value)`);
                }

                // Ustaw ___TITLE z DESCRIPTION parametru jeśli dostępne  
                const sourceParam = paramsMap[subParamName];
                processedValues[`${subParamName}___TITLE`] = sourceParam?.DESCRIPTION || subParamName;
                processedValues[`${subParamName}___VISIBLE`] = paramVisibility ? paramVisibility.visible : true;
            }

        }

        return processedValues;
    }
    renderModal(photoFile) {

        this.modal = createElement('div', { id: 'slope-modal', class: ['modal', 'show'], style: 'display: block;', tabindex: '-1' }, document.body);


        const dialog = createElement('div', { class: ['modal-dialog'] }, this.modal);
        const content = createElement('div', { class: ['modal-content'] }, dialog);

        // Header
        const header = createElement('div', { class: ['modal-header'] }, content);
        createElement('h3', { text: `${this.param.DESCRIPTION}`, class: ['modal-title'] }, header);

        // Body
        const body = createElement('div', { class: ['modal-body'] }, content);
        createElement('img', {
            src: photoFile,
            alt: 'SLOPE',
            class: ['slope-image'],
            onerror: (e) => {
                // Safely handle image load errors without creating an infinite loop.
                // Some helpers add event listeners that won't be removed by setting onerror=null,
                // so we replace the node with a clone (which doesn't carry JS listeners) and
                // attempt a single PNG fallback. If that also fails, replace with a simple placeholder.
                try {
                    const img = e.target;

                    // If we've already attempted fallback for this element, show placeholder and stop.
                    if (img.dataset._fallbackAttempted) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'img-placeholder img-fluid mb-4 ';
                        placeholder.textContent = 'Brak zdjęcia';
                        img.parentNode.replaceChild(placeholder, img);
                        return;
                    }

                    // Mark that we've tried fallback to avoid repeating.
                    img.dataset._fallbackAttempted = '1';

                    // Create a clone without event listeners and attributes preserved.
                    const clone = img.cloneNode(true);
                    // Ensure the clone has no error listener attached.
                    clone.onerror = null;
                    clone.removeAttribute('onerror');

                    // If PNG fallback fails, replace clone with a placeholder (one-time handler)
                    clone.onerror = () => {
                        // remove handler to prevent any possible loop
                        clone.onerror = null;
                        const placeholder = document.createElement('div');
                        placeholder.className = 'img-placeholder img-fluid mb-4';
                        placeholder.textContent = 'Brak zdjęcia';
                        if (clone.parentNode) clone.parentNode.replaceChild(placeholder, clone);
                    };

                    // Try PNG fallback
                    clone.src = `/photos/${this.catalog}/TYP/${this.TYP}.png`;

                    // Replace original with the clone (preserves layout, removes old listeners)
                    if (img.parentNode) img.parentNode.replaceChild(clone, img);
                } catch (err) {
                    // On any unexpected error, remove handler and don't retry endlessly.
                    try {
                        const target = e && e.target;
                        if (target) {
                            target.onerror = null;
                            target.removeAttribute && target.removeAttribute('onerror');
                        }
                    } catch (ignore) { }
                }
            }
        }, body);

        // Form
        const form = createElement('form', { id: 'slope-form', class: ['slope-form'] }, body);

        // Pola formularza 2 na wiersz - jak w poprzedniej odpowiedzi
        let row;
        // Define values and enabledParams for use in the loop
        const values = {};
        const enabledParams = {};
        this.data.params.forEach((param, idx) => {

            if (idx % 2 === 0) {
                row = createElement('div', { class: ['row', 'mb-3'] }, form);
            }
            if (param.DESCRIPTION) {
                const col = createElement('div', { class: ['col-12', 'col-md-6'] }, row);
                createElement('label', { text: param.DESCRIPTION, for: param.NAME, class: ['form-label'] }, col);
                let input = createElement('input', { class: ['form-control', 'source-input'], type: 'number', id: param.NAME, name: param.NAME, value: param?.VALUE || '' }, col);
                if (param.NAME == 'TYP') {
                    input.type = 'text'
                    input.value = this.TYP;
                    input.disabled = true; // TYP jest stały, nie można go zmienić
                }
                // Only show/hide and enable if col is defined (i.e., param.DESCRIPTION exists)


                if (!isEnabled(param.ENABLE, this.sourceValues, 'param')) {
                    // console.log(param.ENABLE, this.sourceValues)
                    col.style.display = 'none';
                } else {
                    enabledParams[param.NAME] = true;
                    col.style.display = 'grid';
                }
            }

            // Check if we're at the end of a row (every 2 elements or last element)
            if (idx % 2 === 1 || idx === this.data.params.length - 1) {
                // Check if all columns in the current row have display: none
                const cols = row.querySelectorAll('.col-12');
                const allHidden = Array.from(cols).every(col => col.style.display === 'none');

                if (allHidden) {
                    row.style.display = 'none';
                } else {
                    row.style.display = '';
                }
            }
        });

        // Buttons
        const buttonsContainer = createElement('div', { class: ['modal-footer'] }, content);
        this.createButtons(buttonsContainer);
    }

    createButtons(container) {
        // Renderuje przyciski, nie obsługuje logiki submit
        createElement('button', {
            type: 'button',
            class: ['cancel-btn'],
            text: t('order.cancel'),
            onclick: () => this.close()
        }, container);

        createElement('button', {
            id: 'dialog-confim',
            type: 'btn',
            class: ['submit-btn'],
            text: t('order.confirm'),
            onclick: () => this.processForm()
        }, container);
    }

    attachEvents() {
        // Podpina tylko eventy - nie ładuje, nie buduje DOM, nie waliduje!
        const form = document.getElementById('slope-form');
        if (!form) return;
        form.onsubmit = (e) => this.handleSubmit(e, form);
    }



    processForm() {
        let inputs = document.querySelectorAll('.source-input');
        inputs.forEach(input => {

            if (input.id in this.sourceValues) {

                if (!isNaN(input.value) && input.value.trim() !== '') {
                    // console.log(input.value, "SPRAWDZAMOCOCHODZI23")
                    this.sourceValues[input.id] = parseInt(input.value);
                }
                else {
                    this.sourceValues[input.id] = input.value;
                    // console.log(input.value, "SPRAWDZAMOCOCHODZI4")
                }

                // Uzupełnij sourceDisplayValues - każdy element trafia jako klucz-wartość
                if (!!input.value){
                this.sourceDisplayValues[input.id] = input.value;
                }
            }

        });

        // Wywołanie callbacka z aktualnymi danymi, jeśli został podany
        if (typeof this.onSaveCallback === 'function') {
            this.onSaveCallback(this.sourceValues);
        }

        this.close();
    }


    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        if (this.backdrop) {
            this.backdrop.remove();
            this.backdrop = null;
        }
    }
    setTyp(typ) {
        this.TYP = typ;
        this.sourceValues['TYP'] = typ
    }
    // Możesz dodać metodę validate(values) jeśli chcesz wydzielić walidację!
}

