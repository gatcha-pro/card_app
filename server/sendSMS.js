import axios from 'axios';

const SOLAPI_KEY = 'YOUR_KEY';
const SOLAPI_SECRET = 'YOUR_SECRET';
const SENDER_PHONE = '등록된발신번호';

export async function sendSMS(to, msg) {
  const res = await axios.post('https://api.solapi.com/messages/v4/send', {
    message: {
      to,
      from: SENDER_PHONE,
      text: msg
    }
  }, {
    headers: {
      Authorization: `HMAC ${SOLAPI_KEY}:${SOLAPI_SECRET}`
    }
  });
  return res.data;
}