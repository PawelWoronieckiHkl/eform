import {
	generateForm,
	buildCommentSpace
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
import { createChecboxField, checkBoxReaction } from './components/lastGroupSelected.js'
import { validateAllFieldsOnSubmit } from './formTools/validateUtils.js'
import { validate } from './base.js'


const asortmentGroupSelect = document.getElementById("asortment-group-select");
const departmentSelect = document.getElementById("department-select");

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
	setupMainSelectListener(asortmentGroupSelect, departmentSelect);

}

export function buildMainSelect(files) {
	const inputContainer = document.querySelector(".asortment-inputs");
	createChecboxField(inputContainer);

	departmentSelect.innerHTML = `<option value="" disabled selected>${t("form.department_label")}</option>`;
	// console.log('buildMainSelect', files)
	for (let department of files) {
		createElement("option", { value: department.num, text: department.description }, departmentSelect);
	}

	departmentSelect.addEventListener("change", async () => {
		const selectedDepartment = departmentSelect.value;
		await buildGroupSelect(selectedDepartment, asortmentGroupSelect);

	});

	return { asortmentGroupSelect, departmentSelect };
}


async function buildGroupSelect(selectedDepartment, asortmentGroupSelect) {
	const groups = await formsManager.getGroups(selectedDepartment);

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

	return asortmentGroupSelect;
}

async function fetchDepartments() {
	console.log('fetchDepartments')
	const departments = await formsManager.getAvailableForms();
	return departments;
}

function saveChoiceToLocalStorage(department, group) {
	console.log('saveChoiceToLocalStorage')
	const choice = {
		department: department,
		group: group
	};
	localStorage.setItem("lastChoice", JSON.stringify(choice));
}

function setupMainSelectListener(asortmentGroupSelect, departmentSelect) {
	console.log('setupMainSelectListener')
	asortmentGroupSelect.addEventListener("input", async () => {
		await prepareForm(asortmentGroupSelect.value,
			departmentSelect.value)
	})
};

async function prepareForm(asortmentGroup, department) {

	formsManager.setCurrentRootPath(asortmentGroup);
	formsManager.setCurrentGroup(asortmentGroup);
	saveChoiceToLocalStorage(department, asortmentGroup);
	const groupNumber = asortmentGroup
	let version = await getAppVersion(groupNumber)
	showOrderReminder();
	try {
		await buildDynamicForm(version, groupNumber);
	} catch (err) {
		handleFormLoadError(err);
	}
}
function showOrderReminder() {
	const hiddenClass = document.querySelector('.order-reminder');
	hiddenClass.style.setProperty('display', 'block', 'important');
}


async function buildDynamicForm(version, groupNumber) {
	console.log('buildDynamicForm')

	showVersion(version)
	const formContainer = document.getElementById("dynamic-form");
	const [inputs, values, valuesToDisplay] = await generateForm(version, groupNumber);

	const orderId = document.getElementById('orderId').textContent;
	const comment = buildCommentSpace(formContainer);

	setupShowButton(inputs, values, valuesToDisplay, orderId, comment, version, groupNumber);
	setupResetButton(inputs, values, valuesToDisplay);
}


function setupShowButton(inputs, values, valuesToDisplay, orderId, comment, version, groupNumber) {
	console.log('setupShowButton')
	const showButton = document.getElementById('show-button');

	showButton.onclick = async function () {
		if (!await validateForm(inputs, values)) {
			showToast('error', t("form.incorrect_data"));
			return;
		}
		await sendData(inputs, values, valuesToDisplay, orderId, comment, version, groupNumber);
	};
}


function setupResetButton(inputs, values, valuesToDisplay) {
	console.log('setupResetButton')
	const resetButton = document.getElementById('reset-button');
	resetButton.onclick = function () {
		showToast('info', t('form.loading_data'));
		resetSelectValues([Object.keys(values), valuesToDisplay], inputs, values);
		afterSend = false;
	};
}

/* Walidacja formularza */
export async function validateForm(inputs, values) {
	console.log('validateForm')
	validateAllFieldsOnSubmit(inputs, values)
	const correctFlag = await checkFlags();
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

	const jsonValuesToDisplay = JSON.stringify(Array.from(valuesToDisplay.entries()));
	const postBody = buildOrderItemStructure(
		parseInt(orderId), {}, 0, 0, 0, 0,
		commission, commission, values, jsonValuesToDisplay, 1, comment.value, version, groupNumber, document.documentElement.lang, selectedDepartment, selectedGroup
	);
	const json = JSON.stringify(postBody);

	try {
		const response = await fetch("/position/save", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: json,
		});
		const result = await response.json();
		showToast('success', `${t('form.saved_form_success')}`);
		setTimeout(() => {
			window.location.href = `/orders/order/${orderId}`;
			return result;
		}, 3000);
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

async function resumeForm(choice) {
	const depSelect = document.getElementById("department-select");
	const asortSelect = document.getElementById("asortment-group-select");
	await formsManager.getAvailableForms();
	depSelect.value = choice.department;
	await buildGroupSelect(choice.department, asortSelect);
	asortSelect.value = choice.group;
	await prepareForm(choice.group, choice.department);
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

async function refreshFormBehaviour() {
	const lastCommission = localStorage.getItem('commission');
	processCommissionInput(lastCommission)

	let lastConfig = JSON.parse(localStorage.getItem('lastChoice'))

	await resumeForm(lastConfig);
}


initialize();
