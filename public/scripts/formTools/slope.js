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
            if (value.DESCRIPTION) {
                this.sourceValues[value.NAME] = '';
            }
        }

    }

    getObject() {
        return this.sourceValues;
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
            class: ['img-fluid', 'mb-4'],
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
                        placeholder.className = 'img-placeholder img-fluid mb-4';
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
                    console.log(param.ENABLE, this.sourceValues)
                    col.style.display = 'none';
                } else {
                    enabledParams[param.NAME] = true;
                    col.style.display = 'grid';
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
            text: 'Anuluj',
            onclick: () => this.close()
        }, container);

        createElement('button', {
            id: 'dialog-confim',
            type: 'btn',
            class: ['submit-btn'],
            text: 'Akceptuj',
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
                if (parseInt(input.value != NaN)) {
                    this.sourceValues[input.id] = parseInt(input.value);
                }
                else {
                    this.sourceValues[input.id] = input.value;
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

