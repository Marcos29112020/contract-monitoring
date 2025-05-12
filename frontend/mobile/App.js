import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ContractForm from './src/components/ContractForm';
import ContractList from './src/components/ContractList';

const App = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monitoramento de Contratos</Text>
      <ContractForm />
      <ContractList />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default App;