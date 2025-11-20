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

  return { toAdd, toRemove, fileClients };
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
      const newUserId = await db.addUser(client);
      console.log(`Dodano klienta ${client.ident} (ID: ${newUserId})`);
    } catch (err) {
      console.error(`Błąd przy dodawaniu ${client.ident}:`, err.message);
    }
  }
}

async function fixEncodingInDatabase() {
  console.log('Rozpoczynam naprawę kodowania w bazie danych...');

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
    console.log(needsUpdate ? '  Wymagana aktualizacja.' : '  Brak zmian wymaganych.', user.id);
    if (needsUpdate && user.id) {
      try {
        // Buduj SQL UPDATE dynamicznie
        let setClause = Object.keys(updates).map(field => `\`${field}\` = ?`).join(', ');
        const values = Object.values(updates);
        values.push(user.id);
        if (setClause == 'name') { setClause = 'client_name' };
        const sql = `UPDATE eform.\`user\` SET ${setClause} WHERE id = ?`;
        console.log(`  Wykonuję SQL:`, sql);
        console.log(`  Wartości:`, values);

        const result = await updateQuery(sql, values);
        console.log(`  Wynik UPDATE:`, result);

        fixed++;
        console.log(`[${fixed}] Naprawiono kodowanie dla użytkownika ID: ${user.id} (${user.ident})`);
        console.log(`  Zaktualizowane pola:`, updates);
      } catch (err) {
        console.error(`Błąd przy aktualizacji użytkownika ID ${user.id}:`, err.message);
        console.error(`  Stack:`, err.stack);
      }
    } else {
      skipped++;
    }
  }
  console.log(`Zakończono naprawę kodowania. Naprawiono: ${fixed}, Pominięto: ${skipped}`);
}
module.exports = { updateClients, fixEncodingInDatabase };
