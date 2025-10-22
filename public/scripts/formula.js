
const parser = new window.formulaParser.Parser();
let error_count = 0;
let success_count = 0;

parser.setVariable("MIN", "MIN");
parser.setVariable("MAX", "MAX");
parser.setVariable("DOM", "DOM");

function inList(params) {
    // console.log('inList', params)
    if (!params || params.length < 2) return false;

    let what = (params[0] || "").toString().toLowerCase();
    let list = (params[1] || "").toString().toLowerCase();

    what = "," + what + ",";
    list = "," + list + ",";
    return list.includes(what);
}


function inList2(params) {
    if (!params || params.length < 4) return false;
    let what1 = (params[0] || "").toString().toLowerCase();
    let list1 = (params[1] || "").toString().toLowerCase();
    let what2 = (params[2] || "").toString().toLowerCase();
    let list2 = (params[3] || "").toString().toLowerCase();

    what1 = "," + what1 + ",";
    list1 = "," + list1 + ",";
    what2 = "," + what2 + ",";
    list2 = "," + list2 + ",";

    return list1.includes(what1) && list2.includes(what2);
}

function inList3(params) {
    if (!params || params.length < 6) return false;

    let what1 = (params[0] || "").toString().toLowerCase();
    let list1 = (params[1] || "").toString().toLowerCase();
    let what2 = (params[2] || "").toString().toLowerCase();
    let list2 = (params[3] || "").toString().toLowerCase();
    let what3 = (params[4] || "").toString().toLowerCase();
    let list3 = (params[5] || "").toString().toLowerCase();

    what1 = "," + what1 + ",";
    list1 = "," + list1 + ",";
    what2 = "," + what2 + ",";
    list2 = "," + list2 + ",";
    what3 = "," + what3 + ",";
    list3 = "," + list3 + ",";

    return list1.includes(what1) && list2.includes(what2) && list3.includes(what3);
}


// function contains(params) {
//     if (!params || params.length < 2) return false;
//     let what = (params[0] || "").toString();
//     let list = (params[1] || "").toString();
//     if (list.includes(',')) {
//         console.log(list)
//         let arr = list.split(",");
//         for (let i = 0; i < arr.length; i++) {
//             let fragment = arr[i].trim();
//             if (fragment && what.indexOf(fragment) !== -1) {
//                 return true;
//             }
//         }
//         return false;
//     }
//     else{
//         console.log('lista',list)
//         return list.includes(what);
//     }
// }

function contains(params) {

    // console.log('contains', params)
    if (!params || params.length < 2) return false;
    let what = (params[0] || "").toString();
    let list = (params[1] || "").toString();
    let arr = list.split(",");
    for (let i = 0; i < arr.length; i++) {
        let fragment = arr[i].trim();
        if (fragment && what.indexOf(fragment) !== -1) {
            return true;
        }
    }
    return false;
}

parser.setFunction("WSROD", function (params) {
    // console.log(params)
    return inList(params);
});

parser.setFunction("HASLO", function (params) {
    window.paramPassword = 'tak mam password'
    // Do cofnięcia
    // console.log('HASLO',params)
    if (params.length > 0) {
        return false;
    }
    return true;
});

parser.setFunction("NIEWSROD", function (params) {
    return !inList(params);
});
parser.setFunction("WSROD2", function (params) {
    return inList2(params);
});
parser.setFunction("NIEWSROD2", function (params) {
    return !inList2(params);
});
parser.setFunction("WSROD3", function (params) {
    return inList3(params);
});
parser.setFunction("NIEWSROD3", function (params) {
    return !inList3(params);
});
parser.setFunction("WSRODNIEWSROD", function (params) {
    if (!params || params.length < 4) return false;

    let what1 = (params[0] || "").toString().toLowerCase();
    let list1 = (params[1] || "").toString().toLowerCase();
    let what2 = (params[2] || "").toString().toLowerCase();
    let list2 = (params[3] || "").toString().toLowerCase();

    what1 = "," + what1 + ",";
    list1 = "," + list1 + ",";
    what2 = "," + what2 + ",";
    list2 = "," + list2 + ",";

    return list1.includes(what1) && !list2.includes(what2);
});

parser.setFunction("ZAWIERA", function (params) {
    return contains(params);
});
parser.setFunction("AND", function (params) {
    if (!params || params.length === 0) return false;
    return params.every(value => !!value);
});

parser.setFunction("ORAZ", function (params) {
    if (!params || params.length === 0) return false;
    return params.every(value => !!value);
});

parser.setFunction("USTAW", function (params) {
    if (window.ignoreDom && params[1] == 'DOM') { return true }
    if (!params || params.length < 2) return false;

    if (!window.inputsValidators) window.inputsValidators = {};
    if (!window.inputsDefaults) window.inputsDefaults = {};

    if (!window.inputsValidators[window.actualParam]) {
        window.inputsValidators[window.actualParam] = {};
    }
    if (!window.inputsValidators[window.actualParam][window.actualValue]) {
        window.inputsValidators[window.actualParam][window.actualValue] = {};
    }
    if (!window.inputsDefaults[window.actualParam]) {
        window.inputsDefaults[window.actualParam] = {};
    }
    if (!window.inputsDefaults[window.actualParam][window.actualValue]) {
        window.inputsDefaults[window.actualParam][window.actualValue] = {};
    }

    const field = String(params[0]).toUpperCase();
    const parameter = String(params[1]).toUpperCase();


    let value = params.length >= 3 ? String(params[2]) : undefined;
    if (parameter == 'DOM' && value == '') { return true }

    const validatorModel = window.inputsValidators[window.actualParam][window.actualValue];
    const defaultsModel = window.inputsDefaults[window.actualParam][window.actualValue];

    const currentValue = parser.getVariable(field) || window.formulaContext[field];

    if (!validatorModel[field]) {
        validatorModel[field] = {};
    }
    if (!defaultsModel[field]) {
        defaultsModel[field] = {};
    }
    if (parameter == 'WAR') {
        if (value == '<NONE>') { delete window.constValues[field]; return false };
        // console.log('wartosci', value)
        window.constValues[field] = value;

        return true;
    }
    if (value === undefined || value === '-') {
        if (parameter === "DOM") {
            value = String(value)
            delete defaultsModel[field][parameter];
            delete window.formulaContext[field];
            parser.setVariable(field, undefined);
        } else if (parameter === "MIN" || parameter === "MAX") {
            delete validatorModel[field][parameter];
        }
        if (Object.keys(validatorModel[field]).length === 0) {
            delete validatorModel[field];
        }
        if (Object.keys(defaultsModel[field]).length === 0) {
            delete defaultsModel[field];
        }
        return true;
    }

    let result = false;
    switch (parameter) {
        case "MIN":
            validatorModel[field][parameter] = value;
            result = currentValue ? Number(currentValue) >= Number(value) : true;
            break;
        case "MAX":
            validatorModel[field][parameter] = value;
            result = currentValue ? Number(currentValue) <= Number(value) : true;
            break;
        case "DOM":
            value = String(value)
            defaultsModel[field][parameter] = value;
            parser.setVariable(field, value.toString());
            window.formulaContext[field] = value;
            result = true;
            break;
        default:
            result = false;
    }

    if (Object.keys(validatorModel[field]).length === 0) {
        delete validatorModel[field];
    }
    if (Object.keys(defaultsModel[field]).length === 0) {
        delete defaultsModel[field];
    }

    return result;
});

parser.setFunction("LEFT", function (params) {
    if (typeof params[0] === "string" && typeof params[1] === "number") {
        return params[0].substring(0, params[1]);
    }
    return null;
});

parser.setFunction("RIGHT", function (params) {
    if (typeof params[0] === "string" && typeof params[1] === "number") {
        return params[0].slice(-params[1]);
    }
    return null;
});

parser.setFunction("CEILING", function (params) {
    if (typeof params[0] === "number" && typeof params[1] === "number") {
        return Math.ceil(params[0] / params[1]) * params[1];
    }
    return null;
});

function evaluateFormula(expression, context, type, param = null) {

    if (!expression || expression === "<NULL>") {
        return true;
    }
    let upperCaseContext = {};
    if (!context) {
        context = {};
    }

    // Funkcja do spłaszczania zagnieżdżonych obiektów
    function flattenObject(obj, prefix = '') {
        let result = {};
        for (let key in obj) {
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                // Dla WYMIAROWANIE_SLOPOW - wyciągnij wartości bezpośrednio
                if (key === 'WYMIAROWANIE_SLOPOW') {
                    for (let subKey in obj[key]) {
                        if (subKey !== 'TYP') { // Pomiń TYP
                            result[subKey] = obj[key][subKey];
                        }
                    }
                } else {
                    // Rekurencyjnie spłaszcz inne zagnieżdżone obiekty
                    Object.assign(result, flattenObject(obj[key], prefix + key + '.'));
                }
            } else {
                result[prefix + key] = obj[key];
            }
        }
        return result;
    }

    // Spłaszcz kontekst przed konwersją na uppercase
    const flatContext = flattenObject(context);

    for (let key in flatContext) {
        if (flatContext.hasOwnProperty(key)) {
            let value = flatContext[key];

            if (typeof value === "string") {
                upperCaseContext[key] = value.toUpperCase();
            } else {
                upperCaseContext[key] = value;
            }
            if (upperCaseContext[key] == ''){
                upperCaseContext[key] = 0;
            }
        }
    }

    window.formulaContext = context;

    for (let key in upperCaseContext) {
        if (upperCaseContext.hasOwnProperty(key)) {
            parser.setVariable(key, upperCaseContext[key]);
        }
    }

    expression = expression.replace(/^=/, '');
    expression = expression.toUpperCase();

    if (type == 'PROCEDURE') {
        window.inputsDefaults = {}
    }
    window.paramPassword = ''

    // if (expression.includes('CENA_UZNANIOWA')
    // || expression.includes('CENA_SUMA')) {
    // console.log('formula context', context)
    // }

    let result = parser.parse(expression);
    if (expression.includes(`WSROD(ARTALU25,"UT")`)) {
        console.log('ARTALU', expression, parser.variables.ARTALU25
            , context.ARTALU25, result)
    }


    if (param && expression.includes('HASLO')) {

        if (result.result == true) {

            window.lockedParams.push(param)
        }
        else {
            if (param && !window.skipCountParams.includes(param)) {
                window.skipCountParams.push(param);}

            return false
        }
    }
    if (expression && expression.includes('WYMIAROWANIE')) {

    }
    if (result.result == "0") {
        result.result = false;
    }
    if (result.error) {
        error_count++;

        // console.warn(context, result.error, error_count, expression)
        return false;
    }
    else if (type === 'formula' || type === 'PROCEDURE') {

        return result.result;
    }
    else {
        success_count++;
        return result.result;
    }
}

window.FormulaHandler = { evaluateFormula }
