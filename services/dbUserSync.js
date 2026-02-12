const bcrypt = require('bcryptjs');
const db = require('../db/db_helper.js');
const { usersPath } = require('../config.js');
const path = require('path');
const csv = require('csvtojson');

async function updateClients() {
  if (process.env?.PRODUCTION === 'true' || process.env?.PRODUCTION) {
    await fixEncodingInDatabase();
  }
  const contractorsFileName = 'contractors.txt';
  const contractorsPath = path.join(usersPath, contractorsFileName);

  // Wczytanie pliku i parsowanie TSV na JSON
  const fileClientsObjRaw = await csv({ delimiter: '\t' }).fromFile(contractorsPath);

  // Zamiana oryginalnego parseClients na wersję działającą na JSON
  const fileClientsObj = parseClients(fileClientsObjRaw);

  const dbClientsObj = await db.getUsers();

  const diff = compareClients(fileClientsObj, dbClientsObj);

  if (Object.keys(diff.toAdd).length === 0) {
    console.log('Baza klientów aktualna');
  } else {
    await insertClients(diff.toAdd);
  }

  // Aktualizacja danych istniejących klientów
  if (diff.toUpdate && diff.toUpdate.length > 0) {

    await updateExistingClients(diff.toUpdate);
  } else {
  }

  // Usuwanie klientów, których nie ma w pliku
  if (diff.toRemove.length > 0) {

    await deleteNonExistingClients(diff.toRemove);
  } else {
  }

  // Aktualizacja haseł sekwencyjnie, aby uniknąć "Too many connections"
  // if(process.env.NODE_ENV === 'test'){
  if (false) {
    console.log('Rozpoczynam aktualizację haseł...');
    let updated = 0;
    let skipped = 0;

    for (const client of diff.fileClients) {
      if (client.password) {
        const user = dbClientsObj.find(dbClient => dbClient.ident === client.ident);
        if (user) {
          try {
            await db.updatePlain(user.ident, client.password);
            updated++;
            console.log(`[${updated}] Zaktualizowano hasło dla użytkownika ${client.ident}`);
          } catch (err) {
            console.error(`Błąd przy aktualizacji hasła dla ${client.ident}:`, err.message);
          }
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    console.log(`Zakończono aktualizację haseł. Zaktualizowano: ${updated}, Pominięto: ${skipped}`);
  }
}

function getClientKey(client) {
  // Dla bezpieczeństwa traktujemy oba pola, nawet jesli nie ma pin lub ident
  const pinPart = (client.pin || '').toUpperCase();
  const identPart = (client.ident || '').toUpperCase();
  return `${pinPart}|${identPart}`;
}



function compareClients(fileClients, dbClients) {

  const pinsInDb = new Set(dbClients.map(c => (c.pin || '').toUpperCase()));
  const identsInDb = new Set(dbClients.map(c => (c.ident || '').toUpperCase()));

  const toAdd = fileClients.filter(client => {
    const pin = (client.pin || '').toUpperCase();
    const ident = (client.ident || '').toUpperCase();
    return !pinsInDb.has(pin) && !identsInDb.has(ident);
  });

  const pinsInFile = new Set(fileClients.map(c => (c.pin || '').toUpperCase()));
  const identsInFile = new Set(fileClients.map(c => (c.ident || '').toUpperCase()));

  const toRemove = dbClients.filter(client => {
    const pin = (client.pin || '').toUpperCase();
    const ident = (client.ident || '').toUpperCase();
    return !pinsInFile.has(pin) && !identsInFile.has(ident);
  });

  // Sprawdź aktualizacje dla istniejących klientów
  const toUpdate = [];
  const fieldsToCheck = ['name', 'address', 'city', 'zip', 'taxid', 'phone','kraj'];

  for (const fileClient of fileClients) {
    const pin = (fileClient.pin || '').toUpperCase();
    const ident = (fileClient.ident || '').toUpperCase();

    // Znajdź klienta w bazie
    const dbClient = dbClients.find(c =>
      (c.pin || '').toUpperCase() === pin && (c.ident || '').toUpperCase() === ident
    );

    if (dbClient) {
      let needsUpdate = false;
      const changes = {};

      for (const field of fieldsToCheck) {
        const fileValue = (fileClient[field] || '').trim();
        const dbValue = (dbClient[field] || '').trim();

        if (fileValue !== dbValue) {
          needsUpdate = true;
          changes[field] = fileValue;
        }
      }

      if (needsUpdate) {
        toUpdate.push({
          pin: fileClient.pin,
          ident: fileClient.ident,
          changes
        });
      }
    }
  }

  return { toAdd, toRemove, toUpdate, fileClients };
}


function parseClients(inputArray) {
  const orgMap = {
    COZY: 1,
    FENIX: 2,
    HKL: 3,
    LUXAN_EWA_KRAWCZYK: 4,
    LUXANGMBH: 5,
    LUXANDE: 6,
  };

  const result = inputArray.map(obj => {

    const lowerObj = {};
    for (const key in obj) {
      lowerObj[key.toLowerCase()] = obj[key];
    }

    let owner = (lowerObj.owner || '').toUpperCase().replace(/\s+/g, '_');
    lowerObj.organization_id = orgMap[owner] || 3;

    delete lowerObj.owner;
    return lowerObj;
  });

  return result;
}

async function insertClients(clientsObj) {
  for (const client of clientsObj) {
    try {
      if (process.env.NODE_ENV != 'prod') {
        result = await db.insertUserIntousrtble(client.ident, client.pin, client.password);
      }
      const newUserId = await db.addUser(client);
    } catch (err) {
      console.error(`Błąd przy dodawaniu ${client.ident}:`, err.message);
    }
  }
}

async function updateExistingClients(clientsToUpdate) {
  const fieldMapping = {
    name: 'client_name',
    address: 'street',
    city: 'city',
    zip: 'zip',
    taxid: 'tax_id',
    phone: 'phone',
    kraj: 'country',
  };

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const clientUpdate of clientsToUpdate) {
    try {
      const { pin, ident, changes } = clientUpdate;
      const updateFields = [];
      const updateValues = [];

      // Mapuj pola z nazw w pliku na nazwy kolumn w bazie
      for (const [fileField, dbValue] of Object.entries(changes)) {
        const dbField = fieldMapping[fileField];
        if (dbField) {
          updateFields.push(`\`${dbField}\` = ?`);
          updateValues.push(dbValue);
        }
      }

      if (updateFields.length === 0) {
        skipped++;
        continue;
      }

      updateValues.push(pin);
      const sql = `UPDATE eform.\`user\` SET ${updateFields.join(', ')} WHERE pin = ?`;

      await db.updateQuery(sql, updateValues);
      updated++;
      // console.log(`[${updated}] Zaktualizowano klienta ${ident} (PIN: ${pin}). Zmiany: ${JSON.stringify(changes)}`);
    } catch (err) {
      failed++;
      console.error(`Błąd przy aktualizacji klienta ${clientUpdate.ident} (PIN: ${clientUpdate.pin}):`, err.message);
    }
  }
}

async function deleteNonExistingClients(clientsToDelete) {
  const excludedPins = new Set(['0000', 'admin', '000000']);

  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  for (const client of clientsToDelete) {
    const pin = (client.pin || '').toLowerCase();

    // Sprawdź czy pin jest wykluczony
    if (excludedPins.has(pin)) {
      skipped++;
      continue;
    }

    try {
      if (client.pin) {
        // Poczekaj chwilę między operacjami
        await new Promise(resolve => setTimeout(resolve, 100));

        await db.deleteUserByPin(client.pin);
        deleted++;
      } else {
        skipped++;
      }
    } catch (err) {
      failed++;
      console.error(`Błąd przy usuwaniu klienta ${client.ident} (PIN: ${client.pin}):`, err.message);
    }
  }


}

async function fixEncodingInDatabase() {


  const users = await db.getUsers();
  let fixed = 0;
  let skipped = 0;

  for (const user of users) {
    let needsUpdate = false;
    const updates = {};

    // Pola do sprawdzenia
    const fieldsToCheck = ['name', 'address', 'city', 'ident'];

    for (const field of fieldsToCheck) {
      if (user[field]) {
        let fixedValue = user[field];
        const originalValue = fixedValue; // Zapisz oryginał na początku

        // Sprawdź czy pole zawiera problematyczne znaki
        if (fixedValue.includes('�')) {

          try {
            const bytes = [];
            for (let i = 0; i < fixedValue.length; i++) {
              bytes.push(fixedValue.charCodeAt(i));
            }

            // Znajdź pozycje � (U+FFFD = 65533)
            const problematicIndexes = [];
            for (let i = 0; i < bytes.length; i++) {
              if (bytes[i] === 65533) {
                problematicIndexes.push(i);
              }
            }

            if (problematicIndexes.length > 0) {


              // W kontekście niemieckim, � często to ü, ö lub ä
              const chars = fixedValue.split('');
              for (const idx of problematicIndexes) {
                const before = idx > 0 ? chars[idx - 1].toLowerCase() : '';
                const after = idx < chars.length - 1 ? chars[idx + 1].toLowerCase() : '';

                // Heurystyka dla niemieckiego
                if (['h', 'r', 's', 'l', 'n'].includes(before)) {
                  chars[idx] = 'ü'; // H�hne -> Hühne, schl�ter -> schlüter
                } else if (before === 'h' && after === 'h') {
                  chars[idx] = 'ö'; // H�hne -> Höhne
                } else if (['b', 'k', 't', 'd', 'g'].includes(before)) {
                  chars[idx] = 'ö';
                } else {
                  chars[idx] = 'ü'; // domyślnie
                }
              }
              fixedValue = chars.join('');

            }
          } catch (err) {
            console.error(`  Błąd dekodowania:`, err.message);
          }
        }

        // Dodatkowe mapowania dla typowych błędów UTF-8/Latin1
        const encodingMap = {
          'Ã¶': 'ö', 'Ã¼': 'ü', 'Ã¤': 'ä',
          'Ã–': 'Ö', 'Ãœ': 'Ü', 'Ã„': 'Ä',
          'ÃŸ': 'ß', 'Ã©': 'é', 'Ã¨': 'è',
          'Ã¡': 'á', 'Ã ': 'à'
        };

        for (const [broken, correct] of Object.entries(encodingMap)) {
          if (fixedValue.includes(broken)) {
            fixedValue = fixedValue.replace(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);

          }
        }

        // Porównaj NA KOŃCU po wszystkich transformacjach
        if (fixedValue !== originalValue) {
          console.log(`  RÓŻNICA! Original: "${originalValue}" -> Fixed: "${fixedValue}"`);
          updates[field] = fixedValue;
          needsUpdate = true;
        }
      }
    }
    if (needsUpdate && user.id) {
      try {
        // Buduj SQL UPDATE dynamicznie
        let setClause = Object.keys(updates).map(field => `\`${field}\` = ?`).join(', ');
        const values = Object.values(updates);
        values.push(user.id);
        if (setClause == 'name') { setClause = 'client_name' };
        const sql = `UPDATE eform.\`user\` SET ${setClause} WHERE id = ?`;


        const result = await updateQuery(sql, values);

        fixed++;
      } catch (err) {
        console.error(`Błąd przy aktualizacji użytkownika ID ${user.id}:`, err.message);
        console.error(`  Stack:`, err.stack);
      }
    } else {
      skipped++;
    }
  }
}
module.exports = { updateClients, fixEncodingInDatabase, updateExistingClients };
