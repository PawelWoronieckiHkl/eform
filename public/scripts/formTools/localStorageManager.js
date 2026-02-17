export function fillLocalPositionObject(values = false, displayValues = false) {
    
    const formData = {};
    if (values) {
        formData.values = values;
    }
    else {
        formData.values = {}
    }
    
    if (displayValues) {
        formData.displayValues = Array.from(displayValues.entries());
    }
    else {
        formData.displayValues = []
    }

    localStorage.setItem('formData', JSON.stringify(formData));
    let x = localStorage.getItem('formData');
   
}

export function checkIfLocalPositionObjectExists() {
    let x = localStorage.getItem('formData');
    if (x) {
        return true;
    } else {
        return false;
    }
}
export function getLocalPositionObject(inputs) {
    let x = localStorage.getItem('formData');
    if (x) {
        const formData = JSON.parse(x);
        if (!formData.displayValues || formData.displayValues.length === 0) {
            console.warn('displayValues jest puste, zwracam null');
            return null;
        }

        formData.displayValues = new Map(formData.displayValues);
        return formData;
    } else {

        return null;

    }
}