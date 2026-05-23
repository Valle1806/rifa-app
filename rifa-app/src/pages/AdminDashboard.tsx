import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { 
  subscribeToTickets, 
  updateTicketStatus, 
  resetTicket, 
  getRaffles, 
  createRaffle, 
  updateRaffleConfig,
  getLatestRaffle,
  getPrivateTicketData,
  deleteRaffle,
  uploadReceipt,
  deleteReceipt,
  getAuditLogs
} from '../services/ticketService';
import type { Ticket, TicketStatus, AdvisorStats, AppConfig } from '../types';
import Modal from '../components/common/Modal';
import { 
  ShieldCheck, LogOut, DollarSign, Users, Ticket as TicketIcon, 
  Search, Plus, Settings, ChevronRight, Loader2, XCircle, Image as ImageIcon
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { StatsCard } from '../components/admin/StatsCard';
import { AdvisorRanking } from '../components/admin/AdvisorRanking';
import { AuditLogs } from '../components/admin/AuditLogs';
import { TicketTable } from '../components/admin/TicketTable';
import { Toast } from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import { TICKET_STATUS_OPTIONS, DIGIT_COUNT_OPTIONS, SORT_OPTIONS } from '../utils/constants';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const AdminDashboard = () => {
  const { raffleId } = useParams<{ raffleId: string }>();
  const navigate = useNavigate();
  
  const [raffles, setRaffles] = useState<AppConfig[]>([]);
  const [currentRaffle, setCurrentRaffle] = useState<AppConfig | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'id' | 'date'>('id');
  const [showOnlyWithReceipt, setShowOnlyWithReceipt] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteRaffleModalOpen, setIsDeleteRaffleModalOpen] = useState(false);
  const [isNewRaffleModalOpen, setIsNewRaffleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  const { toast, showToast, hideToast } = useToast();
  
  const [editFormData, setEditFormData] = useState<Partial<Ticket>>({});
  const [newRaffleData, setNewRaffleData] = useState({ title: '', price: 50000, description: '', totalTickets: 100, digitCount: 2 });
  const [configFormData, setConfigFormData] = useState({ title: '', price: 0, description: '', imageUrl: '' });
  const [pendingRaffleImage, setPendingRaffleImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch all raffles once
  useEffect(() => {
    getRaffles().then(setRaffles);
  }, []);

  // Handle raffle selection and ticket subscription
  useEffect(() => {
    let active = true;
    let unsubTickets: (() => void) | undefined;

    const init = async () => {
      const activeId = raffleId;

      if (!activeId) {
        const latest = await getLatestRaffle();
        if (active && latest) {
          navigate(`/admin/${latest.id}`, { replace: true });
        } else if (active) {
          setInitialLoading(false);
        }
        return;
      }

      const raffle = raffles.find(r => r.id === activeId);
      if (raffle && active) {
        setCurrentRaffle(raffle);
        setConfigFormData({ 
          title: raffle.title, 
          price: raffle.price, 
          description: raffle.description, 
          imageUrl: raffle.imageUrl || ''
        });
        
        // Real-time tickets subscription with proper cleanup
        const unsub = subscribeToTickets(activeId, (updatedTickets) => {
          if (!active) return;
          setTickets(updatedTickets);
          setInitialLoading(false);
        });

        if (!active) {
          unsub();
        } else {
          unsubTickets = unsub;
        }

        // Fetch logs once
        const logs = await getAuditLogs(activeId);
        if (active) setAuditLogs(logs);
      } else if (raffles.length > 0 && active) {
        setInitialLoading(false);
      }
    };

    init();

    return () => {
      active = false;
      if (unsubTickets) unsubTickets();
    };
  }, [raffleId, raffles, navigate]);

  const stats = useMemo(() => {
    if (!currentRaffle) return { total: 0, sold: 0, reserved: 0, available: 0, revenue: 0, advisors: [] };
    
    const total = tickets.length;
    const sold = tickets.filter(t => t.status.startsWith('pagado')).length;
    const reserved = tickets.filter(t => t.status === 'reservado').length;
    const available = tickets.filter(t => t.status === 'disponible').length;
    const revenue = sold * currentRaffle.price;

    const advisorsMap: Record<string, { totalSold: number, totalRevenue: number }> = {};
    tickets.forEach(t => {
      if (t.advisor && t.status.startsWith('pagado')) {
        const adv = t.advisor.trim() || 'Sin Asesor';
        if (!advisorsMap[adv]) advisorsMap[adv] = { totalSold: 0, totalRevenue: 0 };
        advisorsMap[adv].totalSold += 1;
        advisorsMap[adv].totalRevenue += currentRaffle.price;
      }
    });

    const advisors: AdvisorStats[] = Object.entries(advisorsMap).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.totalSold - a.totalSold);

    return { total, sold, reserved, available, revenue, advisors };
  }, [tickets, currentRaffle]);

  const filteredTickets = useMemo(() => {
    const filtered = tickets.filter(t => {
      const matchesSearch = t.id.includes(searchTerm) || 
                          t.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.advisor?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesReceipt = !showOnlyWithReceipt || t.hasReceipt;
      return matchesSearch && matchesStatus && matchesReceipt;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
      return a.id.localeCompare(b.id);
    });
  }, [tickets, searchTerm, statusFilter, showOnlyWithReceipt, sortBy]);

  const handleLogout = () => signOut(auth);

  const handleCreateRaffle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const id = await createRaffle(newRaffleData);
      if (pendingRaffleImage) {
        const imageUrl = await uploadReceipt(id, newRaffleData.title, null, pendingRaffleImage);
        await updateRaffleConfig(id, { imageUrl });
      }
      setPendingRaffleImage(null);
      setIsNewRaffleModalOpen(false);
      showToast("¡Rifa creada con éxito!");
      navigate(`/admin/${id}`);
    } catch {
      showToast("Error al crear la rifa", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRaffle) return;
    setLoading(true);
    try {
      await updateRaffleConfig(currentRaffle.id, configFormData);
      setRaffles(prev => prev.map(r => r.id === currentRaffle.id ? { ...r, ...configFormData } : r));
      setCurrentRaffle(prev => prev ? { ...prev, ...configFormData } : null);
      setIsConfigModalOpen(false);
      showToast("Configuración actualizada");
    } catch {
      showToast("Error al actualizar configuración", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRaffle = async () => {
    if (!currentRaffle) return;
    setLoading(true);
    try {
      await deleteRaffle(currentRaffle.id);
      setIsDeleteRaffleModalOpen(false);
      showToast("Rifa eliminada correctamente");
      navigate('/admin');
    } catch {
      showToast("Error al eliminar la rifa", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (ticket: Ticket) => {
    if (!currentRaffle) return;
    setSelectedTicket(ticket);
    setLoading(true);
    try {
      const privateData = await getPrivateTicketData(currentRaffle.id, ticket.id);
      setEditFormData({ ...ticket, ...privateData });
      setIsEditModalOpen(true);
    } catch {
      showToast("Error al cargar datos del comprador", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !currentRaffle || !auth.currentUser) return;
    
    try {
      const { status, ...rest } = editFormData;
      await updateTicketStatus(currentRaffle.id, selectedTicket.id, status as TicketStatus, auth.currentUser.uid, rest);
      setIsEditModalOpen(false);
      showToast("Ticket actualizado con éxito");
    } catch {
      showToast("Error al actualizar ticket", "error");
    }
  };

  const handleResetClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!selectedTicket || !currentRaffle || !auth.currentUser) return;
    try {
      await resetTicket(currentRaffle.id, selectedTicket.id, auth.currentUser.uid);
      setIsResetModalOpen(false);
      showToast("Número reseteado a disponible");
    } catch {
      showToast("Error al resetear ticket", "error");
    }
  };

  const chartData = {
    labels: ['Pagado', 'Reservado', 'Disponible'],
    datasets: [{
      data: [stats.sold, stats.reserved, stats.available],
      backgroundColor: ['#10b981', '#f59e0b', '#e2e8f0'],
      borderWidth: 0,
    }]
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-900 text-white p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-indigo-500 p-2 rounded-xl text-white">
            <ShieldCheck size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight">RifaMaster Admin</span>
        </div>
        
        <div className="space-y-8 flex-1">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Tus Rifas</h3>
              <button 
                onClick={() => setIsNewRaffleModalOpen(true)}
                className="p-1 hover:bg-slate-800 rounded-md text-indigo-400 transition"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {raffles.map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/admin/${r.id}`)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition text-sm font-bold ${
                    currentRaffle?.id === r.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2">{r.title}</span>
                  <ChevronRight size={14} className={currentRaffle?.id === r.id ? 'opacity-100' : 'opacity-0'} />
                </button>
              ))}
              {raffles.length === 0 && (
                <div className="text-xs text-slate-500 italic p-3 bg-slate-800/50 rounded-xl border border-slate-800">
                  No hay rifas creadas. Crea una para comenzar.
                </div>
              )}
            </div>
          </section>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 text-slate-400 hover:text-white p-3 rounded-xl transition mt-10"
        >
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        {!currentRaffle ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="bg-indigo-100 p-6 rounded-3xl text-indigo-600 mb-6">
              <TicketIcon size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Bienvenido a RifaMaster</h2>
            <p className="text-slate-500 max-w-md mb-8">
              Parece que aún no tienes ninguna rifa configurada. Comienza creando tu primera rifa ahora mismo.
            </p>
            <button 
              onClick={() => setIsNewRaffleModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition active:scale-95 flex items-center gap-2"
            >
              <Plus size={20} /> Crear Mi Primera Rifa
            </button>
          </div>
        ) : (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-black text-slate-900">{currentRaffle.title}</h1>
                  <button 
                  onClick={() => setIsConfigModalOpen(true)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition"
                >
                  <Settings size={20} />
                </button>
                <button 
                  onClick={() => setIsDeleteRaffleModalOpen(true)}
                  className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition"
                  title="Eliminar Rifa"
                >
                  <XCircle size={20} />
                </button>
              </div>
                <p className="text-slate-500 font-medium">Gestiona ventas, estados y asesores</p>
              </div>
              
              <div className="flex items-center gap-3">
                <a 
                  href={`/r/${currentRaffle.id}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                >
                  Ver Pública <ChevronRight size={16} />
                </a>
                <button onClick={handleLogout} className="lg:hidden flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold">
                  <LogOut size={18} />
                </button>
              </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatsCard 
                title="Recaudo Real"
                value={`$${stats.revenue.toLocaleString()}`}
                subtitle="Solo tickets pagados"
                icon={<DollarSign size={24}/>}
                color="emerald"
              />

              <StatsCard 
                title="Ventas"
                value={`${stats.sold} / ${stats.total}`}
                icon={<TicketIcon size={24}/>}
                color="indigo"
                progress={(stats.sold/stats.total)*100}
              />

              <StatsCard 
                title="Reservas"
                value={stats.reserved}
                subtitle="Pendientes por pago"
                icon={<Users size={24}/>}
                color="amber"
              />

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center">
                <div className="w-24 h-24">
                  <Doughnut data={chartData} options={{ cutout: '70%', plugins: { legend: { display: false } } }} />
                </div>
                <div className="ml-4 text-xs font-bold space-y-1">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Pagados</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full"></div> Reservas</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-200 rounded-full"></div> Disponibles</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <section className="lg:col-span-2 space-y-6">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                  <h2 className="text-2xl font-black text-slate-900 whitespace-nowrap">Listado de Números</h2>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full xl:justify-end">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar por ID, nombre o asesor..."
                        className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm font-medium shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                    <select 
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none shadow-sm focus:ring-2 focus:ring-indigo-500"
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                    >
                      {TICKET_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>

                    <select 
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none shadow-sm focus:ring-2 focus:ring-indigo-500"
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as 'id' | 'date')}
                    >
                      {SORT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>

                    <button
                        onClick={() => setShowOnlyWithReceipt(!showOnlyWithReceipt)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition flex items-center gap-2 shadow-sm ${
                          showOnlyWithReceipt 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <ImageIcon size={18} />
                        <span className="hidden sm:inline">Solo Comprobantes</span>
                      </button>
                    </div>
                  </div>
                </div>

                <TicketTable 
                  tickets={filteredTickets}
                  onEdit={handleEditClick}
                  onReset={handleResetClick}
                />
              </section>

              <aside className="space-y-10">
                <AdvisorRanking advisors={stats.advisors} />
                <AuditLogs logs={auditLogs} />
              </aside>
            </div>
          </>
        )}
      </main>

      {/* New Raffle Modal */}
      <Modal 
        isOpen={isNewRaffleModalOpen} 
        onClose={() => { setIsNewRaffleModalOpen(false); setPendingRaffleImage(null); }} 
        title="Crear Nueva Rifa"
      >
        <form onSubmit={handleCreateRaffle} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Título de la Rifa</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej. Sorteo iPhone 15"
              value={newRaffleData.title}
              onChange={e => setNewRaffleData({...newRaffleData, title: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Precio por Número</label>
              <input 
                required
                type="number" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={newRaffleData.price}
                onChange={e => setNewRaffleData({...newRaffleData, price: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Total Números</label>
              <input 
                required
                type="number" 
                max="1000"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={newRaffleData.totalTickets}
                onChange={e => setNewRaffleData({...newRaffleData, totalTickets: parseInt(e.target.value)})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Formato de Cifras</label>
            <select 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              value={newRaffleData.digitCount}
              onChange={e => setNewRaffleData({...newRaffleData, digitCount: parseInt(e.target.value)})}
            >
              {DIGIT_COUNT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1 italic">
              * El rango se ajustará automáticamente desde 0 hasta el total de números menos uno.
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Descripción</label>
            <textarea 
              required
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe el premio y condiciones..."
              value={newRaffleData.description}
              onChange={e => setNewRaffleData({...newRaffleData, description: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Imagen del premio (opcional)</label>
            {pendingRaffleImage ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 truncate flex-1">{pendingRaffleImage.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingRaffleImage(null)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 underline shrink-0"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setPendingRaffleImage(file);
                }}
              />
            )}
            <p className="text-[10px] text-slate-400 mt-1 italic">
              También puedes subirla después en Configuración de la rifa.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear e Inicializar Rifa'}
          </button>
        </form>
      </Modal>

      {/* Config Modal */}
      <Modal 
        isOpen={isConfigModalOpen} 
        onClose={() => setIsConfigModalOpen(false)} 
        title="Configuración de la Rifa"
      >
        <form onSubmit={handleUpdateConfig} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Título</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              value={configFormData.title}
              onChange={e => setConfigFormData({...configFormData, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Precio</label>
            <input 
              required
              type="number" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              value={configFormData.price}
              onChange={e => setConfigFormData({...configFormData, price: parseInt(e.target.value)})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Descripción</label>
            <textarea 
              required
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              value={configFormData.description}
              onChange={e => setConfigFormData({...configFormData, description: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Imagen del premio</label>
            {configFormData.imageUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-square max-w-[200px] rounded-2xl overflow-hidden border border-slate-200">
                  <img
                    src={configFormData.imageUrl}
                    alt="Vista previa del premio"
                    className="w-full h-full object-cover"
                  />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingImage}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !currentRaffle) return;
                    setUploadingImage(true);
                    try {
                      const url = await uploadReceipt(currentRaffle.id, currentRaffle.title, null, file);
                      setConfigFormData(prev => ({ ...prev, imageUrl: url }));
                      showToast("Imagen subida. Guarda para aplicar los cambios.");
                    } catch {
                      showToast("Error al subir la imagen", "error");
                    } finally {
                      setUploadingImage(false);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setConfigFormData(prev => ({ ...prev, imageUrl: '' }))}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
                >
                  Quitar imagen
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                disabled={uploadingImage || !currentRaffle}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !currentRaffle) return;
                  setUploadingImage(true);
                  try {
                    const url = await uploadReceipt(currentRaffle.id, currentRaffle.title, null, file);
                    setConfigFormData(prev => ({ ...prev, imageUrl: url }));
                    showToast("Imagen subida. Guarda para aplicar los cambios.");
                  } catch {
                    showToast("Error al subir la imagen", "error");
                  } finally {
                    setUploadingImage(false);
                    e.target.value = '';
                  }
                }}
              />
            )}
            {uploadingImage && (
              <p className="text-xs text-indigo-600 font-bold mt-2 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Subiendo imagen...
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </Modal>

      {/* Edit Ticket Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={`Editar Ticket #${selectedTicket?.id}`}
      >
        <form onSubmit={handleUpdateTicket} className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Estado del Ticket</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                value={editFormData.status}
                onChange={e => setEditFormData({...editFormData, status: e.target.value as TicketStatus})}
              >
                {TICKET_STATUS_OPTIONS.filter(opt => opt.value !== 'all').map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={editFormData.buyerName || ''}
                onChange={e => setEditFormData({...editFormData, buyerName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Teléfono</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={editFormData.buyerPhone || ''}
                onChange={e => setEditFormData({...editFormData, buyerPhone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Asesor</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={editFormData.advisor || ''}
                onChange={e => setEditFormData({...editFormData, advisor: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Comprobante de Pago</label>
              {editFormData.receiptUrl ? (
                <div className="space-y-3">
                  <div className="relative group">
                    <img 
                      src={editFormData.receiptUrl} 
                      alt="Comprobante" 
                      className="w-full h-64 object-contain rounded-2xl border border-slate-200 bg-slate-900"
                    />
                    <a 
                      href={editFormData.receiptUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl text-white font-bold text-sm"
                    >
                      Click para ver completo
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (editFormData.receiptUrl) {
                        try {
                          await deleteReceipt(editFormData.receiptUrl);
                          setEditFormData({ ...editFormData, receiptUrl: '' });
                          showToast("Comprobante eliminado");
                        } catch {
                          showToast("Error al eliminar el comprobante", "error");
                        }
                      }
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
                  >
                    Eliminar y subir otro
                  </button>
                </div>
              ) : (
                <input 
                  type="file" 
                  accept="image/*"
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && currentRaffle && selectedTicket) {
                      setLoading(true);
                      try {
                        const url = await uploadReceipt(currentRaffle.id, currentRaffle.title, selectedTicket.id, file);
                        setEditFormData({ ...editFormData, receiptUrl: url });
                        showToast("Comprobante subido correctamente");
                      } catch {
                        showToast("Error al subir la imagen", "error");
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg">
            Guardar
          </button>
        </form>
      </Modal>

      {/* Reset Modal */}
      <Modal 
        isOpen={isResetModalOpen} 
        onClose={() => setIsResetModalOpen(false)} 
        title="¿Resetear Número?"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl text-sm border border-rose-100">
            Se borrarán todos los datos del comprador para el ticket <strong>#{selectedTicket?.id}</strong>.
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-3 font-bold bg-slate-100 rounded-xl">Cancelar</button>
            <button onClick={handleConfirmReset} className="flex-1 py-3 font-bold bg-rose-600 text-white rounded-xl">Resetear</button>
          </div>
        </div>
      </Modal>

      {/* Delete Raffle Modal */}
      <Modal 
        isOpen={isDeleteRaffleModalOpen} 
        onClose={() => setIsDeleteRaffleModalOpen(false)} 
        title="¿Eliminar Rifa Completamente?"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl text-sm border border-rose-100">
            <p className="font-black mb-2">¡ADVERTENCIA!</p>
            <p>Se eliminará la rifa <strong>{currentRaffle?.title}</strong>, todos sus números, ventas y datos de compradores. Esta acción no se puede deshacer.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsDeleteRaffleModalOpen(false)} className="flex-1 py-3 font-bold bg-slate-100 rounded-xl">Cancelar</button>
            <button onClick={handleDeleteRaffle} className="flex-1 py-3 font-bold bg-rose-600 text-white rounded-xl">Eliminar Rifa</button>
          </div>
        </div>
      </Modal>

      {/* Toast Notifications */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;
