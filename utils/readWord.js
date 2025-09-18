const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

async function readWord(type, file) {
  try {
    const filePath = path.resolve(__dirname, '..', 'files', type, `${file}.docx`);
    const data = await fs.readFile(filePath);
    const result = await mammoth.convertToHtml({ buffer: data });
    return result.value; 
  } catch (err) {
    console.error(err);
    throw err; 
  }
}
module.exports = {readWord}