import SolapiMessageService from 'solapi';

const messageService = new SolapiMessageService(
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
    console.error('❌ 문자 전송 실패:', err);
    return { success: false, error: err };
  }
}
