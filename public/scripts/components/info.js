import { createElement } from "./htmlManipulator.js";
import { showToast } from "./toast.js";

export function createInfoIcon({
    info,
    parent,
    rootFilePath = "/photos/files/",
    defaultLabel = "Dodatkowe informacje",
    infoStyle = 'i',
    downloadLabel = "Pobierz",
} = {}) {
    const hasInfo = info && info !== "<NULL>" && `${info}`.trim() !== "";
    console.log('Creating info icon with info:', info);
    if (!hasInfo || !parent) {
        return null;
    }

    const rawInfo = `${info}`;
    const bracketMatch = rawInfo.match(/<([^>]+\.[^>]+)>/);
    const extractedFilePath = bracketMatch ? bracketMatch[1].trim() : null;

    const cleanInfoText = rawInfo.replace(/<[^>]+>/g, "").trim();
    console.log('Clean info text:', cleanInfoText);
    let infoIcon;
    const iconLabel = cleanInfoText || defaultLabel;
    if (infoStyle == 'i') {
        infoIcon = createElement("span", {
            class: ["param-info-icon"],
            text: "i",
            tabindex: "0",
            "aria-label": iconLabel
        }, parent);
    } else if (infoStyle == 'btn-cupon') {
        infoIcon = createElement("span", {
            class: ["param-info-icon", "param-info-cupon"],
            text: cleanInfoText,
            tabindex: "0",
            "aria-label": iconLabel
        }, parent);
    }

    const tooltip = createElement("div", {
        class: ["param-info-tooltip"],
        role: "tooltip"
    }, infoIcon);

    if (cleanInfoText) {
        const normalizedInfoText = cleanInfoText.replace(/\\n/g, "\n").replace(/\n/g, "<br>");
        createElement("div", {
            class: ["param-info-tooltip-text"],
            html: normalizedInfoText
        }, tooltip);
    }

    if (extractedFilePath) {
        const normalizedFilePath = extractedFilePath.replace(/^\/+/, "");
        const encodedFilePath = normalizedFilePath.split("/").map(segment => encodeURIComponent(segment)).join("/");
        const fileUrl = `${rootFilePath}${encodedFilePath}`;
        const fileName = normalizedFilePath.split("/").pop() || "plik";

        createElement("button", {
            class: ["param-info-download-btn"],
            type: "button",
            html: `<span class="download-icon" aria-hidden="true">⬇</span><span>${fileName}</span>`,
            "aria-label": `${downloadLabel} ${fileName}`,
            onclick: async function (event) {
                event.preventDefault();
                event.stopPropagation();
                try {
                    const response = await fetch(fileUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const anchor = createElement("a", {
                        href: blobUrl,
                        download: fileName
                    });
                    document.body.appendChild(anchor);
                    anchor.click();
                    document.body.removeChild(anchor);
                    URL.revokeObjectURL(blobUrl);
                } catch (error) {
                    showToast("error", `Nie udało się pobrać pliku: ${fileName}`);
                }
            }
        }, tooltip);
    }

    return infoIcon;
}