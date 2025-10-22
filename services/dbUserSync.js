const bcrypt = require('bcryptjs');
const db = require('../db/db_helper.js');
const { usersPath } = require('../config.js');
const path = require('path');
const csv = require('csvtojson');

async function updateClients() {

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
    if (client.ident == 'frank') {
      console.log(client)
    }



    const pin = (client.pin || '').toUpperCase();
    const ident = (client.ident || '').toUpperCase();
    return !pinsInFile.has(pin) && !identsInFile.has(ident);
  });

  return { toAdd, toRemove };
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

async function updateClientIdent() {
  try {
    const mappingFilename = 'efor-update-contractors.txt'
    console.log('🔄 Rozpoczynam aktualizację identyfikatorów klientów...');

    const mappingPath = path.join(usersPath, mappingFilename);

    // Wczytaj plik z mapowaniem
    const mappingDataRaw = await csv({ delimiter: '\t' }).fromFile(mappingPath);

    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const mapping of mappingDataRaw) {
      const oldIdent = mapping.EFOR_IDENT?.trim();
      const newIdent = mapping.CURRENT_IDENT?.trim();

      if (!oldIdent || !newIdent) {
        console.warn(`⚠️ Pominięto niepełny rekord: ${JSON.stringify(mapping)}`);
        errorCount++;
        continue;
      }

      if (oldIdent === newIdent) {
        console.log(`ℹ️ Identyfikator ${oldIdent} jest już poprawny`);
        continue;
      }

      try {
        // Sprawdź czy klient o starym identyfikatorze istnieje w bazie
        const clientExists = await db.getUserByIdent(oldIdent);

        if (!clientExists) {
          console.warn(`❌ Nie znaleziono klienta o identyfikatorze: ${oldIdent}`);
          notFoundCount++;
          continue;
        }

        // Aktualizuj identyfikator w bazie
        await db.updateUserIdent(oldIdent, newIdent);
        console.log(`✅ Zaktualizowano: ${oldIdent} → ${newIdent}`);
        updatedCount++;

      } catch (updateError) {
        console.error(`❌ Błąd przy aktualizacji ${oldIdent} → ${newIdent}:`, updateError.message);
        errorCount++;
      }
    }

    console.log('📊 Podsumowanie aktualizacji identyfikatorów:');
    console.log(`   ✅ Zaktualizowano: ${updatedCount} klientów`);
    console.log(`   ❌ Nie znaleziono: ${notFoundCount} klientów`);
    console.log(`   ⚠️ Błędy: ${errorCount} rekordów`);
    console.log(`   📋 Łącznie przetworzono: ${mappingDataRaw.length} rekordów`);

  } catch (err) {
    console.error(`❌ Błąd przy aktualizacji identyfikatorów klientów:`, err.message);
    throw err;
  }
}

async function fixCharacterEncoding() {
  try {
    console.log('🔧 Rozpoczynam naprawę kodowania znaków w bazie danych...');

    // Mapowanie błędnych znaków na poprawne
    const encodingMap = {
      // Polskie znaki - najczęstsze błędne kodowania UTF-8
      'Ä…': 'ą', 'Ä„': 'Ą',
      'Ä‡': 'ć', 'Ä†': 'Ć',
      'Ä™': 'ę', 'Ä˜': 'Ę',
      'Å‚': 'ł', 'Å': 'Ł',
      'Åƒ': 'ń', 'Å„': 'Ń',
      'Ã³': 'ó', 'Ã"': 'Ó',
      'Å›': 'ś', 'Åš': 'Ś',
      'Åº': 'ź', 'Å¹': 'Ź',
      'Å¼': 'ż', 'Å»': 'Ż',

      // Niemieckie znaki
      'Ã¤': 'ä', 'Ã„': 'Ä',
      'Ã¶': 'ö', 'Ã–': 'Ö',
      'Ã¼': 'ü', 'Ãœ': 'Ü',
      'ÃŸ': 'ß',

      // Dla przykładu "H�hne" -> prawdopodobnie "Höhne"  
      'Ã¶': 'ö',
      'Ã¼': 'ü'
    };

    // Pobierz wszystkich użytkowników z bazy
    const allUsers = await db.getUsers();

    let updatedCount = 0;
    let errorCount = 0;
    let noChangesCount = 0;

    for (const user of allUsers) {
      try {
        let hasChanges = false;
        const updateData = {};

        // Sprawdź i napraw każde pole tekstowe
        const textFields = [
          { alias: 'ident', column: 'ident' },
          { alias: 'name', column: 'client_name' },
          { alias: 'address', column: 'street' },
          { alias: 'city', column: 'city' }
        ];

        for (const field of textFields) {
          if (user[field.alias] && typeof user[field.alias] === 'string') {
            let originalValue = user[field.alias];
            let fixedValue = originalValue;

            // Zastąp wszystkie błędne znaki
            for (const [badChar, goodChar] of Object.entries(encodingMap)) {
              fixedValue = fixedValue.replace(new RegExp(badChar, 'g'), goodChar);
            }

            // Usuń znaki � (replacement character)
            fixedValue = fixedValue.replace(/�/g, 'ö'); // Dla H�hne -> Höhne

            // Jeśli wartość się zmieniła, dodaj do aktualizacji
            if (fixedValue !== originalValue) {
              updateData[field.column] = fixedValue; // Używaj prawdziwej nazwy kolumny
              hasChanges = true;
              console.log(`🔄 ${user.ident || user.id}: ${field.alias} "${originalValue}" → "${fixedValue}"`);
            }
          }
        }

        // Aktualizuj rekord jeśli są zmiany
        if (hasChanges) {
          await db.updateUserById(user.id, updateData);
          updatedCount++;
        } else {
          noChangesCount++;
        }

      } catch (updateError) {
        console.error(`❌ Błąd przy naprawie kodowania dla użytkownika ID ${user.id}:`, updateError.message);
        errorCount++;
      }
    }

    console.log('📊 Podsumowanie naprawy kodowania:');
    console.log(`   ✅ Naprawiono: ${updatedCount} użytkowników`);
    console.log(`   ✓ Bez zmian: ${noChangesCount} użytkowników`);
    console.log(`   ❌ Błędy: ${errorCount} użytkowników`);
    console.log(`   📋 Łącznie sprawdzono: ${allUsers.length} użytkowników`);

  } catch (err) {
    console.error(`❌ Błąd podczas naprawy kodowania:`, err.message);
    throw err;
  }
}

async function updateUserOrganizations() {
  try {
    console.log('🏢 Rozpoczynam aktualizację przypisań do organizacji...');

    const contractorsFileName = 'contractors.txt';
    const contractorsPath = path.join(usersPath, contractorsFileName);

    // Wczytanie pliku i parsowanie TSV na JSON
    const fileClientsObjRaw = await csv({ delimiter: '\t' }).fromFile(contractorsPath);

    // Parsowanie organizacji z pliku
    const fileClientsObj = parseClients(fileClientsObjRaw);

    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    let noChangesCount = 0;

    for (const fileClient of fileClientsObj) {
      try {
        const ident = fileClient.ident?.trim();

        if (!ident) {
          console.warn(`⚠️ Pominięto rekord bez identyfikatora: ${JSON.stringify(fileClient)}`);
          errorCount++;
          continue;
        }

        // Znajdź użytkownika w bazie po ident
        const dbUser = await db.getUserByIdent(ident);

        if (!dbUser) {
          console.warn(`❌ Nie znaleziono użytkownika o identyfikatorze: ${ident}`);
          notFoundCount++;
          continue;
        }

        // Sprawdź czy organization_id się różni
        const newOrganizationId = fileClient.organization_id || 3; // Domyślnie 3 jeśli pusto
        const currentOrganizationId = dbUser.organization_id;

        if (currentOrganizationId === newOrganizationId) {
          console.log(`ℹ️ ${ident}: organizacja już poprawna (${newOrganizationId})`);
          noChangesCount++;
          continue;
        }

        // Aktualizuj organization_id
        await db.updateUserOrganization(ident, newOrganizationId);

        console.log(`✅ ${ident}: organizacja ${currentOrganizationId} → ${newOrganizationId}`);
        updatedCount++;

      } catch (updateError) {
        console.error(`❌ Błąd przy aktualizacji organizacji dla ${fileClient.ident}:`, updateError.message);
        errorCount++;
      }
    }

    console.log('📊 Podsumowanie aktualizacji organizacji:');
    console.log(`   ✅ Zaktualizowano: ${updatedCount} użytkowników`);
    console.log(`   ✓ Bez zmian: ${noChangesCount} użytkowników`);
    console.log(`   ❌ Nie znaleziono: ${notFoundCount} użytkowników`);
    console.log(`   ⚠️ Błędy: ${errorCount} rekordów`);
    console.log(`   📋 Łącznie przetworzono: ${fileClientsObj.length} rekordów`);

  } catch (err) {
    console.error(`❌ Błąd podczas aktualizacji organizacji:`, err.message);
    throw err;
  }
}

module.exports = { updateClients, updateClientIdent, fixCharacterEncoding, updateUserOrganizations };