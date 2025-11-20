import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './MainAppContent.tsx';
import '../index.css';
import { AuthProvider } from './AuthContext';

// IMPORTAÇÃO CRÍTICA: Inicializa o Firebase (efeito colateral)
import { auth } from './firebase/firebaseClient'; 

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Verifica se o Firebase Auth foi inicializado
if (!auth) {
    root.render(
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '20px', padding: '20px' }}>
            ERRO CRÍTICO: Falha ao carregar o Firebase.
        </div>
    );
} else {
    root.render(
      <React.StrictMode>
        {/* Passa a instância 'auth' para o AuthProvider */}
        <AuthProvider auth={auth}> 
          <App />
        </AuthProvider>
      </React.StrictMode>
    );
}