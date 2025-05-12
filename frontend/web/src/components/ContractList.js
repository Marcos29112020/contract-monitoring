import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, logout } from './auth';
import '../styles.css';

const ContractList = () => {
  const [contracts, setContracts] = useState([]);
  const [secretariat, setSecretariat] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const fetchContracts = async () => {
      try {
        const secretariatValue = secretariat.trim();
        console.log('Filtrando contratos com secretariat:', secretariatValue || 'nenhum');
        const response = await axios.get('http://192.168.1.110:5000/api/contracts', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          params: secretariatValue ? { secretariat: secretariatValue } : {},
        });
        console.log('Resposta bruta do backend:', JSON.stringify(response.data, null, 2));
        console.log('Resposta formatada (contratos):', JSON.stringify({
          count: response.data.length,
          contracts: response.data.map(c => ({
            id: c.id,
            secretariat: c.secretariat,
            contract_number: c.contract_number,
            alert_status: c.alert_status,
          })),
        }, null, 2));
        setContracts(response.data);
        setError('');
      } catch (err) {
        console.error('Erro ao carregar contratos:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        setContracts([]);
        setError(err.response?.data?.error || 'Erro ao carregar contratos');
        if (err.response?.status === 401) {
          logout();
          navigate('/login');
        }
      }
    };

    fetchContracts();
  }, [navigate, secretariat]);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este contrato?')) {
      try {
        await axios.delete(`http://192.168.1.110:5000/api/contracts/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setContracts(contracts.filter((contract) => contract.id !== id));
      } catch (err) {
        console.error('Erro ao excluir contrato:', err.response?.data || err.message);
        alert('Erro ao excluir contrato');
      }
    }
  };

  return (
    <div className="list-container">
      <h2>Lista de Contratos</h2>
      <div className="filter-container">
        <Link to="/contracts/new" className="new-contract-button">
          Novo Contrato
        </Link>
        <div className="filter-input-group">
          <label>Filtrar por Secretaria:</label>
          <input
            type="text"
            placeholder="Digite a secretaria (ex.: Administração)"
            value={secretariat}
            onChange={(e) => setSecretariat(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>
      {error && <p className="error-message">{error}</p>}
      <table className="contract-table">
        <thead>
          <tr>
            <th>Secretaria</th>
            <th>Nº do Contrato</th>
            <th>Data de Início</th>
            <th>Data de Término</th>
            <th>Descrição</th>
            <th>Tipo de Processo</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {contracts.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center' }}>
                Nenhum contrato encontrado
              </td>
            </tr>
          ) : (
            contracts.map((contract) => (
              <tr key={contract.id} className={`alert-${contract.alert_status}`}>
                <td>{contract.secretariat}</td>
                <td>{contract.contract_number}</td>
                <td>{new Date(contract.start_date).toLocaleDateString()}</td>
                <td>{new Date(contract.end_date).toLocaleDateString()}</td>
                <td>{contract.description}</td>
                <td>{contract.process_type}</td>
                <td>
                  <button
                    onClick={() => navigate(`/contracts/edit/${contract.id}`)}
                    className="edit-button"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(contract.id)}
                    className="delete-button"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="logout-container">
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="logout-button"
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default ContractList;