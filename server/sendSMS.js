import pkg from 'solapi'; // ✅ CommonJS → default import
const { MessageService } = pkg; // ✅ 구조분해로 꺼내기

const messageService = new MessageService(
  process.env.SOLAPI_KEY,
  process.env.SOLAPI_SECRET
);

export async function sendSMS(to, msg) {
  try {
    const res = await messageService.send({
      to,
      from: process.env.SENDER_PHONE,
      text: msg
    });

    console.log('✅ 문자 전송 성공:', res);
    return { success: true };
  } catch (err) {
    console.error('❌ 문자 전송 실패:', err.response?.data || err.message);
    return { success: false, error: err.response?.data || err.message };
  }
}
