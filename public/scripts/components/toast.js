import { logFunctionName } from "../formTools/formTools.js";
toastr.options = {
    "closeButton": true,
    "debug": false,
    "newestOnTop": true,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "2500",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
};

function normalizeToastPosition(position) {
    if (!position) {
        return 'toast-top-right';
    }
    if (position.startsWith('toast-')) {
        return position;
    }
    const map = {
        'top-right': 'toast-top-right',
        'top-left': 'toast-top-left',
        'bottom-right': 'toast-bottom-right',
        'bottom-left': 'toast-bottom-left',
        'top-center': 'toast-top-center',
        'bottom-center': 'toast-bottom-center'
    };
    return map[position] || 'toast-top-right';
}

export function showToast(type, message, timeOut = 1.5, position = 'top-right') {
    logFunctionName('showToast');
    const previousOptions = { ...toastr.options };
    toastr.options.positionClass = normalizeToastPosition(position);
    if (type === 'success') {
        toastr.success(message);
    }
    else if (type === 'error') {
        toastr.options.timeOut = timeOut * 1000; 
        toastr.error(message);
    }
    else if (type === 'info') {
        toastr.info(message);
    }
    else if (type === 'warning') {
        toastr.warning(message);
    }

    toastr.options = previousOptions;

}
export function showToastInContainer(parent, type, message, position = 'toast-top-right') {
    const previousOptions = { ...toastr.options };

    const customToastContainer = document.createElement('div');
    customToastContainer.id = 'custom-toast-container';

    customToastContainer.classList.add('toast-container', normalizeToastPosition(position));
    parent.appendChild(customToastContainer);
    toastr.options.containerId = customToastContainer.id;

    showToast(type, message, 1.5, position);

    toastr.options = previousOptions;
}