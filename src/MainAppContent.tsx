import { useEffect, useState, useMemo } from "react";
import { onAuthStateChanged, User, signInWithCustomToken, signInAnonymously, signOut } from "firebase/auth";
import { auth } from './firebase/firebaseClient'; 
import AuthForm from './AuthForm'; 
import { Player, Match } from '../types'; 
import useFirestoreData from './useFirestoreData'; 

// --- DUMMY CRUD FUNCTIONS (Assumes they will be implemented elsewhere) ---
// These are placeholders to satisfy PlayerManager and MatchRegistry props, 
// which were causing the TS2339 errors because they weren't exported from useFirestoreData.

const placeholderAddPlayer = (player: Omit<Player, 'id'>) => console.log("ADD PLAYER: Not implemented here.", player);
const placeholderUpdatePlayer = (player: Player) => console.log("UPDATE PLAYER: Not implemented here.", player);
const placeholderDeletePlayer = (playerId: string) => console.log("DELETE PLAYER: Not implemented here.", playerId);
const placeholderAddMatches = (matches: Match[]) => console.log("ADD MATCHES: Not implemented here.", matches);
// ---

export default function MainAppContent() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // 💡 TS2339 FIX: Only destructure data, loading, and error from the hook.
    const { data: playersData, loading: playersLoading, error: playersError } = useFirestoreData<Player>('players');
    const { data: matchesData, loading: matchesLoading, error: matchesError } = useFirestoreData<Match>('matches');

    const players = useMemo(() => playersData || [], [playersData]);
    const matches = useMemo(() => matchesData || [], [matchesData]);
    const isDataLoading = playersLoading || matchesLoading;


    const initialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN;
    const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

    // 💡 TS6133 FIX: userId is calculated and used. setPendingPlayers removed from props.
    // We now declare the state needed for PlayerManager:
    const [pendingPlayers, setPendingPlayers] = useState<string[]>([]);


    useEffect(() => {
        const authInstance = auth; 

        if (!authInstance) {
            setLoading(false);
            return;
        }

        async function handleAuth() {
            try {
                if (initialAuthToken && initialAuthToken.length > 0) {
                    // RESOLVED TS2345: Use authInstance (guaranteed non-null)
                    await signInWithCustomToken(authInstance, initialAuthToken); 
                } else {
                    // RESOLVED TS2345: Use authInstance (guaranteed non-null)
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
    }, [initialAuthToken]);

    const handleLogout = () => {
        if (auth) {
            signOut(auth).catch(err => console.error("Erro ao fazer logout:", err));
        }
    };


    if (loading || isDataLoading) {
        return (
          <div className="flex h-screen items-center justify-center bg-gray-50">
            <p className="text-xl text-blue-600 font-medium">Carregando dados da aplicação...</p>
          </div>
        );
    }
    
    if (!auth || playersError || matchesError) { 
        return (
            <div className="flex h-screen items-center justify-center bg-red-100 text-red-700 p-8">
                <p className="text-xl">
                    🔴 Falha Crítica: {playersError || matchesError || "Configuração do Firebase ausente."}
                </p>
            </div>
        );
    }
    
    const userId = user?.uid || 'Desconectado'; // Used below
    const displayEmail = user?.email || (user?.isAnonymous ? 'Anônimo' : 'Convidado'); 

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
            {user ? (
              // CONTEÚDO PRINCIPAL (LOGADO)
              <div className="bg-white p-6 rounded-xl shadow-lg mt-4">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-2xl font-bold text-green-600">
                      Painel Principal
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 hidden sm:inline">
                            Logado como: **{displayEmail}**
                        </span>
                        <button 
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white py-1 px-4 rounded-lg text-sm font-semibold transition"
                        >
                            Sair
                        </button>
                    </div>
                </div>

                {/* --- NAVEGAÇÃO POR ABAS --- */}
                {/* (Assume que o código de navegação está aqui) */}

                {/* --- RENDERIZAÇÃO CONDICIONAL --- */}
                <div className="py-4">
                    {/* 💡 TS2339 FIX: Passing placeholder functions */}
                    {true && ( // Replace 'true' with your activeTab condition
                        <PlayerManager 
                            players={players}
                            pendingPlayers={pendingPlayers}
                            setPendingPlayers={setPendingPlayers} // Needs definition in PlayerManager props
                            addPlayer={placeholderAddPlayer}
                            updatePlayer={placeholderUpdatePlayer}
                            deletePlayer={placeholderDeletePlayer}
                        />
                    )}
                    {/* Add MatchRegistry and MatchHistory here */}

                </div>

              </div>
            ) : (
              // TELA DE LOGIN (DESCONECTADO)
              <div className="max-w-sm mx-auto p-6 bg-white rounded-xl shadow-lg mt-20">
                <h1 className="text-2xl font-bold text-red-600 mb-4 text-center">Acesso Restrito</h1>
                <p className="mt-2 text-gray-600 mb-8 text-center">Entre ou crie sua conta para acessar o sistema.</p>
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