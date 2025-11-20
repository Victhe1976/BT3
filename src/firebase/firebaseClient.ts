import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
// Importação de setLogLevel removida para evitar TS6133, se aplicável
// (setLogLevel('debug') pode ser adicionado manualmente no bloco try se necessário)

// Variáveis para armazenar as instâncias.
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let appInstance: FirebaseApp | null = null;

// 1. Constrói o objeto de configuração a partir das 8 variáveis individuais (VITE_FIREBASE_*)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

try {
    // 2. Verifica se as chaves existem (usando a nova config)
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        // Converte para any para satisfazer initializeApp com todas as propriedades
        const config: any = firebaseConfig; 
        
        appInstance = initializeApp(config);
        authInstance = getAuth(appInstance);
        dbInstance = getFirestore(appInstance);
        storageInstance = getStorage(appInstance);
    } else {
        // 🔴 Se as chaves estiverem vazias no Netlify
        console.error("ERRO CRÍTICO: Configurações essenciais do Firebase (API Key/Project ID) estão ausentes no ambiente.");
    }
} catch (e) {
    console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase. Verifique as variáveis individuais no Netlify.", e);
}

// 3. Exporta as instâncias
export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;