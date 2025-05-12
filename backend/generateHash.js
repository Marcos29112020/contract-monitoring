const bcrypt = require('bcrypt');

const password = '47152932YTH.'; // Substitua por sua senha desejada
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Erro ao gerar hash:', err);
  } else {
    console.log('Hash gerado:', hash);
  }
});