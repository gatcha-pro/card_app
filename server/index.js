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

// ─ ES 모듈에서 __dirname 사용 설정 ─
const __filename = fileURLToPath(import.meta.url);
const dirPath    = path.dirname(__filename);

// ─ templateConfig.json 로드 ─
const configPath = path.join(dirPath, 'templateConfig.json');
const configRaw  = fs.readFileSync(configPath, 'utf-8');
const config     = JSON.parse(configRaw);

// ─ Express 앱 설정 ─
const app  = express();
const PORT = process.env.PORT || 3000;

// ─ 미들웨어 ─
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─ 정적 파일 라우팅 ─
app.use(express.static(path.join(dirPath, '../public')));
app.use('/uploads', express.static(path.join(dirPath, '../uploads')));
app.use('/cards',   express.static(path.join(dirPath, '../cards')));

// ─ Supabase 클라이언트 ─
const supabase = createClient(
  'https://ygruxkqxogcnlgtsrbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncnV4a3F4b2djbmxndHNyYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDk4MzMsImV4cCI6MjA2MjYyNTgzM30.WtH5W_nIjRi_gs_aGMWl5ehB2TndRVZqDXPqAWb3axw'
);

// ─ Multer 설정 ─
const storage = multer.diskStorage({
  destination: path.join(dirPath, '../uploads'),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// ─ 유니크 수비력 생성 함수 ─
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

// ─ 업로드 핸들러 ─
app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    // 1) 흰색 캔버스 생성
    const template = new Jimp(
      config.canvas.width,
      config.canvas.height,
      0xffffffff
    );

    // 2) 사용자 사진 로드 & 리사이즈
    const photo = await Jimp.read(req.file.path);
    photo.resize(config.photo.w, config.photo.h);

    // 3) 캔버스에 사진 합성
    template.composite(photo, config.photo.x, config.photo.y);

    // 4) 폰트 로드
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

    // 5) 공격·수비값 계산
    const attackValue  = Math.floor(Math.random() * 100) * 100;
    const defenseValue = await generateUniqueDefense();

    // 6) 사용자 메시지 (옵션)
    const message = req.body.message || '';

    // 7) 텍스트 출력
    template.print(font, config.attack.x,  config.attack.y,  `공격력: ${attackValue}`);
    template.print(font, config.defense.x, config.defense.y, `수비력: ${defenseValue}`);
    template.print(font, config.msgAtt.x,  config.msgAtt.y,   message);
    template.print(font, config.msgDef.x,  config.msgDef.y,   message);

    // 8) PNG 버퍼로 변환
    const buffer = await template.getBufferAsync(Jimp.MIME_PNG);

    // 9) Supabase 스토리지에 업로드
    const { data, error: uploadError } = await supabase
      .storage
      .from('cards')
      .upload(`card-${uuidv4()}.png`, buffer, { contentType: 'image/png' });
    if (uploadError) throw uploadError;

    // 10) public URL 가져오기
    const url = supabase
      .storage
      .from('cards')
      .getPublicUrl(data.path)
      .publicURL;

    // 11) submissions 테이블에 저장
    const { error: dbError } = await supabase
      .from('submissions')
      .insert([{ 
        phone:      req.body.phone,
        attack:     attackValue,
        defense:    defenseValue,
        image_url:  url
      }]);
    if (dbError) throw dbError;

    // 12) 응답
    res.json({ success: true, imageUrl: url, attack: attackValue, defense: defenseValue });
  } catch (err) {
    console.error('❌ 업로드 실패:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─ submissions 목록 조회 ─
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

// ─ SMS 전송 ─
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

// ─ 정적 HTML 라우팅 ─
app.get('/', (req, res) => {
  res.sendFile(path.join(dirPath, '../public/index.html'));
});
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(dirPath, '../public/admin.html'));
});

// ─ 카드 삭제 ─
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

// ─ 서버 시작 ─
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
