const bcrypt = require('bcrypt');

const plainPassword = 'Masslo9191$'; // podmień na hasło do zahashowania
const saltRounds = 12; // "cost" - tyle ile w Twojej próbce

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
  if (err) throw err;
  console.log(hash);
});