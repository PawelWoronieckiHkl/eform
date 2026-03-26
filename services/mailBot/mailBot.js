const nodemailer = require('nodemailer');
const nunjucks = require('nunjucks');
const path = require('path');
const fs = require('fs');
const confLang = require('./conf');
const { log } = require('../../utils/logging');


const transporter = nodemailer.createTransport({
  host: 'serwer2560216.home.pl',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAILBOT_USER,
    pass: process.env.MAILBOT_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});


function sendMail(to, lang, pdfBuffer, attachmentsBuffer=[], templateVars = {}, bcc = null) {
  const i18n = confLang(lang)

  const __ = (key) => i18n.__(key, { locale: lang });

  const subject = `${__('mail.subject')} #${templateVars.orderNr} - ${templateVars.klient} `;
  nunjucks.configure(path.dirname(path.join(__dirname, 'mailTemplate.njk')), {
    autoescape: true
  });


  const htmlContent = nunjucks.render('mailTemplate.njk', {
    ...templateVars,
    __
  });

  const attachments = [
    {
      filename: `${__('history_order.title')}${templateVars.orderNr}.pdf`,
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
    log('Plik logo nie istnieje:', templateVars.logoPath);
  }

  // Dodaj dodatkowe załączniki z attachmentsBuffer
  if (attachmentsBuffer && Array.isArray(attachmentsBuffer)) {
    attachmentsBuffer.forEach(attachment => {
      if (attachment.filename && attachment.content) {
        attachments.push({
          filename: attachment.filename,
          content: attachment.content
        });
      }
    });
  }

  const mailOptions = {
    from: `"${process.env.MAILBOT_ALIAS}" <${process.env.MAILBOT_USER}>`,
    to,
    subject,
    html: htmlContent,
    text: 'Twój klient poczty nie obsługuje wiadomości HTML. Odwiedź https://e-orders.eu',
    attachments // dodajemy załączniki
  };

  // Dodaj BCC (UDW) jeśli został podany
  if (bcc) {
    mailOptions.bcc = bcc;
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      log('Błąd wysyłki:', error);
    } else {
      log('Stylizowany e-mail wysłany:', info.response, to);
      if (bcc) {
        log('BCC (UDW):', bcc);
      }
    }
  });
}

// Wysyłka stylizowanego maila

module.exports = { sendMail }