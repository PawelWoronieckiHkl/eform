const nodemailer = require('nodemailer');
const nunjucks = require('nunjucks');
const path = require('path');
const fs = require('fs');
const confLang = require('./conf');


const transporter = nodemailer.createTransport({
  host: 'serwer2560216.home.pl',
  port: 587,
  secure: false,
  auth: {
    user: 'orderbot@e-orders.eu',
    pass: 'H8$/8;N#.$qCR5fQHpak'
  },
  tls: {
    rejectUnauthorized: false
  }
});




function sendMail(to, lang, pdfBuffer, templateVars = {}) {
  const i18n = confLang(lang)

  const __ = (key) => i18n.__(key, { locale: lang });

  const subject = `${__('mail.subject')} #${templateVars.orderNr} `;
  nunjucks.configure(path.dirname(path.join(__dirname, 'mailTemplate.njk')), {
    autoescape: true
  });


  const htmlContent = nunjucks.render('mailTemplate.njk', {
    ...templateVars,
    __
  });

  const attachments = [
    {
      filename: `zamowienie_${templateVars.orderNr}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }
  ];

  // Dodaj logo jako załącznik inline jeśli plik istnieje
  if (fs.existsSync(templateVars.logoPath)) {
    attachments.push({
      filename: 'logo.png',
      path: templateVars.logoPath,
      cid: 'logo_cid' // musi odpowiadać CID w szablonie
    });
  } else {
    console.warn('Plik logo nie istnieje:', templateVars.logoPath);
  }

  const mailOptions = {
    from: '"e-orders" <orderbot@e-orders.eu>',
    to,
    subject,
    html: htmlContent,
    text: 'Twój klient poczty nie obsługuje wiadomości HTML. Odwiedź https://e-orders.eu',
    attachments // dodajemy załączniki
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Błąd wysyłki:', error);
    } else {
      console.log('Stylizowany e-mail wysłany:', info.response,to);
    }
  });
}

// Wysyłka stylizowanego maila

module.exports = { sendMail }