import { sendBrevoEmail } from './src/services/brevoEmail.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    await sendBrevoEmail({
      sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME },
      to: { email: 'test@example.com', name: 'Test User' },
      subject: 'Test Email',
      html: '<p>Test</p>'
    });
    console.log('Success');
  } catch (err) {
    console.error('Error:', err.message);
    if (err.statusCode) console.error('Status Code:', err.statusCode);
  }
}
test();
