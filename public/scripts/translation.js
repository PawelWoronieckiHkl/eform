window.translations = {};
window.language = 'pl'
window.t = function(key) {
  return key.split('.').reduce((o, k) => (o || {})[k], window.translations) || key;
};

window.loadTranslations = async function(lang) {
  const res = await fetch(`/translations?lang=${lang}`);
  window.translations = await res.json();
};

window.loadLangs = async function getLanguages() {
        try {
            const response = await fetch('/languages');
            if (!response.ok) {
                throw new Error('Błąd podczas pobierania języka');
            }
            const data = await response.json();
            window.langs = data.body.availableLanguages;

            return data.body.lang;
        } catch (error) {
            console.error('Wystąpił błąd:', error);
            return null;
        }
    }

