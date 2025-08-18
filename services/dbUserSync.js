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

module.exports = { updateClients };
