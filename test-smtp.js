import NativeSMTPClient from './src/services/nativeSmtp.js';
import dotenv from 'dotenv';
dotenv.config();

const client2 = new NativeSMTPClient({
  host: process.env.SMTP_HOST,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
});

async function run() {
  console.log('Sending email...');
  const res = await client2.sendMail({
    from: process.env.SMTP_USER,
    to: 'test@example.com',
    subject: 'Test Contact',
    html: '<p>Test</p>',
  });
  console.log(res);
}

run().catch(console.error);
