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


function buildMailOptions(to, lang, pdfBuffer, attachmentsBuffer = [], templateVars = {}, cc = null) {
  const i18n = confLang(lang);
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

  if (fs.existsSync(templateVars.logoPath)) {
    attachments.push({
      filename: 'logo.png',
      path: templateVars.logoPath,
      cid: 'logo_cid'
    });
  } else {
    log('Plik logo nie istnieje:', templateVars.logoPath);
  }

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
    attachments
  };

  if (cc) {
    mailOptions.cc = cc;
  }

  return mailOptions;
}

function sendMailAsync(to, lang, pdfBuffer, attachmentsBuffer = [], templateVars = {}, cc = null) {
  const mailOptions = buildMailOptions(to, lang, pdfBuffer, attachmentsBuffer, templateVars, cc);
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        log('Błąd wysyłki:', error);
        reject(error);
      } else {
        log('Stylizowany e-mail wysłany:', info.response, to);
        if (cc) {
          log('CC:', cc);
        }
        resolve(info);
      }
    });
  });
}

function sendMail(to, lang, pdfBuffer, attachmentsBuffer = [], templateVars = {}, cc = null) {
  sendMailAsync(to, lang, pdfBuffer, attachmentsBuffer, templateVars, cc).catch(() => {});
}

module.exports = { sendMail, sendMailAsync };