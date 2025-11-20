import {

	processCommissionInput,
	getPossibleValues,
	createInputField,
	saveOrderPositionToJson,
	fillFields
} from './createForm.js';

import {
	resetDependences,
	resetSelectValues,
	resetDisplayEntry,
	buildValuesToDisplay,
	updateFieldInputs,
	updateFieldStates,
	checkRelated,
	resetAllDOM,
	setWar,
	convertIntoPercent,
	setListRow
} from './updateFieldsAndValues.js';

import {
	getProcedures,
	setDefaultValues,
	checkFlags,
	validateFormInput
} from './validateUtils.js';

import {
	createDialog, getInfoFromDialog,

} from './dialogUtils_copy.js';
import { isSource } from '../form.js';

export function logFunctionName(functionName) {
	const sep = '-'.repeat(10)
	console.log(`${sep} ${functionName} ${sep}`)
}

export function findParamFromValues(values, paramDict) {
	const valuesWithParameters = {};

	for (const [paramName, value] of Object.entries(values)) {

		const foundItem = searchForParameter(value, paramDict, paramName)
		if (foundItem) {
			valuesWithParameters[paramName] = foundItem;
		}
	}

	return valuesWithParameters;
}

export function searchForParameter(value, paramDict, paramName) {
	const paramArray = paramDict[paramName] ?? false;
	if (paramArray) {
		let found = paramArray.find(item => {
			let itemVal = typeof item.VALUE === 'string' ? item.VALUE : '';
			itemVal = itemVal.replace(/~\d+$/, '')
			const searchVal = typeof value === 'string' ? value : '';
			return itemVal.toUpperCase() == searchVal.toUpperCase();
		});
		return found
	} else {
		return false;
	}
}

export function searchForParameterByAlias(value, paramDict, paramName) {

	const paramArray = paramDict[paramName] ?? false;

	if (paramArray) {
		return paramArray.find(item => {
			const itemVal = typeof item.ALIAS === 'string' ? item.ALIAS : '';
			const searchVal = typeof value === 'string' ? value : '';
			return itemVal.toUpperCase() === searchVal.toUpperCase();
		});
	} else {
		return false;
	}
}
export function normalizeFilename(filename) {
	if (filename) {
		return filename
			.split('.')[0]                        // usuń rozszerzenie
			.replace(/~\d+$/, '')                 // usuń końcowe _123 jeśli jest
	}
	return '';
}

export function setDescription(values, value, allOptionsByParameter, name, caller = '') {

	if (value === '<NONE>') console.log('NONE VALUE');

	const valObj = searchForParameter(value, allOptionsByParameter, name)
	
	let prodAliasName = ''
	let prodAliasComment = ''

	const description = `${name}___DESCRIPTION`
	if (valObj?.ALIAS_DESCRIPTION || valObj?.ALIAS) {

		prodAliasName = `${name}_ALIAS`
		prodAliasComment = `${name}_ALIAS___DESCRIPTION`
		values[prodAliasName] = valObj.ALIAS
		values[prodAliasComment] = valObj.ALIAS_DESCRIPTION
	}
	if (valObj?.DESCRIPTION) {

		values[description] = valObj.DESCRIPTION
	}
	return values
}

export function fillInputDescription(inputs, params, values, allOptionsByParameter) {

	for (const param of params) {
		if (!param.NAME) continue;

		if (!isSource(param)) {
			values[param.NAME + "___TITLE"] = param.DESCRIPTION;
		} else {
			// Dla parametrów SOURCE meta-pola są już ustawione w processSourceValues
			// Ale można ustawić główny ___TITLE
			values[param.NAME + "___TITLE"] = param.DESCRIPTION;
		}

		if (!window.enabledParams || !window.enabledParams[param.NAME]) {
			continue; // Pomiń wyłączone parametry
		}

	}
}

export function checkIfOptionsExist(allOptionsByParameter, paramName, values) {
	// Dla normalnych parametrów (nie SOURCE) ustaw ___DICT na podstawie obecności opcji
	if (allOptionsByParameter[paramName] && allOptionsByParameter[paramName].length > 0) {
		values[paramName + '___DICT'] = true;
	} else {
		values[paramName + '___DICT'] = false;
	}
	return values;
}

export function roundInputValue(value, step) {

	if (isNaN(value) || value === null || !value) {
		return value; // Nie można zaokrąglić bez prawidłowego kroku
	}


	return parseInt(value);
}

export {
	processCommissionInput,
	getPossibleValues,
	createInputField,
	saveOrderPositionToJson,
	resetDependences,
	resetSelectValues,
	resetDisplayEntry,
	buildValuesToDisplay,
	updateFieldInputs,
	updateFieldStates,
	checkRelated,
	getProcedures,
	setDefaultValues,
	checkFlags,
	setWar,
	validateFormInput,
	createDialog,
	getInfoFromDialog,
	resetAllDOM,
	fillFields,
	convertIntoPercent,
	setListRow
}