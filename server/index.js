import express          from 'express';
import multer           from 'multer';
import fs               from 'fs';
import path             from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import cors             from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv           from 'dotenv';
import { sendSMS }      from './sendSMS.js';

// 환경변수 로드
dotenv.config();

// ES 모듈용 __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const dirPath    = path.dirname(__filename);

// Express 앱 초기화
const app  = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(dirPath, '../public')));

// Supabase 클라이언트 (Service Role Key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Multer 메모리 스토리지 (파일 시스템 불안정 회피)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 최대 5MB
});

// 유니크 수비력 생성
async function generateUniqueDefense() {
  while (true) {
    const candidate = Math.floor(Math.random() * 1000);
    const { data, error } = await supabase
      .from('submissions')
      .select('defense')
      .eq('defense', candidate);
    if (!error && data.length === 0) return candidate;
  }
}

// ── 사용자 업로드 API ──
app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const phone = req.body.phone;
    // 1) Supabase Storage에 업로드
    const ext      = path.extname(req.file.originalname);
    const filename = `${Date.now()}${ext}`;
    const { data: uploadData, error: uploadErr } = await supabase
      .storage
      .from('uploads')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600'
      });
    if (uploadErr) throw uploadErr;

    // 2) public URL 생성
    const { publicURL, error: urlErr } = supabase
      .storage
      .from('uploads')
      .getPublicUrl(uploadData.path);
    if (urlErr) throw urlErr;

    // 3) 공격·수비값
    const attack  = Math.floor(Math.random() * 100) * 100;
    const defense = await generateUniqueDefense();

    // 4) DB 저장 (원본 Supabase URL)
    const { error: dbErr } = await supabase
      .from('submissions')
      .insert([{ phone, attack, defense, image_url: publicURL }]);
    if (dbErr) throw dbErr;

    return res.json({ success: true, attack, defense, image_url: publicURL });
  } catch (err) {
    console.error('❌ 업로드 실패:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── submissions 목록 조회 ──
app.get('/submissions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select()
      .order('defense', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('❌ submissions 불러오기 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── SMS 전송 ──
app.post('/sms', async (req, res) => {
  const { to, msg } = req.body;
  console.log(`📨 [SMS] to: ${to}, msg: ${msg}`);
  try {
    const data = await sendSMS(to, msg);
    res.json(data);
  } catch (error) {
    console.error('❌ 문자 전송 실패:', error);
    res.status(500).json({ success: false });
  }
});

// ── 정적 HTML 라우팅 ──
app.get('/',        (req, res) => res.sendFile(path.join(dirPath, '../public/index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(dirPath, '../public/admin.html')));

// ── 카드 삭제 ──
app.delete('/submissions/:defense', async (req, res) => {
  const defense = parseInt(req.params.defense, 10);
  try {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('defense', defense);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 삭제 실패:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});