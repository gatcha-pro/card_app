export async function sendSMS(to, msg) {
  try {
    const res = await axios.post('https://api.solapi.com/messages/v4/send', {
      message: {
        to,
        from: process.env.SENDER_PHONE,
        text: msg
      }
    }, {
      headers: {
        Authorization: `HMAC ${process.env.SOLAPI_KEY}:${process.env.SOLAPI_SECRET}`
      }
    });

    return res.data;
  } catch (err) {
    console.error('❌ 문자 전송 실패:', err.response?.data || err.message);
    return { success: false, error: err.response?.data || err.message };
  }
}
