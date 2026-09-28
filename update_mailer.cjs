const fs = require('fs');
const path = 'k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/utils/mailer.js';
let code = fs.readFileSync(path, 'utf8');

const regex = /export const sendWelcomeEmail = async \(\{ email, name \}\) => \{[\s\S]+?await sendEmailWithFallback\(\{ toEmail: email, toName: name, subject, html \}\);\n\};/;

const newCode = `export const sendWelcomeEmail = async ({ email, name }) => {
  const subject = 'Welcome to Innovative Hub! 🚀';
  const html = \`
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hello \${name || 'User'},</p>

      <p><strong>Welcome to Innovative Hub! 🚀</strong></p>

      <p>Your account has been successfully created.</p>

      <p>You're now part of an ecosystem built for <strong>people who don't just learn technology — they build with it.</strong></p>

      <p>At Innovative Hub, you can explore:</p>

      <p>🔧 <strong>Components & Electronics</strong><br>
      Find the tools and components you need for your next project.</p>

      <p>🤖 <strong>Projects & Project Kits</strong><br>
      Turn ideas into working prototypes through practical projects.</p>

      <p>📚 <strong>Learning & Workshops</strong><br>
      Learn robotics, electronics, embedded systems, IoT and emerging technologies.</p>

      <p>💡 <strong>Innovation & Product Development</strong><br>
      Explore ideas, develop prototypes and work towards real-world solutions.</p>

      <p>Your account is your starting point.<br>
      <strong>What you build from here is up to you.</strong></p>

      <h3>Think. Build. Innovate.</h3>

      <p>We're excited to have you with us and look forward to seeing what you create.</p>

      <p><strong>Welcome to the Hub.</strong></p>

      <p>Regards,<br>
      <strong>Team Innovative Hub</strong><br>
      <em>Where Ideas Become Innovation.</em></p>

      <p>🌐 <a href="http://www.inovative-hub.com">www.inovative-hub.com</a></p>

      <p style="font-size: 0.85em; color: #555; margin-top: 20px;"><em>This is an automated email. Please do not reply to this message.</em></p>
    </div>
  \`;
  await sendEmailWithFallback({ toEmail: email, toName: name, subject, html });
};`;

code = code.replace(regex, newCode);
fs.writeFileSync(path, code);
console.log('done');
