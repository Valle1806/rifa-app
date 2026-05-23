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
import { db } from './firebase';
import type { Ticket, TicketStatus, AppConfig } from '../types';

const RAFFLES_COLLECTION = 'raffles';
const AUDIT_COLLECTION = 'audit_logs';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// --- CLOUDINARY SERVICES ---

export const uploadReceipt = async (raffleId: string, raffleTitle: string, ticketId: string | null, file: File): Promise<string> => {
  const cleanTitle = raffleTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar tildes
    .replace(/[^a-z0-9]/g, "_")      // Reemplazar caracteres especiales y espacios por guiones bajos
    .replace(/_+/g, "_")             // Evitar múltiples guiones bajos seguidos
    .replace(/^_|_$/g, "");          // Eliminar guiones bajos al inicio o final

  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-T:]/g, "")           // Eliminar guiones, T y dos puntos
    .split(".")[0];                  // Quitar milisegundos
  
  // Si no hay ticketId, es una imagen de la rifa, no de un ticket
  const publicId = ticketId 
    ? `${cleanTitle}_ticket_${ticketId}_${timestamp.slice(0, 8)}_${timestamp.slice(8)}`
    : `${cleanTitle}_main_${timestamp.slice(0, 8)}_${timestamp.slice(8)}`;

  const formData = new FormData();
  const folder = ticketId
    ? `rifas/comprobantes/${raffleId}`
    : `rifas/portadas/${raffleId}`;

  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);
  formData.append('public_id', publicId);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error al subir a Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};

export const deleteReceipt = async (url: string) => {
  // Nota: El borrado físico en Cloudinary desde el frontend requiere firma (API Secret).
  // Por seguridad, este método es un placeholder. La limpieza de la URL en Firestore
  // se realiza mediante updateTicketStatus o resetTicket.
  console.warn("Borrado físico en Cloudinary no implementado. La referencia en Firestore se gestionará por el llamador. URL:", url);
};

// --- RAFFLE CONFIG SERVICES ---

export const getRaffles = async (): Promise<AppConfig[]> => {
  const q = query(collection(db, RAFFLES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppConfig));
};

export const getRaffleConfig = async (raffleId: string): Promise<AppConfig | null> => {
  const docRef = doc(db, RAFFLES_COLLECTION, raffleId);
  const snap = await getDoc(docRef);
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as AppConfig) : null;
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
    const ticketData = ticketDoc.data() as Ticket;
    
    // Si tiene comprobante, intentar borrarlo de Storage
    if (ticketData.hasReceipt) {
      const privateRef = doc(db, RAFFLES_COLLECTION, raffleId, 'tickets', ticketDoc.id, 'private', 'data');
      const privateSnap = await getDoc(privateRef);
      if (privateSnap.exists()) {
        const privateData = privateSnap.data();
        if (privateData.receiptUrl) {
          await deleteReceipt(privateData.receiptUrl);
        }
      }
    }

    const privateRef = doc(db, RAFFLES_COLLECTION, raffleId, 'tickets', ticketDoc.id, 'private', 'data');
    batch.delete(privateRef);
    batch.delete(ticketDoc.ref);
  }
  
  batch.delete(raffleRef);
  await batch.commit();
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
      receiptUrl: buyerData.receiptUrl || null,
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
    receiptUrl: receiptUrl !== undefined ? (receiptUrl || null) : (oldData.receiptUrl || null),
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

  const privateDoc = await getDoc(privateRef);
  if (privateDoc.exists()) {
    const privateData = privateDoc.data();
    if (privateData.receiptUrl) {
      await deleteReceipt(privateData.receiptUrl);
    }
  }

  await updateDoc(ticketRef, {
    status: 'disponible',
    advisor: null,
    buyerName: null,
    hasReceipt: false,
    receiptUrl: null,
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
  
  // Usar lotes (batches) de 500 (límite de Firestore)
  const batchSize = 500;
  for (let i = 0; i < count; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = Math.min(count, i + batchSize);
    
    for (let j = i; j < chunk; j++) {
      const id = j.toString().padStart(digitCount, '0');
      const ticketRef = doc(ticketsCol, id);
      batch.set(ticketRef, {
        id,
        status: 'disponible',
        hasReceipt: false,
        updatedAt: Date.now()
      });
    }
    await batch.commit();
  }
};

export const getLatestRaffle = async (): Promise<AppConfig | null> => {
  const q = query(collection(db, RAFFLES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as AppConfig;
};

export const getAuditLogs = async (raffleId: string): Promise<any[]> => {
  const q = query(
    collection(db, AUDIT_COLLECTION), 
    where('raffleId', '==', raffleId),
    orderBy('timestamp', 'desc'),
    limit(20)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};
