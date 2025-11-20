import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, setLogLevel } from "firebase/firestore";

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

// LÊ A VARIÁVEL USANDO O FORMATO DO VITE (import.meta.env)
const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG; 

try {
    let firebaseConfig = {};

    if (rawConfig) {
        // Assume que a configuração é uma string JSON completa
        firebaseConfig = JSON.parse(rawConfig);
    } else {
        console.error("ERRO CRÍTICO: Variável VITE_FIREBASE_CONFIG não encontrada.");
    }
    
    // Inicializa o Firebase com as configurações lidas
    if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
        const app = initializeApp(firebaseConfig);
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
        setLogLevel('debug');
    }
} catch (e) {
    console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase.", e);
}

export const auth = authInstance;
export const db = dbInstance;