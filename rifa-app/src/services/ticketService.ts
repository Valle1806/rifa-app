import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  query, 
  orderBy,
  runTransaction,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  where,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import type { Ticket, TicketStatus, AppConfig } from '../types';

const RAFFLES_COLLECTION = 'raffles';
const AUDIT_COLLECTION = 'audit_logs';

// --- RAFFLE CONFIG SERVICES ---

export const subscribeToRaffles = (callback: (raffles: AppConfig[]) => void) => {
  const q = query(collection(db, RAFFLES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const raffles = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppConfig));
    callback(raffles);
  });
};

export const subscribeToRaffleConfig = (raffleId: string, callback: (config: AppConfig | null) => void) => {
  return onSnapshot(doc(db, RAFFLES_COLLECTION, raffleId), (doc) => {
    if (doc.exists()) {
      callback({ ...doc.data(), id: doc.id } as AppConfig);
    } else {
      callback(null);
    }
  });
};

export const createRaffle = async (config: Omit<AppConfig, 'id' | 'createdAt' | 'isActive'>) => {
  const raffleRef = doc(collection(db, RAFFLES_COLLECTION));
  const newRaffle: AppConfig = {
    ...config,
    id: raffleRef.id,
    isActive: true,
    createdAt: Date.now()
  };
  await setDoc(raffleRef, newRaffle);
  await initializeTickets(raffleRef.id, config.totalTickets, config.digitCount);
  return raffleRef.id;
};

export const updateRaffleConfig = async (raffleId: string, updates: Partial<AppConfig>) => {
  const raffleRef = doc(db, RAFFLES_COLLECTION, raffleId);
  await updateDoc(raffleRef, updates);
};

export const deleteRaffle = async (raffleId: string) => {
  const raffleRef = doc(db, RAFFLES_COLLECTION, raffleId);
  const ticketsCol = collection(db, RAFFLES_COLLECTION, raffleId, 'tickets');
  const ticketsSnap = await getDocs(ticketsCol);
  
  const batch = writeBatch(db);
  
  for (const ticketDoc of ticketsSnap.docs) {
    const privateRef = doc(db, RAFFLES_COLLECTION, raffleId, 'tickets', ticketDoc.id, 'private', 'data');
    batch.delete(privateRef);
    batch.delete(ticketDoc.ref);
  }
  
  batch.delete(raffleRef);
  await batch.commit();
};

// --- STORAGE SERVICES ---

export const uploadReceipt = async (raffleId: string, ticketId: string, file: File): Promise<string> => {
  const storageRef = ref(storage, `receipts/${raffleId}/${ticketId}_${Date.now()}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const deleteReceipt = async (url: string) => {
  const storageRef = ref(storage, url);
  await deleteObject(storageRef);
};

// --- TICKET SERVICES ---

export const subscribeToTickets = (raffleId: string, callback: (tickets: Ticket[]) => void) => {
  const q = query(collection(db, RAFFLES_COLLECTION, raffleId, 'tickets'), orderBy('id', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const tickets = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ticket));
    callback(tickets);
  });
};

export const getPrivateTicketData = async (raffleId: string, ticketId: string) => {
  const privateRef = doc(db, RAFFLES_COLLECTION, raffleId, 'tickets', ticketId, 'private', 'data');
  const snap = await getDoc(privateRef);
  return snap.exists() ? snap.data() : null;
};

export const reserveTicket = async (raffleId: string, ticketId: string, buyerData: { buyerName: string, buyerPhone: string, advisor?: string, receiptUrl?: string }) => {
  const ticketRef = doc(db, RAFFLES_COLLECTION, raffleId, 'tickets', ticketId);
  const privateRef = doc(db, RAFFLES_COLLECTION, raffleId, 'tickets', ticketId, 'private', 'data');
  
  return runTransaction(db, async (transaction) => {
    const ticketDoc = await transaction.get(ticketRef);
    if (!ticketDoc.exists()) throw new Error("Ticket no existe");
    
    const data = ticketDoc.data() as Ticket;
    if (data.status !== 'disponible') throw new Error("Ticket no disponible");

    transaction.update(ticketRef, {
      status: 'reservado',
      advisor: buyerData.advisor || null,
      buyerName: buyerData.buyerName,
      hasReceipt: !!buyerData.receiptUrl,
      updatedAt: Date.now()
    });

    transaction.set(privateRef, {
      buyerName: buyerData.buyerName,
      buyerPhone: buyerData.buyerPhone,
      receiptUrl: buyerData.receiptUrl || null,
      reservedAt: Date.now()
    });
  });
};

export const updateTicketStatus = async (
  raffleId: string,
  ticketId: string, 
  newStatus: TicketStatus, 
  adminId: string,
  additionalData: Partial<Ticket> = {}
) => {
  const ticketRef = doc(db, RAFFLES_COLLECTION, raffleId, 'tickets', ticketId);
  const privateRef = doc(db, RAFFLES_COLLECTION, raffleId, 'tickets', ticketId, 'private', 'data');
  
  const ticketDoc = await getDoc(ticketRef);
  const oldData = ticketDoc.data() as Ticket;

  const { buyerName, buyerPhone, receiptUrl, advisor } = additionalData;

  const updates: any = {
    status: newStatus,
    advisor: advisor || oldData.advisor || null,
    buyerName: buyerName || oldData.buyerName || null,
    updatedAt: Date.now(),
    updatedBy: adminId
  };

  if (receiptUrl !== undefined) {
    updates.hasReceipt = !!receiptUrl;
  }

  await updateDoc(ticketRef, updates);

  if (buyerName || buyerPhone || receiptUrl !== undefined) {
    const privateUpdates: any = {};
    if (buyerName) privateUpdates.buyerName = buyerName;
    if (buyerPhone) privateUpdates.buyerPhone = buyerPhone;
    if (receiptUrl !== undefined) privateUpdates.receiptUrl = receiptUrl || null;
    
    await setDoc(privateRef, privateUpdates, { merge: true });
  }

  await addDoc(collection(db, AUDIT_COLLECTION), {
    raffleId,
    ticketId,
    action: 'status_change',
    previousState: { status: oldData.status },
    newState: { status: newStatus, ...additionalData },
    performedBy: adminId,
    timestamp: Date.now()
  });
};

export const resetTicket = async (raffleId: string, ticketId: string, adminId: string) => {
  const ticketRef = doc(db, RAFFLES_COLLECTION, raffleId, 'tickets', ticketId);
  const privateRef = doc(db, RAFFLES_COLLECTION, raffleId, 'tickets', ticketId, 'private', 'data');
  
  const ticketDoc = await getDoc(ticketRef);
  const oldData = ticketDoc.data() as Ticket;

  await updateDoc(ticketRef, {
    status: 'disponible',
    advisor: null,
    buyerName: null,
    hasReceipt: false,
    updatedAt: Date.now(),
    updatedBy: adminId
  });

  await deleteDoc(privateRef);

  await addDoc(collection(db, AUDIT_COLLECTION), {
    raffleId,
    ticketId,
    action: 'reset',
    previousState: oldData,
    newState: { status: 'disponible' },
    performedBy: adminId,
    timestamp: Date.now()
  });
};

export const initializeTickets = async (raffleId: string, count: number, digitCount: number) => {
  const ticketsCol = collection(db, RAFFLES_COLLECTION, raffleId, 'tickets');
  const batch = [];
  for (let i = 0; i < count; i++) {
    const id = i.toString().padStart(digitCount, '0');
    batch.push(setDoc(doc(ticketsCol, id), {
      id,
      status: 'disponible',
      hasReceipt: false,
      updatedAt: Date.now()
    }));
  }
  await Promise.all(batch);
};

export const getLatestRaffle = async (): Promise<AppConfig | null> => {
  const q = query(collection(db, RAFFLES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as AppConfig;
};

export const subscribeToAuditLogs = (raffleId: string, callback: (logs: any[]) => void) => {
  const q = query(
    collection(db, AUDIT_COLLECTION), 
    where('raffleId', '==', raffleId),
    orderBy('timestamp', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    callback(logs);
  });
};
