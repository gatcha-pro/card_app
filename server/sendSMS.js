import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = process.env.SOLAPI_KEY;
const API_SECRET = process.env.SOLAPI_SECRET;
const SENDER_PHONE = process.env.SENDER_PHONE;

function generateSignature(date, salt) {
  const hmac = crypto.createHmac('sha256', API_SECRET);
  hmac.update(date + salt);
  return hmac.digest('base64');
}

function getAuthorization() {
  const date = new Date().toISOString();
  const salt = uuidv4();
  const signature = generateSignature(date, salt);

  const authorization = `HMAC-SHA256 apiKey=${API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
  return authorization;
}

export async function sendSMS(to, msg) {
  const authorization = getAuthorization();

  try {
    const res = await axios.post(
      'https://api.solapi.com/messages/v4/send',
      {
        message: {
          to,
          from: SENDER_PHONE,
          text: msg
        }
      },
      {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.data;
  } catch (err) {
    console.error('❌ 문자 전송 실패:', err.response?.data || err.message);
    return { success: false, error: err.response?.data || err.message };
  }
}
