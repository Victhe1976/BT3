import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, setLogLevel } from "firebase/firestore";

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let appInstance: FirebaseApp | null = null;

// LÊ A VARIÁVEL USANDO O FORMATO DO VITE
const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG; 

try {
    // 💡 CORREÇÃO: Tipagem explícita para evitar o erro TS2339 ao acessar propriedades
    let firebaseConfig: any = {}; 

    if (rawConfig) {
        firebaseConfig = JSON.parse(rawConfig);
    } else {
        console.error("ERRO CRÍTICO: Variável VITE_FIREBASE_CONFIG não encontrada.");
    }
    
    if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
        appInstance = initializeApp(firebaseConfig);
        authInstance = getAuth(appInstance);
        dbInstance = getFirestore(appInstance);
        setLogLevel('debug');
    }
} catch (e) {
    console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase.", e);
}

export const auth = authInstance;
export const db = dbInstance;