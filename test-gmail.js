const https = require('http');

const data = JSON.stringify({
  to: "anubhabr97@gmail.com",
  subject: "Vishwakarma AI Test",
  body: "Gmail API is working!"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/gmail',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log('RESULT:', body));
});

req.write(data);
req.end();