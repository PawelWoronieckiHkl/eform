import { createElement } from "./htmlManipulator.js";

const PROMPT_ID = "confirm-prompt-dialog";

/**
 * Shows a confirm prompt dialog. Returns a Promise<boolean>.
 *
 * @param {Object} options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Message body (supports HTML via `html` flag)
 * @param {boolean} [options.html=false] - If true, message is rendered as innerHTML
 * @param {string} [options.confirmLabel="OK"] - Confirm button text
 * @param {string} [options.cancelLabel="Anuluj"] - Cancel button text
 * @param {string} [options.confirmClass="btn btn-success"] - Confirm button CSS classes
 * @param {string} [options.cancelClass="btn btn-outline-secondary"] - Cancel button CSS classes
 * @param {string} [options.icon] - Optional icon class (e.g. "bi bi-exclamation-triangle")
 * @returns {Promise<boolean>} true if confirmed, false if cancelled
 *
 * @example
 * const ok = await confirmPrompt({
 *   title: "Usunąć zamówienie?",
 *   message: "Ta operacja jest nieodwracalna.",
 *   confirmLabel: "Usuń",
 *   confirmClass: "btn btn-danger"
 * });
 * if (ok) { ... }
 */
export function confirmPrompt({
    title = "",
    message = "",
    html = false,
    confirmLabel = "OK",
    cancelLabel = "Anuluj",
    confirmClass = "btn btn-success",
    cancelClass = "btn btn-outline-secondary",
    icon = ""
} = {}) {
    return new Promise((resolve) => {
        const existing = document.getElementById(PROMPT_ID);
        if (existing) {
            existing.remove();
        }

        const dialog = createElement("dialog", {
            id: PROMPT_ID,
            class: ["confirm-prompt", "rounded-3", "border-0", "p-0"]
        }, document.body);

        const container = createElement("div", {
            class: ["confirm-prompt__body", "p-4", "d-flex", "flex-column", "gap-3"]
        }, dialog);

        if (icon) {
            createElement("i", {
                class: [...icon.split(" "), "confirm-prompt__icon", "text-center"],
                'aria-hidden': "true"
            }, container);
        }

        if (title) {
            createElement("h5", {
                text: title,
                class: ["confirm-prompt__title", "text-center", "mb-0"]
            }, container);
        }

        if (message) {
            const msgAttrs = {
                class: ["confirm-prompt__message", "text-center", "mb-0"]
            };
            msgAttrs[html ? "html" : "text"] = message;
            createElement("p", msgAttrs, container);
        }

        const actions = createElement("div", {
            class: ["confirm-prompt__actions", "d-flex", "justify-content-center", "gap-2", "pt-2"]
        }, container);

        function close(result) {
            dialog.close();
            dialog.remove();
            resolve(result);
        }

        createElement("button", {
            type: "button",
            text: cancelLabel,
            class: cancelClass.split(" ").filter(Boolean),
            onclick: () => close(false)
        }, actions);

        createElement("button", {
            type: "button",
            text: confirmLabel,
            class: confirmClass.split(" ").filter(Boolean),
            onclick: () => close(true)
        }, actions);

        dialog.addEventListener("close", () => {
            if (dialog.isConnected) {
                dialog.remove();
                resolve(false);
            }
        });

        dialog.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                close(false);
            }
        });

        if (typeof dialog.showModal === "function") {
            dialog.showModal();
        } else {
            dialog.setAttribute("open", "");
        }
    });
}
