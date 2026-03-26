const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { log } = require('../utils/logging');


function getFileMeta(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime.getTime(),
    };
  } catch (err) {
    log('Błąd odczytu metadanych:', err);
    return null;
  }
}

function getPreviousMeta(versionFile) {
  if (!fs.existsSync(versionFile)) return null;
  try {
    const content = fs.readFileSync(versionFile, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    log('Błąd odczytu .version.txt:', err);
    return null;
  }
}

function onFileChanged(dir) {

  exec(`excelToJson -i ${dir}/jezyki.xlsx -o ${dir}`, (error, stdout, stderr) => {
    log(stdout)
    if (error) {
      log(`Błąd excelToJson: ${error.message}`);
      return;
    }
    if (stderr) {
      log(stdout)
      log(`excelToJson stderr: ${stderr}`);
    }
    log(`excelToJson stdout: ${stdout}`);
  });
}

function jsonToExcel(dir) {
  
  exec(`jsonToExcel -i ${dir} -o ${dir}/jezyki.xlsx`, (error, stdout, stderr) => {
    if (error) {
      log(`Błąd jsonToExcel: ${error.message}`);
      return;
    }
    if (stderr) {
      log(`jsonToExcel stderr: ${stderr}`);
    }
    log(`jsonToExcel stdout: ${stdout}`);
  });
}

function checkTranslateLegacy(dir) {

  const excelPath = path.join(dir, 'jezyki.xlsx');
  const versionFile = (dir, '.version.txt');

  const currentMeta = getFileMeta(excelPath);
  if (!currentMeta) process.exit(1);

  const previousMeta = getPreviousMeta(versionFile);

  const hasChanged =
    !previousMeta ||
    currentMeta.size !== previousMeta.size ||
    currentMeta.mtime !== previousMeta.mtime;

  if (hasChanged) {
    onFileChanged(dir);

    fs.writeFileSync(versionFile, JSON.stringify(currentMeta), 'utf-8');
    log('Zmieniono plik, zaktualizowano .version.txt');
  } else {
    log('Brak zmian w pliku.');
   
  }
}

module.exports = { checkTranslateLegacy }
