import fs from 'fs';
import Jimp from 'jimp';
import { PDFDocument } from 'pdf-lib';
import { fileTypeFromFile } from 'file-type';

export async function generateCard(localPath, attack, defense) {
  const cardTemplate = await Jimp.read('./assets/template.png');

  const buffer = fs.readFileSync(localPath);
  const type = await fileTypeFromFile(localPath);
  if (!type) {
    throw new Error('❌ 이미지 MIME 타입 판별 실패');
  }

  const photo = await Jimp.read(buffer); // 버퍼 직접 전달
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
