import fs from 'fs';

const code = `\n\nexport const sendOrderSuccessEmail = async ({ email, name, order }) => {
  return sendOrderConfirmedEmail({ email, name, order });
};\n`;

fs.appendFileSync('src/utils/mailer.js', code);

