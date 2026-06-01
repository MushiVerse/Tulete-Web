import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  serverTimestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { BaseDocument, QueryParams } from './types';
import { ZodSchema } from 'zod';

export class BaseFirestoreService<T extends BaseDocument> {
  protected collectionName: string;
  protected schema?: ZodSchema<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

  constructor(collectionName: string, schema?: ZodSchema<any>) {
    this.collectionName = collectionName;
    this.schema = schema;
  }

  protected get collectionRef() {
    return collection(db, this.collectionName);
  }

  protected parse(data: any): T {
    // If schema is provided, we can validate. For now, we trust the DB shapes or 
    // handle specific parsing inside derived classes.
    return data as T;
  }

  async getById(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return this.parse({ id: docSnap.id, ...docSnap.data() });
  }

  async getMany(params?: QueryParams): Promise<{ data: T[], lastDoc: any }> {
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

    if (params?.lastDoc) {
      constraints.push(startAfter(params.lastDoc));
    }

    const q = query(this.collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const data = querySnapshot.docs.map(doc => this.parse({ id: doc.id, ...doc.data() }));
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    return { data, lastDoc };
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<T> {
    if (this.schema) {
      this.schema.parse(data);
    }

    const docRef = customId 
      ? doc(db, this.collectionName, customId) 
      : doc(this.collectionRef);

    const payload = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, payload);
    return this.parse({ id: docRef.id, ...payload });
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    
    const payload = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, payload);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }
}
