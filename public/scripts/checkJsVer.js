
function checkJsVer() {
    let esVersion = 3;

    
    if ('getOwnPropertyNames' in Object) esVersion = 5;

    
    if (typeof Map !== 'undefined') esVersion = 2015;

    
    if ('includes' in Array.prototype) esVersion = 2016;

    
    if (typeof Proxy !== 'undefined') esVersion = 2017;

    
    if (supportsOptionalChaining()) esVersion = 2020;

    
    if (supportsLogicalAssignment()) esVersion = 2021;

    
    if (typeof [].at !== 'undefined') esVersion = 2022;

    console.log('ES version:', esVersion);
    console.log('UserAgent:', navigator.userAgent);

    return esVersion;
}

function supportsOptionalChaining() {
    try {
        new Function("return {}?.prop === undefined")();
        return true;
    } catch {
        return false;
    }
}

function supportsLogicalAssignment() {
    try {
        new Function("let x; x ||= 1; return true")();
        return true;
    } catch {
        return false;
    }
}


const version = checkJsVer();
let jsWarnContainer = document.getElementById('js-warning-container')
let loginBox = document.querySelector('.login-box');
if (version >= 2020) {
    console.log("✅ ES2020+: Optional chaining supported - nowoczesna przeglądarka");
    if (jsWarnContainer) {
        jsWarnContainer.style.display = 'none';
    }
    if (loginBox) {
        loginBox.style.display = 'block';
    }
} else {
    if (jsWarnContainer) {
        jsWarnContainer.style.display = 'block';
    }
    if (loginBox) {
        loginBox.style.display = 'none';
    }
    let updateBtn = document.getElementById('update-browser-btn');
    updateBtn.href = 'https://browsehappy.com/';
    updateBtn.target = '_blank';

    updateBtn.classList.add('btn', 'btn-light');
    updateBtn.style.marginTop = '1rem';
    jsWarnContainer.querySelector('div').appendChild(updateBtn);

}