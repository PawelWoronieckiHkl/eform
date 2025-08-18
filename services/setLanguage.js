function setLang(lang,res){
  const checkIfLangAvailable = ['pl','en','de','nl','fr'].includes(lang)
  if (lang && checkIfLangAvailable) {
    res.cookie('lang', lang, { maxAge: 365*24*60*60*1000, httpOnly: false });
  }
  else {res.cookie('lang', 'en', { maxAge: 365*24*60*60*1000, httpOnly: false });
}
}

module.exports ={setLang}