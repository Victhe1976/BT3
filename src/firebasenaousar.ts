import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
// setLogLevel removido da importação para evitar TS6133 (ou não está sendo usado)

// Variáveis para armazenar as instâncias.
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let appInstance: FirebaseApp | null = null;

// Constrói o objeto de configuração a partir das 8 variáveis individuais
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
    // 1. Verifica se a chave de API e o ID do projeto existem
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        // Converte a configuração para um tipo que 'initializeApp' aceita
        const config: any = firebaseConfig; 
        
        appInstance = initializeApp(config);
        authInstance = getAuth(appInstance);
        dbInstance = getFirestore(appInstance);
        storageInstance = getStorage(appInstance);
    } else {
        console.error("ERRO CRÍTICO: Configurações essenciais do Firebase (API Key/Project ID) estão ausentes no ambiente.");
    }
} catch (e) {
    console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase.", e);
}

// 2. Exporta as instâncias nulas ou válidas
export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
