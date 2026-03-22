import crypto from 'crypto';

const customerId = '3857808';
const accessLicense = '0100000000933a8c93a8a56308d329632840211f378072005798770d6abb60b09ed686377d';
const secretKey = 'AQAAAACTOoyTqKVjcNMpYyhAIR83S/BybKi3aO3YRjLAxfKYPw==';

const timestamp = Date.now().toString();
const method = 'GET';
const path = '/keywordstool';
const message = `${timestamp}.${method}.${path}`;

const signature = crypto.createHmac('sha256', secretKey).update(message).digest('base64');

const apiUrl = `https://api.naver.com${path}?hintKeywords=%EB%A7%9B%EC%A7%91&showDetail=1`;

async function main() {
  const res = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': accessLicense,
      'X-Customer': customerId,
      'X-Signature': signature,
    }
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}
main();
