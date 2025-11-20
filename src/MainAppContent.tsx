import { useEffect, useState } from "react";
import { onAuthStateChanged, User, signInWithCustomToken, signInAnonymously } from "firebase/auth";
import { auth } from './firebase/firebaseClient'; 

declare const __app_id: string;
declare const __initial_auth_token: string;

export default function MainAppContent() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const authInstance = auth; // Captura a instância (Auth | null)

        if (!authInstance) {
            setLoading(false);
            return;
        }

        // Simplificação: handleAuth não recebe argumentos e usa a variável local authInstance.
        async function handleAuth() {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(authInstance, __initial_auth_token); 
                } else {
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
    
    // Este código deve ser executado no navegador após o build.
    if (!auth) { 
        return (
            <div className="flex h-screen items-center justify-center bg-red-100 text-red-700 p-8">
                <p className="text-xl">
                    🔴 Falha na inicialização. Verifique as configurações do Firebase.
                </p>
            </div>
        );
    }
    
    const appId = import.meta.env.VITE_APP_ID || 'default-app-id';
    const userId = user?.uid || 'Desconectado';
    const displayEmail = user?.email || (user?.isAnonymous ? 'Anônimo' : 'Convidado'); 

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
          <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-lg">
            {user ? (
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
              <div>
                <h1 className="text-2xl font-bold text-red-600">Você não está logado</h1>
                <p className="mt-2 text-gray-600">Por favor, faça login para acessar o conteúdo.</p>
              </div>
            )}
          </div>
          <p className="text-center mt-4 text-xs text-gray-400">
              App ID: {appId}
          </p>
        </div>
    );
}