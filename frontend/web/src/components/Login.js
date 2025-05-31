import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { login } from './auth';
import '../styles.css';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      console.log(`Tentando login com: identifier=${identifier}, password=${password}`);
      const response = await axios.post('http://localhost:5000/api/login', {
        identifier,
        password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Resposta do backend:', { token: response.data.token, isAdmin: response.data.isAdmin });
      login(response.data.token);
      navigate('/contracts');
    } catch (err) {
      console.error('Erro detalhado:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers,
      });
      if (err.response) {
        setError(`Erro ${err.response.status}: ${err.response.data?.error || 'Falha na autenticação'}`);
      } else if (err.request) {
        setError('Erro de rede: Não foi possível conectar ao servidor.');
      } else {
        setError('Erro inesperado: ' + err.message);
      }
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label>Identificador:</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Digite admin ou CPF/CNPJ"
            required
          />
        </div>
        <div className="form-group">
          <label>Senha:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
};

export default Login;