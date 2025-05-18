import Jimp from 'jimp';
import fs from 'fs';

// assets 폴더가 없으면 생성
if (!fs.existsSync('./assets')) {
  fs.mkdirSync('./assets');
}

async function createTemplate() {
  const image = new Jimp(500, 500, '#ffffff'); // 흰색 배경의 500x500 PNG 생성
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  image.print(font, 50, 220, ''); // 가운데에 텍스트 표시
  await image.writeAsync('./assets/template.png');
  console.log('✅ 템플릿 생성 완료: ./assets/template.png');
}

createTemplate().catch(err => console.error('❌ 템플릿 생성 실패:', err));
