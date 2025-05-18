import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import Jimp from 'jimp';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { sendSMS } from './sendSMS.js';
import dotenv from 'dotenv';
import { generateCard } from './generateCard.js';

dotenv.config();

// ES 모듈에서 __dirname 사용 설정
const __filename = fileURLToPath(import.meta.url);
const dirPath    = path.dirname(__filename);

// 템플릿 설정 파일 로드
const configPath = path.join(dirPath, 'templateConfig.json');
const configRaw  = fs.readFileSync(configPath, 'utf-8');
const config     = JSON.parse(configRaw);

// Express 앱 초기화
const app  = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 라우팅
app.use(express.static(path.join(dirPath, '../public')));
app.use('/uploads', express.static(path.join(dirPath, '../uploads')));
app.use('/cards',   express.static(path.join(dirPath, '../cards')));

// Supabase 클라이언트 (서비스 롤 키)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Multer 설정 (최대 5MB)
const storage = multer.diskStorage({
  destination: path.join(dirPath, '../uploads'),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

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

// 업로드 핸들러
app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const phone    = req.body.phone;
    const filename = req.file.filename;
    // 원본 사진 URL
    const photoUrl = `/uploads/${filename}`;

    const attack  = Math.floor(Math.random() * 100) * 100;
    const defense = await generateUniqueDefense();

    // DB 저장 (원본 사진 URL)
    const { error: insertError } = await supabase
      .from('submissions')
      .insert([{ phone, attack, defense, image_url: photoUrl }]);
    if (insertError) throw insertError;

    // 합성 카드 로컬 저장 (DB 미저장)
    await generateCard(path.join(dirPath, '../uploads', filename), attack, defense);

    return res.json({ success: true, defense });
  } catch (err) {
    console.error('❌ 업로드 실패:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// submissions 목록 조회
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

// SMS 전송 API
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

// 정적 HTML 라우팅
app.get('/',      (req, res) => res.sendFile(path.join(dirPath, '../public/index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(dirPath, '../public/admin.html')));

// 카드 삭제 API
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