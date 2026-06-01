import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  QueryConstraint,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { BaseDocument, QueryParams } from '../services/types';

export function useFirestoreRealtime<T extends BaseDocument>(
  collectionName: string,
  params?: QueryParams
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let constraints: QueryConstraint[] = [];

    if (params?.filters) {
      params.filters.forEach(f => {
        constraints.push(where(f.field, f.operator, f.value));
      });
    }

    if (params?.orderByField) {
      constraints.push(orderBy(params.orderByField, params.orderDirection || 'asc'));
    }

    if (params?.limit) {
      constraints.push(limit(params.limit));
    }

    const q = query(collection(db, collectionName), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        setData(results);
        setLoading(false);
      },
      (err) => {
        console.error("Realtime subscription error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(params)]); // Be careful with complex objects in dependency arrays

  return { data, loading, error };
}
