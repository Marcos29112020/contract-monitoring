const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('./db/database');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Middleware para limitar tentativas de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo de 5 tentativas
  message: 'Muitas tentativas de login. Tente novamente após 15 minutos.',
});

// Middleware para verificar JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar se é administrador
const isAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
};

// Função para validar CNPJ/CPF
const validateIdentifier = (identifier) => {
  identifier = identifier.replace(/[^\d]/g, '');
  if (identifier.length === 11) {
    return identifier.match(/^\d{11}$/) && !/^(\d)\1+$/.test(identifier);
  } else if (identifier.length === 14) {
    return identifier.match(/^\d{14}$/) && !/^(\d)\1+$/.test(identifier);
  }
  return false;
};

// Registro de usuário
app.post('/api/register', async (req, res) => {
  const { identifier, password, email, phone, isAdmin } = req.body;
  if (!identifier || !password || !email || !phone) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }
  if (!isAdmin && !validateIdentifier(identifier)) {
    return res.status(400).json({ error: 'CNPJ ou CPF inválido' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run(
      'INSERT INTO users (identifier, password, email, phone, isAdmin) VALUES (?, ?, ?, ?, ?)',
      [identifier, hashedPassword, email, phone, isAdmin || 0]
    );
    res.status(201).json({ message: 'Usuário registrado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/login', loginLimiter, async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }
  try {
    const user = await db.get('SELECT * FROM users WHERE identifier = ?', [identifier]);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    const token = jwt.sign(
      { id: user.id, identifier: user.identifier, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token, isAdmin: user.isAdmin });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recuperação de senha
app.post('/api/forgot-password', async (req, res) => {
  const { identifier, method } = req.body;
  if (!identifier || !['email', 'phone'].includes(method)) {
    return res.status(400).json({ error: 'Identificador ou método inválido' });
  }
  try {
    const user = await db.get('SELECT * FROM users WHERE identifier = ?', [identifier]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const token = Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await db.run(
      'INSERT INTO reset_tokens (userId, token, expiresAt) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );
    console.log(`Enviando token ${token} para ${method === 'email' ? user.email : user.phone}`);
    res.json({ message: `Código de recuperação enviado para ${method === 'email' ? 'e-mail' : 'telefone'}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redefinir senha
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }
  try {
    const resetToken = await db.get(
      'SELECT * FROM reset_tokens WHERE token = ? AND expiresAt > ?',
      [token, new Date().toISOString()]
    );
    if (!resetToken) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetToken.userId]);
    await db.run('DELETE FROM reset_tokens WHERE token = ?', [token]);
    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar usuários (apenas admin)
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await db.all('SELECT id, identifier, email, phone, isAdmin FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redefinir senha de usuário (apenas admin)
app.put('/api/users/:id/reset-password', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: 'Nova senha obrigatória' });
  }
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
    res.json({ message: 'Senha do usuário redefinida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoints de contratos (protegidos)
app.get('/api/contracts', authenticateToken, async (req, res) => {
  try {
    const { secretariat } = req.query;
    let query = 'SELECT * FROM contracts';
    const params = [];
    if (secretariat) {
      query += ' WHERE secretariat = ?';
      params.push(secretariat);
    }
    const contracts = await db.all(query, params);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const updatedContracts = contracts.map((contract) => {
      const endDate = new Date(contract.end_date);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let alert_status = 'green';
      if (diffDays <= 30) alert_status = 'red';
      else if (diffDays <= 90) alert_status = 'orange';
      return { ...contract, alert_status };
    });
    res.json(updatedContracts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Obter um contrato específico por ID
app.get('/api/contracts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', [id]);
    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(contract.end_date);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let alert_status = 'green';
    if (diffDays <= 30) alert_status = 'red';
    else if (diffDays <= 90) alert_status = 'orange';
    res.json({ ...contract, alert_status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/contracts', authenticateToken, async (req, res) => {
  const { secretariat, contract_number, start_date, validity_type, validity_value, description, process_type } = req.body;
  if (!secretariat || !contract_number || !start_date || !validity_type || !validity_value || !process_type) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }
  const validProcessTypes = ['Adesão', 'Concorrência Eletrônica', 'Dispensa Eletrônica', 'Inexigibilidade', 'Pregão Eletrônico'];
  if (!validProcessTypes.includes(process_type)) {
    return res.status(400).json({ error: 'Tipo de processo inválido' });
  }
  const countResult = await db.get('SELECT COUNT(*) as count FROM contracts WHERE process_type = ?', [process_type]);
  if (countResult.count >= 99) {
    return res.status(400).json({ error: `Limite de 99 cadastros para ${process_type} atingido` });
  }
  let end_date;
  const start = new Date(start_date);
  if (validity_type === 'years') {
    end_date = new Date(start);
    end_date.setFullYear(start.getFullYear() + validity_value);
  } else if (validity_type === 'months') {
    end_date = new Date(start);
    end_date.setMonth(start.getMonth() + validity_value);
  } else if (validity_type === 'days') {
    end_date = new Date(start);
    end_date.setDate(start.getDate() + validity_value);
  } else {
    return res.status(400).json({ error: 'Tipo de validade inválido' });
  }
  end_date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = end_date - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  let alert_status = 'green';
  if (diffDays <= 30) alert_status = 'red';
  else if (diffDays <= 90) alert_status = 'orange';
  try {
    const result = await db.run(
      `INSERT INTO contracts (secretariat, contract_number, start_date, validity_type, validity_value, description, end_date, alert_status, process_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [secretariat, contract_number, start_date, validity_type, validity_value, description || '', end_date.toISOString(), alert_status, process_type]
    );
    const newContract = {
      id: result.lastID,
      secretariat,
      contract_number,
      start_date,
      validity_type,
      validity_value,
      description: description || '',
      end_date: end_date.toISOString(),
      alert_status,
      process_type,
    };
    res.status(201).json(newContract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/contracts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { secretariat, contract_number, start_date, validity_type, validity_value, description, process_type } = req.body;
  if (!secretariat || !contract_number || !start_date || !validity_type || !validity_value || !process_type) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }
  const validProcessTypes = ['Adesão', 'Concorrência Eletrônica', 'Dispensa Eletrônica', 'Inexigibilidade', 'Pregão Eletrônico'];
  if (!validProcessTypes.includes(process_type)) {
    return res.status(400).json({ error: 'Tipo de processo inválido' });
  }
  const countResult = await db.get(
    'SELECT COUNT(*) as count FROM contracts WHERE process_type = ? AND id != ?',
    [process_type, id]
  );
  if (countResult.count >= 99) {
    return res.status(400).json({ error: `Limite de 99 cadastros para ${process_type} atingido` });
  }
  let end_date;
  const start = new Date(start_date);
  if (validity_type === 'years') {
    end_date = new Date(start);
    end_date.setFullYear(start.getFullYear() + validity_value);
  } else if (validity_type === 'months') {
    end_date = new Date(start);
    end_date.setMonth(start.getMonth() + validity_value);
  } else if (validity_type === 'days') {
    end_date = new Date(start);
    end_date.setDate(start.getDate() + validity_value);
  } else {
    return res.status(400).json({ error: 'Tipo de validade inválido' });
  }
  end_date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = end_date - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  let alert_status = 'green';
  if (diffDays <= 30) alert_status = 'red';
  else if (diffDays <= 90) alert_status = 'orange';
  try {
    await db.run(
      `UPDATE contracts SET secretariat = ?, contract_number = ?, start_date = ?, validity_type = ?, validity_value = ?, description = ?, end_date = ?, alert_status = ?, process_type = ?
       WHERE id = ?`,
      [secretariat, contract_number, start_date, validity_type, validity_value, description || '', end_date.toISOString(), alert_status, process_type, id]
    );
    const updatedContract = {
      id: parseInt(id),
      secretariat,
      contract_number,
      start_date,
      validity_type,
      validity_value,
      description: description || '',
      end_date: end_date.toISOString(),
      alert_status,
      process_type,
    };
    res.json(updatedContract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/contracts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM contracts WHERE id = ?', [id]);
    res.json({ message: 'Contrato excluído' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Função para criar usuário admin (execute uma vez)
const createAdminUser = async () => {
  try {
    const identifier = 'admin';
    const password = '123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const email = 'admin@example.com';
    const phone = '1234567890';
    const userExists = await db.get('SELECT * FROM users WHERE identifier = ?', [identifier]);
    if (!userExists) {
      await db.run(
        'INSERT INTO users (identifier, password, email, phone, isAdmin) VALUES (?, ?, ?, ?, ?)',
        [identifier, hashedPassword, email, phone, 1]
      );
      console.log('Usuário admin criado com sucesso');
    } else {
      console.log('Usuário admin já existe');
    }
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
  }
};

// Executar criação do usuário admin
createAdminUser();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));