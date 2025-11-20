import React, { useState } from "react";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";

// A função getAuth() busca a instância do Firebase Auth inicializada em outro lugar
const auth = getAuth();

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Erro ao autenticar. Tente novamente.";
      setError(errorMessage.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6 rounded-2xl shadow-xl bg-white border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        {isRegister ? "Criar conta" : "Entrar na Conta"}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 p-3 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition duration-150"
          required
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 p-3 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition duration-150"
          required
        />

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white font-semibold p-3 rounded-xl hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Carregando...
            </span>
          ) : isRegister ? "Criar conta" : "Entrar"}
        </button>
      </form>

      <p className="text-center mt-6 text-sm text-gray-600">
        {isRegister ? "Já tem conta?" : "Não tem conta?"}{" "}
        <button
          className="text-blue-600 font-medium hover:text-blue-800 transition duration-150"
          onClick={() => setIsRegister(!isRegister)}
          type="button"
        >
          {isRegister ? "Fazer Login" : "Criar uma"}
        </button>
      </p>
    </div>
  );
}
