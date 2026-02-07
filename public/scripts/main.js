import {
	generateForm,
	buildCommentSpace,
	recalculateLastChangedField,
	getTotal
} from "/scripts/form.js";
import {
	resetSelectValues,
	processCommissionInput,
	checkFlags
} from "/scripts/formTools/formTools.js";
import { buildOrderItemStructure } from '/scripts/orderBuilder.js';
import { showToast } from "/scripts/components/toast.js";
import { FormsManager } from './formTools/getAvailableForms.js'
import { createElement } from './components/htmlManipulator.js'
import { createChecboxField, checkBoxReaction, createLastConfigInfoPopUp } from './components/lastGroupSelected.js'
import { validateAllFieldsOnSubmit } from './formTools/validateUtils.js'
import { validate } from './base.js'
import { getLocalPositionObject, checkIfLocalPositionObjectExists } from './formTools/localStorageManager.js'
import { startSpin, stopSpin } from "./components/hourglass.js";


const asortmentGroupSelect = document.getElementById("asortment-group-select");
const departmentSelect = document.getElementById("department-select");
const formContainer = document.getElementById("dynamic-form");
const attachmentContainer = document.getElementById('attachment-container');
const attachmentsLabel = document.querySelector('.attachment-label');
let sentState = false;
let isPreparingForm = false; // Flag to prevent duplicate calls

function initialize() {
	console.log('initialize')
	window.formsManager = new FormsManager();
	setupGlobalListeners();
	loadJsonConfig()
	processCommissionInput(false);
	// setupCommissionButton();
	(async () => {
		if (performance.getEntriesByType("navigation")[0].type === "reload") {
			await refreshFormBehaviour();
		}
	})();
}


async function loadJsonConfig() {
	console.log('loadJsonConfig')
	const departments = await fetchDepartments();
	const { asortmentGroupSelect, departmentSelect } = buildMainSelect(departments);
}

export async function buildMainSelect(files) {
	const inputContainer = document.querySelector(".asortment-inputs");
	createChecboxField(inputContainer);

	// Dodaj przycisk ładowania ostatniej konfiguracji
	const { container, lastConfigButton } = createLastConfigInfoPopUp();
	window.lastConfigButton = lastConfigButton
	lastConfigButton.addEventListener('click', async () => {
		console.log('🎯 Kliknięto przycisk ładowania ostatniej konfiguracji');
		let config = getLocalPositionObject();
		console.log('📦 Pobrana konfiguracja:', config);

		if (!config) {
			container.style.display = 'none';

		}

		await refreshFormBehaviour(config);
		container.style.display = 'none';
	});

	// Sprawdź czy jest zapisana konfiguracja i pokaż/ukryj przycisk
	const hasConfig = checkIfLocalPositionObjectExists();
	if (hasConfig) {
		container.style.display = 'flex';
	} else {
		container.style.display = 'none';
	}

	departmentSelect.innerHTML = `<option value="" disabled selected>${t("form.department_label")}</option>`;
	// console.log('buildMainSelect', files)
	for (let department of files) {
		const groups = await window.formsManager.getGroups(department.num);
		if (groups.length > 0) {
			createElement("option", { value: department.num, text: department.description }, departmentSelect);
		}
	}

	departmentSelect.addEventListener("change", async () => {
		formContainer.innerHTML = "";
		attachmentContainer.innerHTML = '';
		attachmentsLabel.textContent = '';

		const selectedDepartment = departmentSelect.value;
		await buildGroupSelect(selectedDepartment, asortmentGroupSelect);
	});

	return { asortmentGroupSelect, departmentSelect };
}


async function buildGroupSelect(selectedDepartment, asortmentGroupSelect) {
	const groups = await window.formsManager.getGroups(selectedDepartment);

	asortmentGroupSelect.innerHTML = `<option value="" disabled selected>${t("form.group_label")}</option>`;

	for (let group of groups) {

		const option = createElement("option", {
			value: group.code,
			text: group.description
		}, asortmentGroupSelect);

		if (groups.length === 1) {
			option.selected = true;
			await prepareForm(group.code, selectedDepartment);
		}
	}

	// Dodaj listener dla wyboru grupy
	asortmentGroupSelect.addEventListener("change", async () => {
		await prepareForm(asortmentGroupSelect.value, selectedDepartment);
	});

	return asortmentGroupSelect;
}

async function fetchDepartments() {
	console.log('fetchDepartments')
	const departments = await window.formsManager.getAvailableForms();
	return departments;
}

function saveChoiceToLocalStorage() {
	console.log('saveChoiceToLocalStorage')
	const choice = {
		department: departmentSelect.value,
		group: asortmentGroupSelect.value
	};
	localStorage.setItem("lastChoice", JSON.stringify(choice));
}

function setupMainSelectListener(asortmentGroupSelect, departmentSelect) {
	console.log('setupMainSelectListener');
	if (!departmentSelect || !asortmentGroupSelect) return;

	departmentSelect.addEventListener("change", async () => {
		// Clear the dynamic form container when department changes
		formContainer.innerHTML = "";
		const selectedDepartment = departmentSelect.value;
		await buildGroupSelect(selectedDepartment, asortmentGroupSelect);
	});

	asortmentGroupSelect.addEventListener("change", async () => {
		await prepareForm(asortmentGroupSelect.value, departmentSelect.value);
	});
}


async function prepareForm(asortmentGroup, department, config = null) {
	if (isPreparingForm) {
		console.warn("prepareForm is already in progress. Skipping duplicate call.");
		return;
	}

	isPreparingForm = true; // Set the flag

	try {
		window.formsManager.setCurrentRootPath(asortmentGroup);
		window.formsManager.setCurrentGroup(asortmentGroup);
		saveChoiceToLocalStorage();
		const groupNumber = asortmentGroup;
		let version = await getAppVersion(groupNumber);
		showOrderReminder();
		await buildDynamicForm(version, groupNumber, config);
	} catch (err) {
		handleFormLoadError(err);
	} finally {
		isPreparingForm = false; // Reset the flag
	}
}
function showOrderReminder() {
	const hiddenClass = document.querySelector('.order-reminder');
	hiddenClass.style.setProperty('display', 'block', 'important');
}


async function buildDynamicForm(version, groupNumber, config = null) {

	showVersion(version);
	let lastConfigDiv = document.getElementById('last-config-info')
	lastConfigDiv.style.display = 'none'
	let inputs, values, valuesToDisplay;
	if (config && config.values && config.displayValues) {
		console.log('🔄 Ładowanie z konfiguracją:', config);
		[inputs, values, valuesToDisplay] = await generateForm(
			version,
			groupNumber,
			config.values,
			config.displayValues,
			true
		);
		window.finishFlag = true;
	} else {
		[inputs, values, valuesToDisplay] = await generateForm(version, groupNumber);
	}

	const orderId = document.getElementById('orderId').textContent;
	const comment = buildCommentSpace(formContainer);
	setTimeout(() => {
		console.log('siema eniu shortjson')

		setupShowButton(inputs, values, valuesToDisplay, orderId, comment, version, groupNumber);

		setupResetButton(inputs, values, valuesToDisplay);
	}, 10000);
}


function setupShowButton(inputs, values, valuesToDisplay, orderId, comment, version, groupNumber) {
	console.log('setupShowButton')
	console.log('inputs object keys:', Object.keys(inputs));
	// Sprawdź czy są file inputy w obiekcie
	const fileInputsInObject = Object.values(inputs).filter(inp => inp?.type === 'file');
	console.log('File inputs w obiekcie inputs:', fileInputsInObject.length);
	fileInputsInObject.forEach((inp, i) => {
		console.log(`  File input ${i}: name="${inp.name}", id="${inp.id}"`);
	});

	const showButton = document.getElementById('show-button');

	showButton.onclick = async function () {
		setTimeout(async () => {
			showToast('success', `${t('form.saved_form_success')}`);
			if (!await validateForm(inputs, values)) {

				showToast('error', t("form.incorrect_data"));
				return;
			}
			if (!sentState && window.finishFlag == true) {
				recalculateLastChangedField();
				setTimeout(async () => {
					await sendData(inputs, values, valuesToDisplay, orderId, comment, version, groupNumber);
					sentState = true;
				}, 1200);
			}
			else {
				startSpin();
				setTimeout(async () => {
					recalculateLastChangedField();
					setTimeout(async () => {
						await sendData(inputs, values, valuesToDisplay, orderId, comment, version, groupNumber);
						sentState = true;
						stopSpin();
					}, 1200);

				}, 1200);
			}

		}, 500);
	}
}


function setupResetButton(inputs, values, valuesToDisplay) {
	console.log('setupResetButton')
	const resetButton = document.getElementById('reset-button');
	resetButton.onclick = function () {
		showToast('info', t('form.loading_data'));
		resetSelectValues([Object.keys(values), valuesToDisplay], inputs, values, false);
		afterSend = false;
	};
}

/* Walidacja formularza */
export async function validateForm(inputs, values) {
	console.log('validateForm')
	validateAllFieldsOnSubmit(inputs, values)
	const correctFlag = await checkFlags();
	console.log('validateForm correctFlag:', correctFlag)
	if (typeof correctFlag !== 'boolean') {
		highlightInvalidFields(correctFlag);

		return false;
	}
	return true
}

function highlightInvalidFields(flags) {
	console.log('highlightInvalidFields')
	for (let { key } of flags) {
		let elem = document.getElementById(key);
		if (elem) {
			elem.classList.add("invalid-input",)
			elem.classList.add('flash-error');
			setTimeout(() => {
				elem.classList.remove('flash-error');
			}, 2000);
		}
	}
}

/* Wysyłka danych  */
async function sendData(inputs, values, valuesToDisplay, orderId, comment, version, groupNumber) {
	console.log('sendData')
	const commission = document.getElementById('commission-input').value;
	const selectedDepartment = departmentSelect.options[departmentSelect.selectedIndex].text;
	const selectedGroup = asortmentGroupSelect.options[asortmentGroupSelect.selectedIndex].text;
	const total = getTotal(valuesToDisplay);

	const jsonValuesToDisplay = JSON.stringify(Array.from(valuesToDisplay.entries()));

	const postBody = buildOrderItemStructure(
		parseInt(orderId), {}, 0, 0, total.total, total.total_hidden,
		commission, commission, values, jsonValuesToDisplay, 1, comment.value, version, groupNumber, document.documentElement.lang, selectedDepartment, selectedGroup, window.shortJson
	);

	// Utwórz FormData zamiast JSON
	const formData = new FormData();
	formData.append('data', JSON.stringify(postBody));

	// Dodaj wszystkie pliki z input[type=file] - szukaj we CAŁYM dokumencie, nie tylko w formContainer!
	const fileInputs = document.querySelectorAll('input[type="file"]');
	console.log('Found file inputs:', fileInputs.length);
	fileInputs.forEach(fileInput => {
		if (fileInput.files && fileInput.files.length > 0) {
			console.log(`Adding file: ${fileInput.name} =`, fileInput.files[0].name);
			formData.append(fileInput.name, fileInput.files[0]);
		}
	});

	try {
		// Debug: wyświetl FormData zawartość
		console.log('=== WYSYŁANIE FORMDATA ===');
		for (let [key, value] of formData.entries()) {
			if (value instanceof File) {
				console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
			} else {
				console.log(`${key}: ${typeof value === 'string' ? value.substring(0, 100) : value}`);
			}
		}
		console.log('========================');

		const response = await fetch("/position/save", {
			method: "POST",
			body: formData
			// Nie ustawiaj Content-Type, przeglądarka ustawi multipart/form-data
		});
		const result = await response.json();
		console.log('Odpowiedź serwera:', result);

		setTimeout(() => {
			window.location.href = `/orders/order/${orderId}`;
			return result;
		}, 500);
	} catch (error) {
		console.error("Bład przy wysyłaniu", error);
		showToast('error', t("form.error_saving_form"));
	}
}

/* Obsługa błędów ładowania formularza */
function handleFormLoadError(err) {

	console.error("NIE MA PLIKÓW", err);
	document.getElementById("dynamic-form").innerHTML = "";
	const alertBox = document.getElementById("file-error-message");
	alertBox.textContent = t("form.error_loading_form");
	alertBox.classList.remove("d-none");
	setTimeout(() => alertBox.classList.add("d-none"), 6000);
}



/*  Obsługa przycisku zapisu komisji */
// function setupCommissionButton() {
// 	console.log('setupCommissionButton');
// 	let saveCommissionButton = document.getElementById('commision-save-btn');
// 	let commissionForm = document.getElementById('commission-form'); // <-- Twój <form>

// 	saveCommissionButton.addEventListener('click', function (event) {
// 		event.preventDefault(); // ważne!
// 		processCommissionInput(false);
// 		loadJsonConfig();
// 	});

// 	commissionForm.addEventListener('submit', function (event) {
// 		event.preventDefault(); // blokuje domyślne wysłanie formularza
// 		processCommissionInput(false);
// 		loadJsonConfig();
// 	});
// }
function showVersion(version) {
	console.log('showVersion')
	const versionDiv = document.getElementById('version-space')
	versionDiv.innerHTML = `v ${version}`
}

/*Obsługa globalnych zdarzeń UI */
function setupGlobalListeners() {
	console.log('setupGlobalListeners')
	document.addEventListener('click', handleImagePreviewClick);
	document.getElementById("close-dialog-btn").addEventListener('click', function () {
		this.parentElement.close();
	});
	document.getElementById("dialog-close").addEventListener('click', function () {
		document.getElementById('color-dialog').close();
	});
}

async function handleImagePreviewClick(e) {
	console.log('handleImagePreviewClick')
	const checkBox = document.getElementById('last-group-checkbox');
	const checkBoxDiv = document.getElementById('last-group-checkbox');
	checkBoxDiv.addEventListener('click', async () => { console.log('checkbox clicked') });
	let choice = await checkBoxReaction(checkBox)
	if (choice) {
		resumeForm(choice)
	}
	if (e.target.classList.contains('diag-image')) {
		const dialog = document.getElementById('image-preview-dialog');
		const previewImage = document.getElementById('preview-image');
		previewImage.src = e.target.src;
		dialog.showModal();
	}
}

async function resumeForm(choice, config = null) {

	const depSelect = document.getElementById("department-select");
	const asortSelect = document.getElementById("asortment-group-select");

	// Upewnij się, że departments są załadowane
	const departments = await window.formsManager.getAvailableForms();

	// Znajdź department i sprawdź czy istnieje - porównaj jako string
	const department = departments.find(d => String(d.num) === String(choice.department));
	if (!department) {

		showToast('error', 'Nie znaleziono działu');
		return;
	}

	depSelect.value = choice.department;
	await buildGroupSelect(choice.department, asortSelect);
	asortSelect.value = choice.group;
	await prepareForm(choice.group, choice.department, config);
}

async function getAppVersion(groupNumber) {
	console.log('getAppVersion')
	try {
		const response = await fetch(`/position/version/${groupNumber}/`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			}
		});
		const data = await response.json();

		return data.version;
	}
	catch (error) {
		console.error(error);
	}
}

async function refreshFormBehaviour(config = null) {

	const lastCommission = localStorage.getItem('commission');

	processCommissionInput(lastCommission)

	let lastChoice = JSON.parse(localStorage.getItem('lastChoice'))
	console.log('lastChoice z localStorage:', lastChoice)

	if (!lastChoice || !lastChoice.department || !lastChoice.group) {
		console.warn('Brak poprawnej konfiguracji lastChoice w localStorage');
		return;
	}

	setTimeout(async () => {
		console.log(config, 'KONFIGURACJAAA')
		if (config) {
			await resumeForm(lastChoice, config);
		}
		else {
			await resumeForm(lastChoice);
		}
	}, 1500);
}

// Mobile filter controls collapsible functionality
function initMobileFilterControls() {
	// Obserwator dla dodawanych filtrów
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType === 1 && node.classList && node.classList.contains('filter-controls')) {
					setupCollapsibleFilter(node);
				}
			});
		});
	});

	// Obserwuj zmiany w dokumencie
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});

	// Sprawdź istniejące filtry
	document.querySelectorAll('.filter-controls').forEach(setupCollapsibleFilter);
}

function setupCollapsibleFilter(filterElement) {
	if (filterElement.hasAttribute('data-mobile-setup')) return;
	filterElement.setAttribute('data-mobile-setup', 'true');

	// Dodaj header z przyciskiem toggle
	const header = document.createElement('div');
	header.className = 'filter-controls-header';
	header.innerHTML = `
		<span class="filter-controls-title">Filtry</span>
		<span class="filter-controls-toggle">▼</span>
	`;

	// Przenieś zawartość do content
	const content = document.createElement('div');
	content.className = 'filter-controls-content';
	while (filterElement.firstChild) {
		content.appendChild(filterElement.firstChild);
	}

	// Dodaj header i content
	filterElement.appendChild(header);
	filterElement.appendChild(content);

	// Ustaw domyślnie zwinięte
	filterElement.classList.add('collapsed');

	// Obsługa kliknięcia
	header.addEventListener('click', () => {
		if (filterElement.classList.contains('collapsed')) {
			filterElement.classList.remove('collapsed');
			filterElement.classList.add('expanded');
		} else {
			filterElement.classList.remove('expanded');
			filterElement.classList.add('collapsed');
		}
	});
}

// Inicjalizuj po załadowaniu
document.addEventListener('DOMContentLoaded', initMobileFilterControls);

initialize();
