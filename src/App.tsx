import React from 'react';
import AuthForm from './AuthForm'; // Importa o formulário de login (Passo 3.1)
import MainAppContent from './MainAppContent'; // Importa o conteúdo principal (Passo 3.2)
import { useAuth } from './AuthContext'; // Importa o hook de autenticação (Passo 2)

// O componente App.tsx agora funciona como um Roteador de Autenticação
const App: React.FC = () => {
  const { user, loading } = useAuth(); // Obtém o estado do usuário e o status de carregamento

  if (loading) {
    // Exibe um loading screen enquanto o Firebase verifica o estado de autenticação
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-cyan-400 text-2xl">
        Verificando sessão...
      </div>
    );
  }

  if (user) {
    // Usuário logado: Mostra o conteúdo principal do aplicativo
    return <MainAppContent />;
  } else {
    // Usuário não logado: Mostra a tela de Login/Registro
    return <AuthForm />;
  }
};

export default App;