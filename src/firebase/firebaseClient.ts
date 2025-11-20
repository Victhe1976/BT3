import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, setLogLevel } from "firebase/firestore";

declare const __firebase_config: string;

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

try {
    const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
    
    if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
        const app = initializeApp(firebaseConfig);
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
        setLogLevel('debug');
    } else {
        console.error("ERRO CRÍTICO: Configuração do Firebase incompleta.");
    }
} catch (e) {
    console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase.", e);
}

export const auth = authInstance;
export const db = dbInstance;