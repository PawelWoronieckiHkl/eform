window.translations = {};
window.language = 'pl'
window.t = function (key) {
  return key.split('.').reduce((o, k) => (o || {})[k], window.translations) || key;
};

window.loadTranslations = async function (lang) {
  try {
    const res = await fetch(`/translations?lang=${lang}`);
    window.translations = await res.json();
  } catch (error) {
    if (
      error instanceof SyntaxError &&
      error.message.includes('Unexpected token <')
    ) {
      window.location.href = '/auth/login'; 
    } else {
      
      console.error(error);
    }
  }
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
    window.location.href = '/auth/login'; 
    console.error('Wystąpił błąd:', error);
    return null;
  }
}

window.translationsReady = window.loadTranslations(document.documentElement.lang || 'en');
window.loadLangs()
