import net from 'net';
import tls from 'tls';

/**
 * A native, zero-dependency SMTP client supporting STARTTLS (587) and
 * implicit TLS (465).
 * Built because we want full control over the SMTP transaction without third-party bloat like nodemailer.
 */
class NativeSMTPClient {
  constructor(options) {
    this.host = options.host || 'smtp.gmail.com';
    this.port = Number(options.port || 587);
    this.secure = options.secure ?? this.port === 465;
    this.user = options.user;
    this.pass = options.pass;
  }

  /**
   * Send an email using raw SMTP commands over native sockets.
   */
  async sendMail({ from, to, replyTo, subject, html, text }) {
    const boundary = `----=_Part_${Date.now().toString(16)}`;
    const fromFormatted = typeof from === 'string' ? from : `${from.name} <${from.email}>`;
    const toFormatted = Array.isArray(to) ? to.join(', ') : to;
    let emailData = `From: ${fromFormatted}\r\nTo: ${toFormatted}\r\n`;
    if (replyTo) {
      const replyToFormatted = typeof replyTo === 'string' ? replyTo : `${replyTo.name} <${replyTo.email}>`;
      emailData += `Reply-To: ${replyToFormatted}\r\n`;
    }
    emailData += `Subject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
    if (text) emailData += `--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n\r\n`;
    if (html) emailData += `--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}\r\n\r\n`;
    emailData += `--${boundary}--\r\n`;

    const connection = await this.connectWithFallback();
    let socket = connection.socket;
    const secure = connection.secure;
    try {
      await this.command(socket, null, 220);
      await this.command(socket, `EHLO ${this.host}`, 250);
      if (!secure) {
        await this.command(socket, 'STARTTLS', 220);
        socket = await this.upgradeToTls(socket);
        await this.command(socket, `EHLO ${this.host}`, 250);
      }
      await this.command(socket, 'AUTH LOGIN', 334);
      await this.command(socket, Buffer.from(this.user).toString('base64'), 334);
      await this.command(socket, Buffer.from(this.pass).toString('base64'), 235);
      await this.command(socket, `MAIL FROM:<${this.extractEmail(fromFormatted)}>`, 250);
      await this.command(socket, `RCPT TO:<${this.extractEmail(toFormatted)}>`, 250);
      await this.command(socket, 'DATA', 354);
      await this.command(socket, `${emailData}.`, 250);
      await this.command(socket, 'QUIT', 221, 250);
      socket.end();
      return { success: true };
    } catch (error) {
      socket.destroy();
      throw error;
    }
  }

  async connectWithFallback() {
    try {
      return { socket: await this.connect(this.port, this.secure), secure: this.secure };
    } catch (firstError) {
      const fallbackPort = this.port === 465 ? 587 : 465;
      const fallbackSecure = fallbackPort === 465;
      try {
        return { socket: await this.connect(fallbackPort, fallbackSecure), secure: fallbackSecure };
      } catch (fallbackError) {
        const firstMessage = firstError.message || firstError.code || 'unknown error';
        const fallbackMessage = fallbackError.message || fallbackError.code || 'unknown error';
        throw new Error(
          `SMTP connection failed on ports ${this.port} and ${fallbackPort}: ${firstMessage}; ${fallbackMessage}`
        );
      }
    }
  }

  connect(port = this.port, secure = this.secure) {
    return new Promise((resolve, reject) => {
      const socket = secure
        ? tls.connect({ host: this.host, port, family: 4, servername: this.host })
        : net.connect({ host: this.host, port, family: 4 });
      const onError = (error) => reject(new Error(`SMTP connection failed on port ${port}: ${error.message || error.code || 'unknown error'}`));
      socket.setTimeout(15000, () => {
        socket.destroy(new Error(`connection timeout on port ${port}`));
      });
      socket.once('secureConnect', () => resolve(socket));
      socket.once('connect', () => { if (!secure) resolve(socket); });
      socket.once('error', onError);
    });
  }

  upgradeToTls(socket) {
    return new Promise((resolve, reject) => {
      socket.removeAllListeners('error');
      const secureSocket = tls.connect({ socket, servername: this.host });
      secureSocket.once('secureConnect', () => resolve(secureSocket));
      secureSocket.once('error', (error) => reject(new Error(`SMTP TLS upgrade failed: ${error.message}`)));
    });
  }

  command(socket, command, expected, alternateExpected) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const onData = (data) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';
        const finalLine = lines.findLast((line) => /^\d{3} /.test(line));
        if (!finalLine) return;
        cleanup();
        const code = Number.parseInt(finalLine.slice(0, 3), 10);
        if (code !== expected && code !== alternateExpected) {
          reject(new Error(`SMTP Error: expected ${expected}, got ${code}: ${finalLine}`));
          return;
        }
        resolve(finalLine);
      };
      const onError = (error) => { cleanup(); reject(error); };
      const cleanup = () => {
        socket.off('data', onData);
        socket.off('error', onError);
      };
      socket.on('data', onData);
      socket.once('error', onError);
      if (command) socket.write(`${command}\r\n`);
    });
  }

  extractEmail(address) {
    if (!address) return '';
    const match = address.match(/<(.+)>/);
    return match ? match[1] : address;
  }
}

export default NativeSMTPClient;





