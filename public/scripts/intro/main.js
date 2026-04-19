import { getStepsForPage, getDivToChangeIndex, getRedirectionAfterIntro, createOverlayDiv } from './steps.js';

const t = (key) => window.t ? window.t(key) : key;
const INTRO_ACTIVE_CLASS = 'introjs-active-element';

async function markIntroDone() {
    try {
        await fetch('/user/set-intro-done', { method: 'POST', credentials: 'same-origin' });
        window.introNeeded = false;
        localStorage.removeItem('introShouldContinue');
    } catch (e) {
        // silently ignore
    }
}

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
        scrollToElement: pathname !== '/orders/history',
        tooltipPosition: 'auto',
        steps: steps
    });

    intro.start();

    // ─── z-index management on step change ──────────────────────────────
    function elevateAncestors(el) {
        let ancestor = el;
        while (ancestor && ancestor !== document.body) {
            ancestor.classList.add('introjs-ancestor');
            ancestor = ancestor.parentElement;
        }
    }

    function clearAncestors() {
        document.querySelectorAll('.introjs-ancestor').forEach(el => {
            el.classList.remove('introjs-ancestor');
        });
    }

    function handleStepChange(targetElement) {
        // Always clear previous ancestor elevation first
        clearAncestors();

        // Elevate the target element and all its ancestors above the overlay
        if (targetElement) {
            elevateAncestors(targetElement);
        }

        // Page-specific active highlight management
        const { container, elements } = getDivToChangeIndex(pathname);
        if (!container || elements.length === 0) return;

        const currentStepId = targetElement
            ? targetElement.id || (targetElement.classList?.[0] ?? '')
            : '';

        // Nav bar needs elevated z-index when targeting nav items
        if (currentStepId === 'orders-history-nav-btn') {
            const nav = document.querySelector('.desktop-nav');
            if (nav) elevateAncestors(nav);
        }

        // Highlight only the active element (pick visible instance for duplicate IDs)
        for (const id of elements) {
            const candidates = [
                ...document.querySelectorAll(`#${id}`),
                ...document.querySelectorAll(`.${id}`)
            ];
            for (const el of candidates) {
                if (id === currentStepId) {
                    el.classList.add(INTRO_ACTIVE_CLASS);
                } else {
                    el.classList.remove(INTRO_ACTIVE_CLASS);
                }
            }
        }
    }

    function injectNoShowBtn() {
        const existing = document.getElementById('intro-no-show-btn');
        if (existing) existing.remove();
        const skipBtn = document.querySelector('.introjs-skipbutton');
        if (skipBtn) {
            // Wrap skip + no-show in a flex row
            let wrapper = document.getElementById('intro-top-actions');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = 'intro-top-actions';
                wrapper.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;';
                skipBtn.parentNode.insertBefore(wrapper, skipBtn);
            }
            const noShowBtn = document.createElement('button');
            noShowBtn.id = 'intro-no-show-btn';
            noShowBtn.className = 'introjs-button introjs-no-show-btn';
            noShowBtn.textContent = t('intro.dont_show');
            noShowBtn.onclick = async function () {
                await markIntroDone();
                intro.exit();
            };
            wrapper.innerHTML = '';
            wrapper.appendChild(skipBtn);
            wrapper.appendChild(noShowBtn);
        }
    }

    intro.onstart(function () {
        setTimeout(injectNoShowBtn, 0);
    });

    intro.onafterchange(function (targetElement) {
        handleStepChange(targetElement);
        setTimeout(injectNoShowBtn, 0);
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
            // End of tour — mark done in DB
            localStorage.removeItem('introShouldContinue');
            markIntroDone();
        } else if (/^\/orders\/order\/\d+$/.test(pathname)) {
            localStorage.setItem('introShouldContinue', '1');
            getRedirectionAfterIntro(pathname);
        } else if (/^\/orders\/order\/\d+\/new-position/.test(pathname)) {
            localStorage.setItem('introShouldContinue', '1');
            getRedirectionAfterIntro(pathname);
        } else {
            localStorage.removeItem('introShouldContinue');
            markIntroDone();
            getRedirectionAfterIntro(pathname);
        }
    });

    intro.onexit(function () {
        // Clean up z-index changes
        clearAncestors();
        const { container, elements } = getDivToChangeIndex(pathname);
        if (container) {
            container.classList.remove('introjs-showElement');
        }
        for (const id of elements) {
            const candidates = [
                ...document.querySelectorAll(`#${id}`),
                ...document.querySelectorAll(`.${id}`)
            ];
            for (const el of candidates) {
                el.classList.remove(INTRO_ACTIVE_CLASS);
            }
        }
        // Remove custom overlay if present (shouldn't be needed)
        const overlay = document.getElementById('intro-overlay-div');
        if (overlay) overlay.remove();
    });
}

// Expose globally so inline scripts can call before/after DOMContentLoaded
window.startIntroTour = startIntroTour;

function initTour() {
    // Always bind tour buttons via event delegation (buttons may not exist yet)
    document.addEventListener('click', async function (e) {
        const tourBtn = e.target.closest('#intro-tour-btn');
        if (tourBtn) {
            e.preventDefault();
            startIntroTour();
            return;
        }
        const headerTourBtn = e.target.closest('#intro-tour-header-btn');
        if (headerTourBtn) {
            e.preventDefault();
            try {
                await fetch('/user/enable-intro', { method: 'POST', credentials: 'same-origin' });
                window.introNeeded = true;
                localStorage.setItem('introShouldContinue', '1');
            } catch (err) { /* ignore */ }
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            } else {
                startIntroTour();
            }
            return;
        }
    });

    // If redirected from previous step, auto-start tour
    if (localStorage.getItem('introShouldContinue') === '1') {
        startIntroTour();
        return;
    }
    // Auto-start for new users who haven't seen the tour yet
    if (window.introNeeded === true && window.userLoggedIn) {
        startIntroTour();
        return;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTour);
} else {
    initTour();
}
