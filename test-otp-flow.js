import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const { register, verifyEmail } = await import('./src/controllers/auth.controller.js');
  const { default: User } = await import('./src/models/User.model.js');

  const testEmail = `test.otp.${Date.now()}@example.com`;
  console.log('Testing with email:', testEmail);

  // 1. Mock Request/Response for Register
  let resStatus = 0;
  let resJson = null;

  const reqRegister = {
    body: {
      name: 'Test OTP User',
      email: testEmail,
      password: 'Password123!',
      mobile: '9' + Math.floor(100000000 + Math.random() * 900000000).toString()
    }
  };

  const resRegister = {
    status: (code) => {
      resStatus = code;
      return resRegister;
    },
    json: (data) => {
      resJson = data;
    }
  };

  // Give some time for the email to be "sent" in the background
  console.log('--- CALLING REGISTER ---');
  await register(reqRegister, resRegister, (err) => console.error(err));
  console.log('Register Response:', resStatus, resJson);

  // Let the background email promise resolve
  await new Promise(r => setTimeout(r, 4000));

  // 2. Fetch the user to get the token (since we console logged it, but to automate the test let's grab it)
  // Wait, the token is hashed in DB! We can't reverse it. We have to capture it from the sendVerificationEmail call or console log!
  // To avoid parsing console logs, let's just create our own token and override it in DB for testing the verification, 
  // OR we can just observe that the email was successfully sent.
  
  const { default: PendingUser } = await import('./src/models/PendingUser.model.js');
  const user = await PendingUser.findOne({ email: testEmail });
  if (!user) {
    console.error('User not created!');
    process.exit(1);
  }
  console.log('User created. emailVerifyToken hash exists:', !!user.emailVerifyToken);

  // Let's generate a known token to test verification endpoint
  const testToken = crypto.randomBytes(32).toString('hex');
  const testTokenHash = crypto.createHash('sha256').update(testToken).digest('hex');
  user.emailVerifyToken = testTokenHash;
  await user.save();
  console.log('Injected test verification token.');

  // 3. Mock Request/Response for Verify
  const reqVerify = {
    query: { token: testToken }
  };
  let verifyStatus = 0;
  let verifyJson = null;
  const resVerify = {
    status: (code) => {
      verifyStatus = code;
      return resVerify;
    },
    json: (data) => {
      verifyJson = data;
    }
  };

  console.log('--- CALLING VERIFY ---');
  await verifyEmail(reqVerify, resVerify, (err) => console.error(err));
  console.log('Verify Response:', verifyStatus || 200, verifyJson);

  // 4. Verify in DB
  const verifiedUser = await User.findOne({ email: testEmail });
  console.log('User emailVerified in DB:', verifiedUser.emailVerified);
  console.log('Auth successful?', verifiedUser.emailVerified && verifyJson.success);

  mongoose.disconnect();
}

run().catch(console.error);



