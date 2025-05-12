import React from 'react';
import { createBrowserRouter, RouterProvider, redirect } from 'react-router-dom';
import ContractList from './components/ContractList';
import ContractForm from './components/ContractForm';
import Login from './components/Login';
import { isAuthenticated } from './components/auth';
import './styles.css';

const requireAuth = () => {
  if (!isAuthenticated()) {
    return redirect('/login');
  }
  return null;
};

const router = createBrowserRouter([
  {
    path: '/',
    loader: () => (isAuthenticated() ? redirect('/contracts') : redirect('/login')),
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/contracts',
    element: <ContractList />,
    loader: requireAuth,
  },
  {
    path: '/contracts/new',
    element: <ContractForm />,
    loader: requireAuth,
  },
  {
    path: '/contracts/edit/:id',
    element: <ContractForm />,
    loader: requireAuth,
  },
]);

function App() {
  return (
    <div className="app-container">
      <h1>Monitoramento de Contrato</h1>
      <RouterProvider router={router} />
    </div>
  );
}

export default App;