const puppeteer = require('puppeteer-core');
const path = require('path');

async function main() {
  console.log('Connecting to Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

  const orderId = 'b6fc002f-5f42-40fd-a9b9-e60c4217a10d';
  const printUrl = `http://localhost:3000/orden/${orderId}/imprimir`;
  const portalUrl = `http://localhost:3000/orden/${orderId}`;

  console.log('Navigating to printable note:', printUrl);
  await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const pdfPath = path.resolve('public/orden-cova-1001.pdf');
  console.log('Generating PDF to:', pdfPath);
  await page.pdf({
    path: pdfPath,
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '8mm',
      bottom: '8mm',
      left: '8mm',
      right: '8mm'
    }
  });

  const pngPath = path.resolve('public/orden-cova-1001-preview.png');
  console.log('Generating full PNG preview to:', pngPath);
  await page.screenshot({
    path: pngPath,
    fullPage: true
  });

  console.log('Navigating to client portal:', portalUrl);
  await page.goto(portalUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const portalPngPath = path.resolve('public/orden-cova-portal-preview.png');
  console.log('Generating portal PNG preview to:', portalPngPath);
  await page.screenshot({
    path: portalPngPath,
    fullPage: false
  });

  await browser.close();
  console.log('ALL DONE! PDF and previews generated successfully.');
}

main().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
