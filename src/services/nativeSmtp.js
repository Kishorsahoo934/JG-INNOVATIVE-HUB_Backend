import tls from 'tls';

/**
 * A native, zero-dependency SMTP client supporting Implicit TLS (Port 465).
 * Built because we want full control over the SMTP transaction without third-party bloat like nodemailer.
 */
class NativeSMTPClient {
  constructor(options) {
    this.host = options.host || 'smtp.gmail.com';
    this.port = 465;
    this.user = options.user;
    this.pass = options.pass;
  }

  /**
   * Send an email using raw SMTP commands over TLS.
   */
  async sendMail({ from, to, replyTo, subject, html, text }) {
    return new Promise((resolve, reject) => {
      let currentStep = 0;
      let transactionLog = [];

      const boundary = `----=_Part_${Date.now().toString(16)}`;
      const fromFormatted = typeof from === 'string' ? from : `${from.name} <${from.email}>`;
      const toFormatted = Array.isArray(to) ? to.join(', ') : to;

      let emailData = `From: ${fromFormatted}\r\n`;
      emailData += `To: ${toFormatted}\r\n`;
      if (replyTo) {
        const replyToFormatted = typeof replyTo === 'string' ? replyTo : `${replyTo.name} <${replyTo.email}>`;
        emailData += `Reply-To: ${replyToFormatted}\r\n`;
      }
      emailData += `Subject: ${subject}\r\n`;
      emailData += `MIME-Version: 1.0\r\n`;
      emailData += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;

      if (text) {
        emailData += `--${boundary}\r\n`;
        emailData += `Content-Type: text/plain; charset=utf-8\r\n\r\n`;
        emailData += `${text}\r\n\r\n`;
      }

      if (html) {
        emailData += `--${boundary}\r\n`;
        emailData += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
        emailData += `${html}\r\n\r\n`;
      }
      emailData += `--${boundary}--\r\n`;

      const steps = [
        { expect: 220, send: `EHLO ${this.host}` },
        { expect: 250, send: 'AUTH LOGIN' },
        { expect: 334, send: Buffer.from(this.user).toString('base64') },
        { expect: 334, send: Buffer.from(this.pass).toString('base64') },
        { expect: 235, send: `MAIL FROM:<${this.extractEmail(fromFormatted)}>` },
        { expect: 250, send: `RCPT TO:<${this.extractEmail(toFormatted)}>` },
        { expect: 250, send: 'DATA' },
        { expect: 354, send: `${emailData}.\r\n` },
        { expect: 250, send: 'QUIT' }
      ];

      const socket = tls.connect(this.port, this.host, () => {});

      const handleData = (data) => { console.log('DEBUG:', data.toString().trim()); 
        const response = data.toString();
        transactionLog.push(`S: ${response.trim()}`);
        
        const lines = response.trim().split('\r\n');
        const lastLine = lines[lines.length - 1];
        
        if (lastLine.match(/^\d{3}-/)) {
          return;
        }

        const code = parseInt(lastLine.substring(0, 3), 10);
        
        if (currentStep < steps.length) {
          const expected = currentStep < steps.length ? steps[currentStep].expect : null;
          if (expected && code !== expected && code !== 220) {
             reject(new Error(`SMTP Error: Expected ${expected}, got ${code}. Log: ${transactionLog.join(' | ')}`));
             socket.end();
             return;
          }
          sendNext();
        } else {
          socket.end();
          resolve({ success: true, log: transactionLog });
        }
      };

      const sendNext = () => {
        if (currentStep < steps.length) {
           const cmd = steps[currentStep].send;
           transactionLog.push(`C: ${cmd === Buffer.from(this.pass).toString('base64') ? '***PASSWORD***' : cmd.trim()}`);
           
           if (cmd.endsWith('.\r\n')) {
               socket.write(cmd);
           } else {
               socket.write(`${cmd}\r\n`);
           }
           currentStep++;
        }
      };

      const handleError = (err) => {
        reject(new Error(`Socket Error: ${err.message}`));
      };

      socket.on('data', handleData);
      socket.on('error', handleError);
    });
  }

  extractEmail(address) {
    if (!address) return '';
    const match = address.match(/<(.+)>/);
    return match ? match[1] : address;
  }
}

export default NativeSMTPClient;





