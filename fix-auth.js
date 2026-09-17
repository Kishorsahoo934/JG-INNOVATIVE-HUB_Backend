import fs from 'fs';

let content = fs.readFileSync('src/controllers/auth.controller.js', 'utf8');

// 1. Add PendingUser import
content = content.replace(
  "import User from '../models/User.model.js';",
  "import User from '../models/User.model.js';\nimport PendingUser from '../models/PendingUser.model.js';"
);

// 2. Update register
content = content.replace(
  /const verifyToken = crypto\.randomBytes\(32\)\.toString\('hex'\);\s*const verifyTokenHash = crypto\.createHash\('sha256'\)\.update\(verifyToken\)\.digest\('hex'\);\s*const user = await User\.create\(\{\s*name,\s*email: email\.toLowerCase\(\),\s*password,\s*mobile: mobileToSave,\s*mobileVerified: false,\s*authProvider: 'email',\s*emailVerified: false,\s*emailVerifyToken: verifyTokenHash,\s*emailVerifyExpires: new Date\(Date\.now\(\) \+ 24 \* 60 \* 60 \* 1000\),\s*\}\);/,
  `const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
    
    await PendingUser.deleteMany({ email: email.toLowerCase() }); // Clear old pending ones
    const pending = await PendingUser.create({
      name,
      email: email.toLowerCase(),
      password,
      mobile: mobileToSave,
      tokenHash: verifyTokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const user = { email: pending.email, name: pending.name };`
);

// 3. Update verifyEmail
content = content.replace(
  /export const verifyEmail = async \(req, res, next\) => \{[\s\S]*?return res\.json\(\{\s*success: true,\s*message: 'Email verified\. You can now log in\.',\s*data: \{ token: jwtToken, user: userResponse \},\s*\}\);\s*\} catch \(err\) \{/,
  `export const verifyEmail = async (req, res, next) => {
  try {
    const token = req.query.token || req.body?.token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    let user = await User.findOne({
      emailVerifyToken: tokenHash,
      emailVerifyExpires: { $gt: new Date() },
    });

    if (user) {
      // Legacy flow: user already existed in User collection
      user.emailVerified = true;
      user.emailVerifyToken = undefined;
      user.emailVerifyExpires = undefined;
      await user.save();
    } else {
      // New flow: User is in PendingUser
      const pendingUser = await PendingUser.findOne({
        tokenHash,
        expiresAt: { $gt: new Date() },
      });
      
      if (!pendingUser) {
        return res.status(400).json({ success: false, message: 'Invalid or expired verification link' });
      }

      // Check if email already taken while pending
      const existingUser = await User.findOne({ email: pendingUser.email });
      if (existingUser) {
        await PendingUser.deleteOne({ _id: pendingUser._id });
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      // Create the user
      user = await User.create({
        name: pendingUser.name,
        email: pendingUser.email,
        password: pendingUser.password, // Plaintext, User pre-save will hash it
        mobile: pendingUser.mobile,
        mobileVerified: false,
        authProvider: 'email',
        emailVerified: true,
      });

      await PendingUser.deleteOne({ _id: pendingUser._id });
    }

    void sendWelcomeEmail({ email: user.email, name: user.name });

    const jwtToken = generateToken(user._id);
    const userResponse = publicUserFields(user);

    return res.json({
      success: true,
      message: 'Email verified. You can now log in.',
      data: { token: jwtToken, user: userResponse },
    });
  } catch (err) {`
);

// 4. Update resendVerifyEmail
content = content.replace(
  /export const resendVerifyEmail = async \(req, res, next\) => \{[\s\S]*?return res\.json\(\{ success: true, message: 'Verification email sent\. Please check your inbox\.' \}\);\s*\} catch \(err\) \{/,
  `export const resendVerifyEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const emailLower = email.toLowerCase();
    
    // Check if fully registered and verified
    const user = await User.findOne({ email: emailLower, authProvider: 'email' });
    if (user && user.emailVerified) {
      return res.json({ success: true, message: 'This email is already verified. You can log in.' });
    }

    // Since we don't save to User until verified, check PendingUser
    const pendingUser = await PendingUser.findOne({ email: emailLower });
    
    if (!pendingUser && !user) {
      return res.json({ success: true, message: 'If an account exists, a new verification email has been sent.' });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
    
    if (pendingUser) {
      pendingUser.tokenHash = verifyTokenHash;
      pendingUser.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await pendingUser.save();
      
      const baseUrl = getFrontendBaseUrl();
      const verifyUrl = \`\${baseUrl}/verify-email?token=\${verifyToken}\`;
      void sendVerificationEmail({ email: pendingUser.email, name: pendingUser.name, verifyUrl });
    } else if (user && !user.emailVerified) {
      // Legacy unverified users that were saved in User collection directly
      user.emailVerifyToken = verifyTokenHash;
      user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      
      const baseUrl = getFrontendBaseUrl();
      const verifyUrl = \`\${baseUrl}/verify-email?token=\${verifyToken}\`;
      void sendVerificationEmail({ email: user.email, name: user.name, verifyUrl });
    }

    return res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {`
);

fs.writeFileSync('src/controllers/auth.controller.js', content);

