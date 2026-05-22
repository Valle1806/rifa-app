import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToTickets, reserveTicket, subscribeToRaffleConfig, getLatestRaffle, uploadReceipt } from '../services/ticketService';
import type { Ticket, AppConfig } from '../types';
import TicketGrid from '../components/raffle/TicketGrid';
import Modal from '../components/common/Modal';
import { Smartphone, CheckCircle, AlertCircle, Phone, User, Tag, Loader2 } from 'lucide-react';

const PublicRaffle = () => {
  const { raffleId } = useParams<{ raffleId: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ buyerName: '', buyerPhone: '', advisor: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const init = async () => {
      const currentId = raffleId;
      
      if (!currentId) {
        const latest = await getLatestRaffle();
        if (latest) {
          navigate(`/r/${latest.id}`, { replace: true });
          return;
        } else {
          setInitialLoading(false);
          return;
        }
      }

      // Subscribe to config
      const unsubConfig = subscribeToRaffleConfig(currentId, (newConfig) => {
        if (newConfig) {
          setConfig(newConfig);
          setInitialLoading(false);
        } else {
          setInitialLoading(false);
          setAlert({ message: "La rifa no existe", type: 'error' });
        }
      });

      // Subscribe to tickets
      const unsubTickets = subscribeToTickets(currentId, (newTickets) => {
        setTickets(newTickets);
      });

      return () => {
        unsubConfig();
        unsubTickets();
      };
    };

    init();
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
        receiptUrl = await uploadReceipt(config.id, selectedTicket.id, receiptFile);
      }

      await reserveTicket(config.id, selectedTicket.id, {
        buyerName: formData.buyerName,
        buyerPhone: formData.buyerPhone,
        advisor: formData.advisor,
        receiptUrl: receiptUrl || undefined
      });
      setAlert({ message: "¡Número reservado con éxito!", type: 'success' });
      setIsModalOpen(false);
      setFormData({ buyerName: '', buyerPhone: '', advisor: '' });
      setReceiptFile(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al reservar";
      setAlert({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No hay rifas activas</h2>
        <p className="text-slate-500 max-w-md">
          En este momento no hay ninguna rifa disponible para participar. Vuelve más tarde.
        </p>
      </div>
    );
  }

  const soldCount = tickets.filter(t => t.status !== 'disponible').length;
  const progress = (soldCount / config.totalTickets) * 100;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {config.title}
        </h1>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold border border-indigo-100">
          ${config.price.toLocaleString()} COP
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-8">
        {/* Hero Section */}
        <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-10 mb-12">
          <div className="w-full md:w-1/2 relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-lg opacity-20"></div>
            <div className="relative bg-slate-900 rounded-2xl aspect-square flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
              <Smartphone size={120} className="text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div className="w-full md:w-1/2 space-y-6">
            <span className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
              Sorteo Especial
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              {config.title}
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              {config.description}
            </p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-bold text-slate-500">
                <span>Progreso de ventas</span>
                <span>{soldCount} / {config.totalTickets} vendidos</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* Tickets Section */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Selecciona tu número</h3>
              <p className="text-slate-500">Haz clic en un número disponible para reservarlo</p>
            </div>
            <div className="flex gap-4 text-xs font-bold uppercase">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-slate-200 rounded"></div> Disponible</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-100 rounded"></div> Reservado</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Pagado</div>
            </div>
          </div>

          <TicketGrid tickets={tickets} onTicketClick={handleTicketClick} />
        </section>
      </main>

      {/* Alert */}
      {alert && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-bounce ${
          alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          {alert.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold">{alert.message}</span>
        </div>
      )}

      {/* Reservation Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`Reservar Número ${selectedTicket?.id}`}
      >
        <form onSubmit={handleReserve} className="space-y-5">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-800 text-sm font-medium">
            Al reservar, tendrás 24 horas para enviar el comprobante de pago.
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
