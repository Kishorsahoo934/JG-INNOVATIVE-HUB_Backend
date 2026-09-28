const fs = require('fs');
const path = 'k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/utils/mailer.js';
let code = fs.readFileSync(path, 'utf8');

const regex = /const sendEmailWithFallback = async \(\{ toEmail[\s\S]+?return false;\n  \}\n\};/;

const newFunc = \const sendEmailWithFallback = async ({ toEmail, toName, subject, html, attachments = [], replyTo }) => {
  const sender = getSenderDetails();
  if (!sender) {
    console.warn('Mail: sender not configured; skipping email');
    return false;
  }

  if (!process.env.BREVO_API_KEY) {
    console.warn('Mail: Brevo API key not configured; skipping email');
    return false;
  }

  try {
    await sendBrevoEmail({
      sender: { email: sender.email, name: sender.name },
      to: { email: toEmail, name: toName },
      subject,
      html,
      replyTo: replyTo ? { email: replyTo.email, name: replyTo.name } : undefined,
    });
    console.log(\\\[Brevo] Email successfully sent to \\\\\\);
    return true;
  } catch (err) {
    console.error(\\\[Brevo] Failed for \\\: \\\\\\);
    return false;
  }
};\;

if (regex.test(code)) {
    code = code.replace(regex, newFunc);
    fs.writeFileSync(path, code);
    console.log('REPLACED SUCCESSFULLY');
} else {
    console.log('Func not found');
}

