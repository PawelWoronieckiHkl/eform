
import { getStepsForPage, getDivToChangeIndex, getRedirectionAfterIntro, createOverlayDiv } from './steps.js';

function startIntroTour(pathname = window.location.pathname) {
    const steps = getStepsForPage(pathname);

    if (steps.length === 0) {
        console.log('No intro steps defined for this page:', pathname);
        return;
    }

    let intro = introJs.tour();
    intro.setOptions({
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
        exitOnEsc: true,
        nextLabel: 'Next →',
        prevLabel: '← Back',
        skipLabel: 'Skip',
        doneLabel: 'Done!',
        scrollToElement: true,
        tooltipPosition: 'auto',
        steps: steps
    });

    intro.start();

    
    const storageKey = `introStep_${pathname.replace(/\//g, '_')}`;
    let stepCounter = parseInt(localStorage.getItem(storageKey)) || 0;
    let listenersAdded = false;

    
    function saveStep() {
        localStorage.setItem(storageKey, stepCounter.toString());
    }

    
    function addButtonListeners() {
        if (listenersAdded) return;

        setTimeout(() => {
            const nextBtn = document.querySelector('.introjs-nextbutton');
            const backBtn = document.querySelector('.introjs-prevbutton');

            if (nextBtn && !nextBtn.hasAttribute('data-listener-added')) {
                nextBtn.addEventListener('click', function () {
                    stepCounter++;
                    saveStep();
                    console.log("NEXT - Krok:", stepCounter);

                    
                    if (pathname === '/' && stepCounter === 4) {
                        window.location.href = "/orders";
                    }
                });
                nextBtn.setAttribute('data-listener-added', 'true');
            }

            if (backBtn && !backBtn.hasAttribute('data-listener-added')) {
                backBtn.addEventListener('click', function () {
                    stepCounter--;
                    saveStep();
                    console.log("BACK - Krok:", stepCounter);
                });
                backBtn.setAttribute('data-listener-added', 'true');
            }

            listenersAdded = true;
        }, 100);
    }

    
    function logCurrentStep(targetElement) {
        const { container, elements, extra } = getDivToChangeIndex(window.location.pathname);

        const currentStepId = targetElement ? targetElement.id || (targetElement?.classList?.value?.split(' ')[0] ?? '') : '';

        listenersAdded = false;
        addButtonListeners();

        if (container && elements.length > 0) {
            if ('orders-history-nav-btn' === currentStepId) {
                console.log("Zmieniam z-index dla historii zamówień");
                document.querySelector('.desktop-nav').style.zIndex = '199';
            }

            if (elements.includes(currentStepId)) {
                container.style.zIndex = '199';
                container.classList.add('introjs-showElement')
                document.querySelector(`#${currentStepId}`).classList.add('active');
            } else {
                if (container?.classList?.contains('introjs-showElement')) {
                    container.classList.remove('introjs-showElement')
                    container.style.zIndex = '100';
                }
            }
            for (let id of elements) {

                if (id === currentStepId) {
                    console.log("Active element:", id == currentStepId);
                    console.log("Active element:", id, currentStepId);
                    console.log(document.querySelector(`#${id}`))
                    document.querySelector(`#${id}`)?.classList.add('active');
                }
                else {
                    document.querySelector(`#${id}`)?.classList.remove('active');
                }

            }
        }
    }

    intro.onafterchange(function (targetElement) {
        logCurrentStep(targetElement);
    });

    intro.oncomplete(function () {
        if (pathname === '/orders/add-order') {
            const { container } = getDivToChangeIndex(pathname);
            if (container) {
                createOverlayDiv();
                console.log(document.getElementById('intro-overlay-div'));
                container.style.zIndex = '200';
            }
        }
        else {
            getRedirectionAfterIntro(pathname);
        }
    });

    addButtonListeners();
}

function turnOffIntroTour() {

}


document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        startIntroTour();
    }, 1000);
});