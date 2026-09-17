import fs from 'fs';

const code = `\n\nexport const sendWelcomeEmail = async ({ email, name }) => {
  const subject = 'Welcome to Innovative Hub';
  const html = \`
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi \${name || 'Customer'},</p>
      <p>Welcome to <strong>Innovative Hub</strong>!</p>

<p>Your account has been successfully created, and you are all set to explore.</p>

<p>At Innovative Hub, you can:</p>
<ul>
  <li>Browse high-quality electronics &amp; components</li>
  <li>Explore microcontroller boards, sensors, and modules</li>
  <li>Track your orders easily</li>
  <li>Get support for projects, innovation, and 3D printing services</li>
</ul>

<p>You will receive email updates for every order (confirmed, packed, shipped, delivered) so you're always in the loop.</p>

<p>You can log in anytime using your registered email address.</p>

<p>
  👉 <a href="http://localhost:5177/login" target="_blank" rel="noopener noreferrer"><strong>Login here</strong></a>
</p>

<p>If you have any questions or need help, feel free to reply to this email — we’re happy to help.</p>

<p>
  Happy building &amp; innovating 🚀<br>
  <strong>Team Innovative Hub</strong>
</p>

<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

<p style="color: #666; font-size: 0.9em;">
  <strong>Innovative Hub</strong><br>
  <em>Building ideas into reality</em>
</p>
    </div>
  \`;
  await sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};\n`;

let data = fs.readFileSync('src/utils/mailer.js', 'utf8');
data = data.replace(/export const sendWelcomeEmail.*?<\/div>\n\s*;\n  await sendEmailWithFallback.*?;/s, '');
fs.writeFileSync('src/utils/mailer.js', data + code);

