import https from 'node:https';

const BREVO_API_HOST = 'api.brevo.com';
const BREVO_API_PATH = '/v3/smtp/email';
const DEFAULT_TIMEOUT_MS = 15_000;

export const sendBrevoEmail = async ({ sender, to, subject, html, replyTo }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('Brevo API key not configured');
  }

  if (!sender?.email) {
    throw new Error('Brevo sender email missing');
  }

  const payload = {
    sender: sender.name ? { email: sender.email, name: sender.name } : { email: sender.email },
    to: [
      to?.name ? { email: to.email, name: to.name } : { email: to.email },
    ],
    ...(replyTo?.email ? { replyTo: replyTo.name ? { email: replyTo.email, name: replyTo.name } : { email: replyTo.email } } : {}),
    subject,
    htmlContent: html,
  };

  const body = JSON.stringify(payload);
  const timeoutMs = Number.parseInt(process.env.BREVO_API_TIMEOUT_MS || '', 10) || DEFAULT_TIMEOUT_MS;

  await new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: BREVO_API_HOST,
        path: BREVO_API_PATH,
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
        },
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve();
            return;
          }

          let message = data;
          try {
            const parsed = JSON.parse(data);
            message = parsed?.message || parsed?.error || data;
          } catch (err) {
            message = data;
          }
          const error = new Error(`Brevo API error ${response.statusCode}: ${message}`);
          error.statusCode = response.statusCode;
          reject(error);
        });
      },
    );

    request.on('error', (err) => reject(err));
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Brevo API request timed out after ${timeoutMs}ms`));
    });
    request.write(body);
    request.end();
  });
};
