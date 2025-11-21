import { useEffect, useState, useMemo } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "./firebase/firebaseClient";
import AuthForm from "./AuthForm";
import { Player, Match } from "../types";
import useFirestoreData from "./useFirestoreData";

export default function MainAppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: playersData, loading: playersLoading, error: playersError } =
    useFirestoreData<Player>("players");

  const { data: matchesData, loading: matchesLoading, error: matchesError } =
    useFirestoreData<Match>("matches");

  const players = useMemo(() => playersData || [], [playersData]);
  const matches = useMemo(() => matchesData || [], [matchesData]);

  const isDataLoading = playersLoading || matchesLoading;

  const appId = import.meta.env.VITE_APP_ID || "default-app-id";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    }
  };

  if (loading || isDataLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-xl text-blue-600 font-medium">
          Carregando dados da aplicação...
        </p>
      </div>
    );
  }

  if (playersError || matchesError) {
    return (
      <div className="flex h-screen items-center justify-center bg-red-100 text-red-700 p-8">
        <p className="text-xl text-center">
          🔴 Falha Crítica: {playersError || matchesError}
        </p>
      </div>
    );
  }

  const displayEmail =
    user?.email || (user?.isAnonymous ? "Anônimo" : "Convidado");

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {user ? (
          // USUÁRIO LOGADO
          <div className="bg-white p-6 rounded-xl shadow-lg mt-4">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h1 className="text-2xl font-bold text-green-600">
                Painel Principal
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Logado como: {displayEmail}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white py-1 px-4 rounded-lg text-sm font-semibold transition"
                >
                  Sair
                </button>
              </div>
            </div>

            <p className="text-gray-700">
              Jogadores carregados: {players.length}
            </p>

            <p className="text-gray-700">
              Partidas carregadas: {matches.length}
            </p>
          </div>
        ) : (
          // TELA DE LOGIN
          <div className="max-w-sm mx-auto p-6 bg-white rounded-xl shadow-lg mt-20">
            <h1 className="text-2xl font-bold text-red-600 mb-4 text-center">
              Acesso Restrito
            </h1>
            <p className="mt-2 text-gray-600 mb-8 text-center">
              Entre ou crie sua conta para acessar o sistema.
            </p>
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
