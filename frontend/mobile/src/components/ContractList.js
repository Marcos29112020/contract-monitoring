import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import axios from 'axios';

const ContractList = () => {
  const [contracts, setContracts] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/contracts', {
          params: { secretariat: filter || undefined },
        });
        setContracts(response.data);
      } catch (error) {
        console.error('Erro ao buscar contratos:', error);
      }
    };
    fetchContracts();
  }, [filter]);

  const handleEdit = (contract) => {
    setSelectedContract(contract);
  };

  const handleDelete = async (id) => {
    if (confirm('Deseja excluir este contrato?')) {
      try {
        await axios.delete(`http://localhost:5000/api/contracts/${id}`);
        setContracts(contracts.filter((contract) => contract.id !== id));
        alert('Contrato excluído com sucesso!');
      } catch (error) {
        alert('Erro ao excluir: ' + error.response?.data?.error || error.message);
      }
    }
  };

  const handleClear = () => {
    setSelectedContract(null);
  };

  return (
    <View>
      <Text style={styles.label}>Filtrar por Secretaria:</Text>
      <Picker
        selectedValue={filter}
        onValueChange={(value) => setFilter(value)}
        style={styles.input}
      >
        <Picker.Item label="Todas as Secretarias" value="" />
        <Picker.Item label="Administração" value="Administração" />
        <Picker.Item label="Educação" value="Educação" />
        <Picker.Item label="Saúde" value="Saúde" />
        <Picker.Item label="Assistência" value="Assistência" />
      </Picker>
      <ContractForm selectedContract={selectedContract} onClear={handleClear} />
      <FlatList
        data={contracts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.contractItem,
              {
                backgroundColor:
                  item.alert_status === 'red'
                    ? '#FF0000'
                    : item.alert_status === 'orange'
                    ? '#FFA500'
                    : '#FFFFFF',
              },
            ]}
          >
            <Text>Secretaria: {item.secretariat}</Text>
            <Text>Número: {item.contract_number}</Text>
            <Text>Início: {new Date(item.start_date).toLocaleDateString('pt-BR')}</Text>
            <Text>Vencimento: {new Date(item.end_date).toLocaleDateString('pt-BR')}</Text>
            <Text>Status: {item.alert_status}</Text>
            <View style={styles.buttons}>
              <Button title="Editar" onPress={() => handleEdit(item)} />
              <Button title="Excluir" onPress={() => handleDelete(item.id)} />
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  contractItem: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    borderRadius: 4,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});

export default ContractList;