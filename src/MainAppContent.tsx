import { useEffect, useState } from "react";
import { onAuthStateChanged, User, signInWithCustomToken, signInAnonymously } from "firebase/auth";
import { auth } from './firebase/firebaseClient'; 
import AuthForm from './AuthForm'; // Importa o componente de Login/Cadastro

declare const __app_id: string;
declare const __initial_auth_token: string;

export default function MainAppContent() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Variáveis lidas do ambiente do Vite
    const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

    useEffect(() => {
        const authInstance = auth; // Captura a instância (Auth | null)

        if (!authInstance) {
            setLoading(false);
            return;
        }

        async function handleAuth() {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    // Usa authInstance (corrigido para TS2345)
                    await signInWithCustomToken(authInstance, __initial_auth_token); 
                } else {
                    // Usa authInstance (corrigido para TS2345)
                    await signInAnonymously(authInstance); 
                }
            } catch (error) {
                console.error("Erro na autenticação inicial:", error);
            }
        }
        
        handleAuth(); 

        const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
          <div className="flex h-screen items-center justify-center bg-gray-50">
            <p className="text-xl text-blue-600 font-medium">Carregando...</p>
          </div>
        );
    }
    
    if (!auth) { 
        return (
            <div className="flex h-screen items-center justify-center bg-red-100 text-red-700 p-8">
                <p className="text-xl">
                    🔴 Falha na inicialização. Verifique as configurações do Firebase.
                </p>
            </div>
        );
    }
    
    const userId = user?.uid || 'Desconectado';
    const displayEmail = user?.email || (user?.isAnonymous ? 'Anônimo' : 'Convidado'); 

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
          <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg mt-10">
            {user ? (
              // Se o usuário está logado, mostra o painel
              <div>
                <h1 className="text-2xl font-bold mb-2 text-green-600">
                  Bem-vindo, {displayEmail}
                </h1>
                <p className="text-sm text-gray-500 mb-4">
                    ID do Usuário: <code className="bg-gray-100 p-1 rounded text-xs">{userId}</code>
                </p>
                <p className="mt-4 text-gray-700">O conteúdo principal do seu aplicativo irá aqui.</p>
              </div>
            ) : (
              // Se o usuário não está logado, mostra o formulário de autenticação
              <div className="text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Você não está logado</h1>
                <p className="mt-2 text-gray-600 mb-8">Por favor, faça login para acessar o conteúdo.</p>
                <AuthForm /> 
              </div>
            )}
          </div>
          <p className="text-center mt-4 text-xs text-gray-400">
              App ID: {appId}
          </p>
        </div>
    );
}