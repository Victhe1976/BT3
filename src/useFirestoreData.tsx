import { useEffect, useState } from "react";
import { collection, onSnapshot, Firestore } from "firebase/firestore";
// CORREÇÃO TS2614: Importa a instância 'db' do novo módulo de cliente do Firebase
import { db } from './firebase/firebaseClient'; 

// Define os tipos básicos para os dados do Firestore
export interface PlayerData {
  id: string;
  name: string;
  dob: string;
  avatar: string;
}

export interface MatchData {
    id: string;
    dayId: number;
    date: string;
    teamA: { players: string[], score: number };
    teamB: { players: string[], score: number };
}

interface HookData<T> {
    data: T[];
    loading: boolean;
    error: string | null;
}

export const useFirestoreData = <T extends { id: string }>(collectionName: string): HookData<T> => {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Obtém a instância do DB
        const dbInstance = db;

        if (!dbInstance) {
            setError("Firestore não está inicializado.");
            setLoading(false);
            return;
        }

        try {
            const collectionRef = collection(dbInstance as Firestore, collectionName);
            const q = collectionRef; 

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const list = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as T[];
                setData(list);
                setLoading(false);
            }, (err) => {
                setError(err.message);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err: any) {
            setError("Erro ao configurar o listener do Firestore: " + err.message);
            setLoading(false);
            return;
        }
    }, [collectionName]);

    return { data, loading, error };
};

export default useFirestoreData;