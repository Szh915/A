const fs = require('fs');
const http = require('http');

const BOUNDARY = '----TestBoundary' + Date.now();
const file1 = fs.readFileSync('./pdfly/uploads/test-a.pdf');
const file2 = fs.readFileSync('./pdfly/uploads/test-b.pdf');

function buildMultipart(files) {
  const chunks = [];
  files.forEach(({ name, data }) => {
    chunks.push(Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="files"; filename="${name}"\r\nContent-Type: application/pdf\r\n\r\n`));
    chunks.push(data);
    chunks.push(Buffer.from('\r\n'));
  });
  chunks.push(Buffer.from(`--${BOUNDARY}--\r\n`));
  return Buffer.concat(chunks);
}

const body = buildMultipart([
  { name: 'test-a.pdf', data: file1 },
  { name: 'test-b.pdf', data: file2 }
]);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/merge',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`,
    'Content-Length': body.length
  }
};

const req = http.request(options, (res) => {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const result = Buffer.concat(chunks);
    console.log('Status:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Size:', result.length, 'bytes');
    fs.writeFileSync('./pdfly/uploads/merged-test.pdf', result);
    console.log('Merged PDF saved OK');

    // Verify it's a valid PDF
    const pdfLib = require('./pdfly/node_modules/pdf-lib');
    pdfLib.PDFDocument.load(result).then(doc => {
      console.log('Merged page count:', doc.getPageCount());
      console.log('SUCCESS: Merge works correctly!');
    });
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
