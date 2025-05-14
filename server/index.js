import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import Jimp from 'jimp';
import { PDFDocument } from 'pdf-lib';
import cors from 'cors';
import { sendSMS } from './sendSMS.js';

const app = express();
app.use(cors());
app.use(express.static('public'))
app.use('/cards', express.static('cards'));
app.use('/uploads', express.static('uploads'))


// Supabase 연결
const supabase = createClient(
  'https://ygruxkqxogcnlgtsrbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncnV4a3F4b2djbmxndHNyYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDk4MzMsImV4cCI6MjA2MjYyNTgzM30.WtH5W_nIjRi_gs_aGMWl5ehB2TndRVZqDXPqAWb3axw',
);

// ✅ multer 설정: 확장자 유지
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + ext;
    cb(null, name);
  }
});

const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// 유니크 수비력 생성
async function generateUniqueDefense() {
  while (true) {
    const candidate = Math.floor(Math.random() * 1000);
    const { data, error } = await supabase.from('submissions').select('defense').eq('defense', candidate);
    if (!error && data.length === 0) return candidate;
  }
}

app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const phone = req.body.phone;
    const image_url = req.file.path;

    const attack = Math.floor(Math.random() * 100) * 100;
    const defense = await generateUniqueDefense();

    console.log('📞 전화번호:', phone);
    console.log('📂 이미지 경로:', image_url);
    console.log('🛡️ 수비력:', defense);
    console.log('⚔️ 공격력:', attack);

    const { error: insertError } = await supabase
    .from('submissions')
    .insert([{ phone, attack, defense, image_url }]);

    if (insertError) {
        console.error('❌ Supabase insert 실패:', insertError);
        return res.status(500).json({ success: false, error: 'DB 저장 실패' });
    }


    try {
      await generateCard(image_url, attack, defense);
    } catch (imgErr) {
      console.error('🖼️ 이미지 처리 실패:', imgErr);
      return res.status(500).json({ success: false, error: 'Image processing failed' });
    }

    res.json({ success: true, defense });
  } catch (err) {
    console.error('❌ 업로드 실패:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ 관리자용 카드 리스트 API
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

// ✅ 문자 전송 API (예: Solapi 연동 시 구현 가능)
app.post('/sms', async (req, res) => {
  const { to, msg } = req.body;
  console.log(`📨 [SMS] to: ${to}, msg: ${msg}`);
  try {
    const data = await sendSMS(to, msg);
    res.json(data);
} catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

// app.get('/uploads', async (req, res) => {
//     const 
// });



app.listen(3000, () => console.log('✅ Server running on http://localhost:3000'));
