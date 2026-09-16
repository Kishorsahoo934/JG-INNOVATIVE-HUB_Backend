import NativeSMTPClient from './src/services/nativeSmtp.js';

const client = new NativeSMTPClient({
  host: 'smtp.gmail.com',
  user: 'Info@inovative-hub.com',
  pass: 'wdfndymigfokymok', // Or whatever it is from .env. Let's just use .env!
});

// Since we can't easily grab process.env without dotenv, I'll just load it.
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
