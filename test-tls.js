import tls from 'tls';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const host = 'smtp.gmail.com';
  const port = 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`Connecting to ${host}:${port}...`);
  const socket = tls.connect(port, host, () => {
    console.log('TLS connection established.');
  });

  const steps = [
    { expect: 220, send: `EHLO ${host}` },
    { expect: 250, send: 'AUTH LOGIN' },
    { expect: 334, send: Buffer.from(user).toString('base64') },
    { expect: 334, send: Buffer.from(pass).toString('base64') },
    { expect: 235, send: 'QUIT' }
  ];

  let currentStep = 0;
  let log = [];

  socket.on('data', (data) => {
    const response = data.toString().trim();
    log.push(`S: ${response}`);
    console.log(`S: ${response}`);

    const lines = response.split('\r\n');
    const lastLine = lines[lines.length - 1];
    
    // Ignore multi-line response lines until the last one
    if (lastLine.match(/^\d{3}-/)) return;
    
    const code = parseInt(lastLine.substring(0, 3), 10);

    if (currentStep < steps.length) {
      const expected = steps[currentStep].expect;
      if (expected && code !== expected && code !== 220) {
         console.error(`Failed! Expected ${expected}, got ${code}`);
         socket.end();
         return;
      }
      
      const cmd = steps[currentStep].send;
      console.log(`C: ${cmd === Buffer.from(pass).toString('base64') ? '***PASSWORD***' : cmd}`);
      socket.write(`${cmd}\r\n`);
      currentStep++;
    } else {
      socket.end();
      console.log('Done!');
    }
  });

  socket.on('error', (err) => console.error(err));
}
test();

