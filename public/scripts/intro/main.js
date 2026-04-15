import { getStepsForPage, getDivToChangeIndex, getRedirectionAfterIntro, createOverlayDiv } from './steps.js';

const t = (key) => window.t ? window.t(key) : key;

function startIntroTour(pathname = window.location.pathname) {
    const steps = getStepsForPage(pathname);

    if (steps.length === 0) {
        return;
    }

    const intro = introJs.tour();
    intro.setOptions({
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
        exitOnEsc: true,
        nextLabel: t('intro.next'),
        prevLabel: t('intro.prev'),
        skipLabel: t('intro.skip'),
        doneLabel: t('intro.done'),
        scrollToElement: true,
        tooltipPosition: 'auto',
        steps: steps
    });

    intro.start();

    // ─── z-index management on step change ──────────────────────────────
    function handleStepChange(targetElement) {
        const { container, elements } = getDivToChangeIndex(pathname);
        const currentStepId = targetElement
            ? targetElement.id || (targetElement.classList?.[0] ?? '')
            : '';

        if (!container || elements.length === 0) return;

        // Nav bar needs elevated z-index when targeting nav items
        if (currentStepId === 'orders-history-nav-btn') {
            const nav = document.querySelector('.desktop-nav');
            if (nav) nav.style.zIndex = '199';
        }



        if (elements.includes(currentStepId)) {
            container.style.zIndex = '199';
            container.classList.add('introjs-showElement');
        } else if (container.classList.contains('introjs-showElement')) {
            container.classList.remove('introjs-showElement');
            container.style.zIndex = '';
        }

        // Highlight only the active element
        for (const id of elements) {
            const el = document.getElementById(id) || document.querySelector(`.${id}`);
            if (!el) continue;
            if (id === currentStepId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    }

    intro.onafterchange(function (targetElement) {
        handleStepChange(targetElement);
    });

    intro.oncomplete(function () {
        // Multi-page tour: set flag for next step, clear on last
        if (pathname === '/') {
            localStorage.setItem('introShouldContinue', '1');
            getRedirectionAfterIntro(pathname);
        } else if (pathname === '/orders/add-order') {
            localStorage.setItem('introShouldContinue', '1');
            getRedirectionAfterIntro(pathname);
        } else if (pathname === '/orders') {
            localStorage.setItem('introShouldContinue', '1');
            getRedirectionAfterIntro(pathname);
        } else if (pathname === '/orders/history') {
            // End of tour
            localStorage.removeItem('introShouldContinue');
        } else {
            localStorage.removeItem('introShouldContinue');
            getRedirectionAfterIntro(pathname);
        }
    });

    intro.onexit(function () {
        // Clean up z-index changes
        const { container, elements } = getDivToChangeIndex(pathname);
        if (container) {
            container.classList.remove('introjs-showElement');
            container.style.zIndex = '';
        }
        for (const id of elements) {
            const el = document.getElementById(id) || document.querySelector(`.${id}`);
            if (el) el.classList.remove('active');
        }
        // Remove custom overlay if present (shouldn't be needed)
        const overlay = document.getElementById('intro-overlay-div');
        if (overlay) overlay.remove();
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // If redirected from previous step, auto-start tour
    if (localStorage.getItem('introShouldContinue') === '1') {
        startIntroTour();
        return;
    }
    const tourBtn = document.getElementById('intro-tour-btn');
    if (tourBtn) {
        tourBtn.addEventListener('click', function (e) {
            e.preventDefault();
            startIntroTour();
        });
    }
});