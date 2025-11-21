import React, { useState } from "react";
import { getAuth as getFirebaseAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
// O getAuth() busca a instância do Firebase Auth inicializada em outro arquivo (ex: firebaseClient.ts).
const auth = getFirebaseAuth();

export default function AuthForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();

    try {
      // Abre a janela de pop-up para login do Google
      await signInWithPopup(auth, provider);
      // O onAuthStateChanged no MainAppContent lidará com a atualização do usuário
    } catch (err: any) {
      // Trata erros como pop-up bloqueado ou falha de rede
      setError(err.message || "Erro ao tentar login com Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto p-6 rounded-2xl shadow-xl bg-white border border-gray-200">
      <h2 className="text-2xl font-extrabold mb-6 text-center text-blue-700">
        Entrar
      </h2>
      
      {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg mb-4">{error}</p>}

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="flex items-center justify-center gap-3 w-full bg-red-600 text-white p-3 rounded-xl font-semibold shadow-md hover:bg-red-700 transition duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Conectando..." : "Entrar com Google"}
      </button>

      {/* NOTA: Os botões de login/cadastro por e-mail foram removidos para focar no Google */}
      
      <p className="text-center mt-4 text-sm text-gray-600">
        * Certifique-se de que o provedor Google está ativado no Firebase.
      </p>
    </div>
  );
}