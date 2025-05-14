import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import Jimp from 'jimp';
import { PDFDocument } from 'pdf-lib';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { sendSMS } from './sendSMS.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 정적 파일 경로 설정
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/cards', express.static(path.join(__dirname, '../cards')));

// ✅ Supabase 연결
const supabase = createClient(
  'https://ygruxkqxogcnlgtsrbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncnV4a3F4b2djbmxndHNyYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDk4MzMsImV4cCI6MjA2MjYyNTgzM30.WtH5W_nIjRi_gs_aGMWl5ehB2TndRVZqDXPqAWb3axw'
);

// ✅ multer 설정
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// ✅ 유니크 수비력 생성
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

// ✅ 카드 이미지 생성 함수
async function generateCard(localPath, attack, defense) {
  const cardTemplate = await Jimp.read('./assets/template.png');
  const photo = await Jimp.read(localPath);
  photo.resize(260, 260);

  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  cardTemplate.composite(photo, 90, 120);
  cardTemplate.print(font, 60, 400, `공격력: ${attack}`);
  cardTemplate.print(font, 260, 400, `수비력: ${defense}`);

  const imagePath = `./cards/${defense}.png`;
  const pdfPath = `./cards/${defense}.pdf`;

  await cardTemplate.writeAsync(imagePath);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const imageBytes = fs.readFileSync(imagePath);
  const pngImage = await pdfDoc.embedPng(imageBytes);

  const { width, height } = pngImage.scale(1);
  page.setSize(width, height);
  page.drawImage(pngImage, { x: 0, y: 0, width, height });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(pdfPath, pdfBytes);

  return imagePath;
}

// ✅ 사용자 업로드 API
app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const phone = req.body.phone;
    const filename = req.file.filename;
    const image_url = `uploads/${filename}`; // ✅ 경로 수정 완료

    const attack = Math.floor(Math.random() * 100) * 100;
    const defense = await generateUniqueDefense();

    const { error: insertError } = await supabase
      .from('submissions')
      .insert([{ phone, attack, defense, image_url }]);

    if (insertError) {
      console.error('❌ Supabase insert 실패:', insertError);
      return res.status(500).json({ success: false, error: 'DB 저장 실패' });
    }

    await generateCard(path.join('uploads', filename), attack, defense);

    res.json({ success: true, defense });
  } catch (err) {
    console.error('❌ 업로드 실패:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ 관리자 카드 목록 API
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

// ✅ SMS 전송 API
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

// ✅ 정적 HTML 라우터 (선택 사항)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// ✅ 서버 시작
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
