import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToTickets, reserveTicket, getRaffleConfig, getLatestRaffle, uploadReceipt } from '../services/ticketService';
import type { Ticket, AppConfig } from '../types';
import TicketGrid from '../components/raffle/TicketGrid';
import { RaffleHero } from '../components/raffle/RaffleHero';
import { Toast } from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import Modal from '../components/common/Modal';
import { AlertCircle, Phone, User, Tag, Loader2 } from 'lucide-react';

const PublicRaffle = () => {
  const { raffleId } = useParams<{ raffleId: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ buyerName: '', buyerPhone: '', advisor: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  const { toast, showToast, hideToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubTickets: (() => void) | undefined;

    const init = async () => {
      const currentId = raffleId;
      
      if (!currentId) {
        const latest = await getLatestRaffle();
        if (active && latest) {
          navigate(`/r/${latest.id}`, { replace: true });
        } else if (active) {
          setInitialLoading(false);
        }
        return;
      }

      // Fetch config once (non-realtime)
      const raffleData = await getRaffleConfig(currentId);
      if (active && raffleData) {
        setConfig(raffleData);
        
        // Subscribe to tickets with proper cleanup
        const unsub = subscribeToTickets(currentId, (newTickets) => {
          if (!active) return;
          setTickets(newTickets);
          setInitialLoading(false);
        });

        if (!active) {
          unsub();
        } else {
          unsubTickets = unsub;
        }
      } else if (active) {
        setInitialLoading(false);
        showToast("La rifa no existe", "error");
      }
    };

    init();

    return () => {
      active = false;
      if (unsubTickets) unsubTickets();
    };
  }, [raffleId, navigate]);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !config) return;

    setLoading(true);
    try {
      let receiptUrl = '';
      if (receiptFile) {
        receiptUrl = await uploadReceipt(config.id, config.title, selectedTicket.id, receiptFile);
      }

      await reserveTicket(config.id, selectedTicket.id, {
        buyerName: formData.buyerName,
        buyerPhone: formData.buyerPhone,
        advisor: formData.advisor,
        receiptUrl: receiptUrl || undefined
      });
      showToast("¡Número reservado con éxito!");
      setIsModalOpen(false);
      setFormData({ buyerName: '', buyerPhone: '', advisor: '' });
      setReceiptFile(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al reservar";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const pageBackground = 'min-h-screen bg-gradient-to-br from-indigo-200 via-slate-300 to-violet-300';

  if (initialLoading) {
    return (
      <div className={`${pageBackground} flex items-center justify-center`}>
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className={`${pageBackground} flex flex-col items-center justify-center p-6 text-center`}>
        <AlertCircle className="w-16 h-16 text-indigo-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No hay rifas activas</h2>
        <p className="text-slate-600 max-w-md">
          En este momento no hay ninguna rifa disponible para participar. Vuelve más tarde.
        </p>
      </div>
    );
  }

  const soldCount = tickets.filter(t => t.status !== 'disponible').length;

  return (
    <div className={`${pageBackground} pb-20 relative overflow-hidden`}>
      <div className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-400/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 right-1/3 h-72 w-72 rounded-full bg-purple-400/25 blur-3xl" aria-hidden />

      {/* Navbar */}
      <nav className="bg-white/75 backdrop-blur-md border-b border-white/60 sticky top-0 z-40 px-6 py-3 flex items-center shadow-sm shadow-indigo-100/50">
        <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
          {config.title}
        </h1>
      </nav>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        {/* Hero Section */}
        <RaffleHero config={config} soldCount={soldCount} />

        {/* Tickets Section */}
        <section className="space-y-4 bg-white/85 backdrop-blur-sm rounded-2xl p-4 md:p-5 border border-white shadow-md shadow-slate-300/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Selecciona tu número</h3>
              <p className="text-slate-600 text-xs">Haz clic en un número disponible para reservarlo</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-bold uppercase text-slate-600">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-slate-200 rounded shadow-sm"></div> Disponible</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div> Reservado</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Pagado</div>
            </div>
          </div>

          <TicketGrid tickets={tickets} onTicketClick={handleTicketClick} />
        </section>
      </main>

      {/* Toast Notifications */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}

      {/* Reservation Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`Reservar Número ${selectedTicket?.id}`}
      >
        <form onSubmit={handleReserve} className="space-y-5">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-800 text-sm font-medium">
          No olvides enviar el comprobante de pago para confirmar tu reserva.
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.buyerName}
                  onChange={e => setFormData({...formData, buyerName: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">WhatsApp / Celular</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="tel"
                  placeholder="Ej. 310 123 4567"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.buyerPhone}
                  onChange={e => setFormData({...formData, buyerPhone: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Asesor (Opcional)</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Nombre del asesor"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.advisor}
                  onChange={e => setFormData({...formData, advisor: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Comprobante de Pago (Opcional)</label>
              <input 
                type="file" 
                accept="image/*"
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                onChange={e => setReceiptFile(e.target.files?.[0] || null)}
              />
              <p className="text-[10px] text-slate-400 mt-1 italic">
                Puedes subirlo ahora o enviarlo después por WhatsApp.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Confirmar Reserva'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default PublicRaffle;
