const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (email, token) => {
  const url = `${process.env.BASE_URL}/verify-email.html?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Anonyme" <noreply@anonyme.com>',
    to: email,
    subject: 'Vérifiez votre adresse email - Anonyme',
    html: `
      <h1>Bienvenue sur Anonyme !</h1>
      <p>Merci de vous être inscrit. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email et activer votre compte :</p>
      <a href="${url}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Vérifier mon email</a>
      <p>Ce lien expirera dans 24 heures.</p>
      <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
};
