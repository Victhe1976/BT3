import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';      
import { getFirestore } from 'firebase/firestore'; 
import { getStorage } from 'firebase/storage';    


const firebaseConfig = {
  apiKey: "AIzaSyDCuVcixlcbW8P_F7BI6hDKRGzgbwOmW68",
  authDomain: "bt25-59082.firebaseapp.com",
  projectId: "bt25-59082",
  storageBucket: "bt25-59082.firebasestorage.app",
  messagingSenderId: "577664112234",
  appId: "1:577664112234:web:059476e4cd55143f231c13",
  measurementId: "G-JEJJPEEP4S"
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth(app); // Para Login/Registro
export const db = getFirestore(app); // Para Partidas/Rankings
export const storage = getStorage(app); // Para Avatares