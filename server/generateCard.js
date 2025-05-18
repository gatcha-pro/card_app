// generateCard.js
import Jimp from 'jimp';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const dirPath    = path.dirname(__filename);

// 템플릿 캐싱
let templateBase;
async function getTemplateBase() {
  if (!templateBase) {
    // 해상도를 낮춰서 메모리 절약
    templateBase = await Jimp.read(
      path.join(dirPath, '../assets/template.png')
    );
    templateBase.resize(300, 420); // 예시: 300×420px로 축소
  }
  return templateBase;
}

export async function generateCard(localPath, attack, defense) {
  const base     = await getTemplateBase();
  const template = base.clone();

  const photo = await Jimp.read(localPath);
  photo.resize(200, 200);  // 축소

  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
  template.composite(photo, 50, 60)
          .print(font, 20, 300,  `공격력: ${attack}`)
          .print(font, 160, 300, `수비력: ${defense}`);

  const imagePath = path.join(dirPath, '../cards', `${defense}.png`);
  await template.writeAsync(imagePath);

  // 명시적 해제
  photo.bitmap = null;
  photo._originalMime = null;
  template.bitmap = null;
  template._originalMime = null;

  return imagePath;
}
