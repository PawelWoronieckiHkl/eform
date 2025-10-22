const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');


function getFileMeta(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime.getTime(),
    };
  } catch (err) {
    console.error('Błąd odczytu metadanych:', err);
    return null;
  }
}

function getPreviousMeta(versionFile) {
  if (!fs.existsSync(versionFile)) return null;
  try {
    const content = fs.readFileSync(versionFile, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Błąd odczytu .version.txt:', err);
    return null;
  }
}

function onFileChanged(dir) {

  exec(`excelToJson -i ${dir}/jezyki.xlsx -o ${dir}`, (error, stdout, stderr) => {
    console.log(stdout)
    if (error) {
      console.error(`Błąd excelToJson: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(stdout)
      console.error(`excelToJson stderr: ${stderr}`);
    }
    console.log(`excelToJson stdout: ${stdout}`);
  });
}

function jsonToExcel(dir) {
  
  exec(`jsonToExcel -i ${dir} -o ${dir}/jezyki.xlsx`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Błąd jsonToExcel: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`jsonToExcel stderr: ${stderr}`);
    }
    console.log(`jsonToExcel stdout: ${stdout}`);
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
    console.log('Zmieniono plik, zaktualizowano .version.txt');
  } else {
    console.log('Brak zmian w pliku.');
   
  }
}

module.exports = { checkTranslateLegacy }
