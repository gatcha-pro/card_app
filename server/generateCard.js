import Jimp from 'jimp';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 모듈 dirname 설정
const __filename = fileURLToPath(import.meta.url);
const dirPath    = path.dirname(__filename);

// 템플릿 캐싱
let templateBase;
async function getTemplateBase() {
  if (!templateBase) {
    templateBase = await Jimp.read(path.join(dirPath, '../assets/template.png'));
  }
  return templateBase;
}

// 함수 내보내기
export async function generateCard(localPath, attack, defense) {
  const base     = await getTemplateBase();
  const template = base.clone();

  const photo = await Jimp.read(localPath);
  photo.resize(260, 260);

  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  template.composite(photo, 90, 120)
          .print(font, 60, 400,  `공격력: ${attack}`)
          .print(font, 260, 400, `수비력: ${defense}`);

  const imagePath = path.join(dirPath, '../cards', `${defense}.png`);
  await template.writeAsync(imagePath);

  // 참조 해제
  photo.bitmap = null;
  photo._originalMime = null;

  return imagePath;
}
