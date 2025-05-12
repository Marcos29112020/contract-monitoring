import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Picker, Button, StyleSheet } from 'react-native';
import axios from 'axios';

const ContractForm = ({ selectedContract, onClear }) => {
  const [formData, setFormData] = useState({
    secretariat: 'Administração',
    contract_number: '',
    start_date: '',
    validity_type: 'years',
    validity_value: 1,
    description: '',
  });

  useEffect(() => {
    if (selectedContract) {
      setFormData({
        secretariat: selectedContract.secretariat,
        contract_number: selectedContract.contract_number,
        start_date: selectedContract.start_date.split('T')[0],
        validity_type: selectedContract.validity_type,
        validity_value: selectedContract.validity_value,
        description: selectedContract.description || '',
      });
    }
  }, [selectedContract]);

  const handleSubmit = async () => {
    try {
      if (selectedContract) {
        await axios.put(`http://localhost:5000/api/contracts/${selectedContract.id}`, formData);
        alert('Contrato atualizado com sucesso!');
      } else {
        await axios.post('http://localhost:5000/api/contracts', formData);
        alert('Contrato cadastrado com sucesso!');
      }
      setFormData({
        secretariat: 'Administração',
        contract_number: '',
        start_date: '',
        validity_type: 'years',
        validity_value: 1,
        description: '',
      });
      if (onClear) onClear();
    } catch (error) {
      alert('Erro: ' + error.response?.data?.error || error.message);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Secretaria:</Text>
      <Picker
        selectedValue={formData.secretariat}
        onValueChange={(value) => setFormData({ ...formData, secretariat: value })}
        style={styles.input}
      >
        <Picker.Item label="Administração" value="Administração" />
        <Picker.Item label="Educação" value="Educação" />
        <Picker.Item label="Saúde" value="Saúde" />
        <Picker.Item label="Assistência" value="Assistência" />
      </Picker>

      <Text style={styles.label}>Número do Contrato:</Text>
      <TextInput
        value={formData.contract_number}
        onChangeText={(text) => setFormData({ ...formData, contract_number: text })}
        style={styles.input}
      />

      <Text style={styles.label}>Data de Início:</Text>
      <TextInput
        value={formData.start_date}
        onChangeText={(text) => setFormData({ ...formData, start_date: text })}
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />

      <Text style={styles.label}>Tipo de Validade:</Text>
      <Picker
        selectedValue={formData.validity_type}
        onValueChange={(value) => setFormData({ ...formData, validity_type: value, validity_value: 1 })}
        style={styles.input}
      >
        <Picker.Item label="Anos" value="years" />
        <Picker.Item label="Meses" value="months" />
        <Picker.Item label="Dias" value="days" />
      </Picker>

      <Text style={styles.label}>Valor da Validade:</Text>
      <TextInput
        value={formData.validity_value.toString()}
        onChangeText={(text) => setFormData({ ...formData, validity_value: parseInt(text) || 1 })}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>Descrição:</Text>
      <TextInput
        value={formData.description}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
        multiline
        style={[styles.input, { height: 100 }]}
      />

      <Button title={selectedContract ? 'Atualizar' : 'Cadastrar'} onPress={handleSubmit} />
      {selectedContract && <Button title="Cancelar" onPress={onClear} />}
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    marginBottom: 20,
  },
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
});

export default ContractForm;