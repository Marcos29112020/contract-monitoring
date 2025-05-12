import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { getToken } from './auth';
import '../styles.css';

const ContractForm = () => {
  const [formData, setFormData] = useState({
    secretariat: 'Administração',
    contract_number: '',
    start_date: '',
    validity_type: 'years',
    quantity: 1,
    description: '',
    process_type: 'Adesão',
  });
  const [selectedContract, setSelectedContract] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Novo estado para carregamento
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchContract = async () => {
      if (id) {
        setIsLoading(true); // Ativar o spinner
        try {
          const token = getToken();
          if (!token) {
            navigate('/login');
            return;
          }
          const response = await axios.get(`http://192.168.1.110:5000/api/contracts/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSelectedContract(response.data);
        } catch (error) {
          console.error('Erro ao buscar contrato:', error.response?.data || error.message);
          if (error.response?.status === 401) {
            alert('Sessão expirada. Faça login novamente.');
            navigate('/login');
          } else if (error.response?.status === 404) {
            alert('Contrato não encontrado.');
            navigate('/contracts');
          } else {
            alert('Erro ao carregar contrato: ' + (error.response?.data?.error || error.message));
            navigate('/contracts');
          }
        } finally {
          setIsLoading(false); // Desativar o spinner
        }
      }
    };
    fetchContract();
  }, [id, navigate]);

  useEffect(() => {
    if (selectedContract) {
      setFormData({
        secretariat: selectedContract.secretariat || 'Administração',
        contract_number: selectedContract.contract_number || '',
        start_date: selectedContract.start_date ? selectedContract.start_date.split('T')[0] : '',
        validity_type: selectedContract.validity_type || 'years',
        quantity: selectedContract.validity_value || 1,
        description: selectedContract.description || '',
        process_type: selectedContract.process_type || 'Adesão',
      });
    } else {
      setFormData({
        secretariat: 'Administração',
        contract_number: '',
        start_date: '',
        validity_type: 'years',
        quantity: 1,
        description: '',
        process_type: 'Adesão',
      });
    }
  }, [selectedContract]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('FormData antes de enviar:', formData);
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        alert('Erro: Token não encontrado. Faça login novamente.');
        return;
      }

      const payload = {
        secretariat: formData.secretariat,
        contract_number: formData.contract_number.trim(),
        start_date: formData.start_date,
        validity_type: formData.validity_type,
        validity_value: Number(formData.quantity) || 1,
        description: formData.description || '',
        process_type: formData.process_type,
      };

      console.log('Payload enviado:', payload);
      console.log('Token usado:', token);

      let response;
      if (selectedContract) {
        response = await axios.put(
          `http://192.168.1.110:5000/api/contracts/${selectedContract.id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        alert('Contrato atualizado com sucesso!');
      } else {
        response = await axios.post('http://192.168.1.110:5000/api/contracts', payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        alert('Contrato cadastrado com sucesso!');
      }

      setFormData({
        secretariat: 'Administração',
        contract_number: '',
        start_date: '',
        validity_type: 'years',
        quantity: 1,
        description: '',
        process_type: 'Adesão',
      });

      navigate('/contracts');
    } catch (error) {
      console.error('Erro ao enviar formulário:', error.response?.data || error.message);
      alert('Erro: ' + (error.response?.data?.error || error.message));
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleCancel = () => {
    navigate('/contracts');
  };

  return (
    <div className="form-container">
      {isLoading ? (
        <div className="spinner">Carregando...</div>
      ) : (
        <form onSubmit={handleSubmit} className="contract-form">
          <h3>{selectedContract ? 'Editar Contrato' : 'Cadastrar Contrato'}</h3>
          <div className="form-group">
            <label>Tipo de Processo:</label>
            <select name="process_type" value={formData.process_type} onChange={handleChange} required>
              <option value="Adesão">Adesão</option>
              <option value="Concorrência Eletrônica">Concorrência Eletrônica</option>
              <option value="Dispensa Eletrônica">Dispensa Eletrônica</option>
              <option value="Inexigibilidade">Inexigibilidade</option>
              <option value="Pregão Eletrônico">Pregão Eletrônico</option>
            </select>
          </div>
          <div className="form-group">
            <label>Secretaria:</label>
            <select name="secretariat" value={formData.secretariat} onChange={handleChange} required>
              <option value="Administração">Administração</option>
              <option value="Educação">Educação</option>
              <option value="Saúde">Saúde</option>
              <option value="Assistência">Assistência</option>
            </select>
          </div>
          <div className="form-group">
            <label>Número do Contrato:</label>
            <input
              type="text"
              name="contract_number"
              value={formData.contract_number}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Data da Assinatura:</label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Tipo de Validade:</label>
            <select name="validity_type" value={formData.validity_type} onChange={handleChange} required>
              <option value="years">Anos</option>
              <option value="months">Meses</option>
              <option value="days">Dias</option>
            </select>
          </div>
          <div className="form-group">
            <label>Quantidade:</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min={1}
              required
            />
          </div>
          <div className="form-group">
            <label>Descrição:</label>
            <textarea name="description" value={formData.description} onChange={handleChange} />
          </div>
          <div className="form-buttons">
            <button type="submit">{selectedContract ? 'Atualizar' : 'Cadastrar'}</button>
            <button type="button" onClick={handleCancel}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ContractForm;