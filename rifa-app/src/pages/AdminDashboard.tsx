import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { 
  subscribeToTickets, 
  updateTicketStatus, 
  resetTicket, 
  subscribeToRaffles, 
  createRaffle, 
  updateRaffleConfig,
  getLatestRaffle,
  getPrivateTicketData,
  deleteRaffle,
  uploadReceipt,
  subscribeToAuditLogs
} from '../services/ticketService';
import type { Ticket, TicketStatus, AdvisorStats, AppConfig } from '../types';
import Modal from '../components/common/Modal';
import { 
  ShieldCheck, LogOut, DollarSign, Users, Ticket as TicketIcon, 
  Search, Edit2, RotateCcw, Plus, Settings, ChevronRight, Loader2, XCircle, Image as ImageIcon, ClipboardList
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

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
  const [showOnlyWithReceipt, setShowOnlyWithReceipt] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteRaffleModalOpen, setIsDeleteRaffleModalOpen] = useState(false);
  const [isNewRaffleModalOpen, setIsNewRaffleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  const [editFormData, setEditFormData] = useState<Partial<Ticket>>({});
  const [newRaffleData, setNewRaffleData] = useState({ title: '', price: 50000, description: '', totalTickets: 100, digitCount: 2 });
  const [configFormData, setConfigFormData] = useState({ title: '', price: 0, description: '' });
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Subscribe to all raffles
  useEffect(() => {
    const unsub = subscribeToRaffles(setRaffles);
    return () => unsub();
  }, []);

  // Handle raffle selection and ticket subscription
  useEffect(() => {
    const init = async () => {
      const activeId = raffleId;

      if (!activeId) {
        const latest = await getLatestRaffle();
        if (latest) {
          navigate(`/admin/${latest.id}`, { replace: true });
          return;
        } else {
          setInitialLoading(false);
          return;
        }
      }

      const raffle = raffles.find(r => r.id === activeId);
      if (raffle) {
        setCurrentRaffle(raffle);
        setConfigFormData({ 
          title: raffle.title, 
          price: raffle.price, 
          description: raffle.description 
        });
        
        const unsubTickets = subscribeToTickets(activeId, setTickets);
        const unsubLogs = subscribeToAuditLogs(activeId, setAuditLogs);
        setInitialLoading(false);
        return () => {
          unsubTickets();
          unsubLogs();
        };
      } else if (raffles.length > 0) {
        // If raffleId not found but raffles exist, maybe still loading or invalid ID
        setInitialLoading(false);
      }
    };

    init();
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
    return tickets.filter(t => {
      const matchesSearch = t.id.includes(searchTerm) || 
                          t.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.advisor?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesReceipt = !showOnlyWithReceipt || t.hasReceipt;
      return matchesSearch && matchesStatus && matchesReceipt;
    });
  }, [tickets, searchTerm, statusFilter, showOnlyWithReceipt]);

  const handleLogout = () => signOut(auth);

  const handleCreateRaffle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const id = await createRaffle(newRaffleData);
      setIsNewRaffleModalOpen(false);
      navigate(`/admin/${id}`);
    } catch {
      alert("Error al crear rifa");
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
      setIsConfigModalOpen(false);
    } catch {
      alert("Error al actualizar configuración");
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
      navigate('/admin');
    } catch {
      alert("Error al eliminar la rifa");
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
      alert("Error al cargar datos privados");
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
    } catch {
      alert("Error al actualizar ticket");
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
    } catch {
      alert("Error al resetear ticket");
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
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl"><DollarSign size={24}/></div>
                  <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Recaudo Real</span>
                </div>
                <div className="text-3xl font-black text-slate-900">${stats.revenue.toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-1 font-bold">Solo tickets pagados</div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl"><TicketIcon size={24}/></div>
                  <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Ventas</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.sold} / {stats.total}</div>
                <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${(stats.sold/stats.total)*100}%` }}></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl"><Users size={24}/></div>
                  <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Reservas</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.reserved}</div>
                <div className="text-xs text-slate-400 mt-1 font-bold">Pendientes por pago</div>
              </div>

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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-slate-900">Listado de Números</h2>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar..."
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64 text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select 
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="disponible">Disponibles</option>
                  <option value="reservado">Reservados</option>
                  <option value="pagado_transferencia">Pagado (Transf.)</option>
                  <option value="pagado_efectivo">Pagado (Efec.)</option>
                </select>
                <button
                  onClick={() => setShowOnlyWithReceipt(!showOnlyWithReceipt)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold border transition flex items-center gap-2 ${
                    showOnlyWithReceipt 
                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon size={16} />
                  <span className="hidden md:inline">Solo Comprobantes</span>
                </button>
              </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500">ID</th>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500">Comprador</th>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500">Estado</th>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500">Asesor</th>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500">Img</th>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTickets.map(ticket => (
                          <tr key={ticket.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 font-black text-slate-900">#{ticket.id}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{ticket.buyerName || '---'}</span>
                                <span className="text-xs text-slate-400 font-medium">{ticket.buyerPhone || ''}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                ticket.status === 'disponible' ? 'bg-slate-100 text-slate-500' :
                                ticket.status === 'reservado' ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-600 text-sm">
                          {ticket.advisor || '---'}
                        </td>
                        <td className="px-6 py-4">
                          {ticket.hasReceipt && (
                            <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg inline-block">
                              <ImageIcon size={14} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleEditClick(ticket)}
                                  className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button 
                                  onClick={() => handleResetClick(ticket)}
                                  className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                                >
                                  <RotateCcw size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <aside className="space-y-10">
                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-900 uppercase text-sm tracking-widest">Ranking Asesores</h3>
                  </div>
                  <div className="space-y-4">
                    {stats.advisors.length > 0 ? stats.advisors.map((adv, idx) => (
                      <div key={adv.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">
                            {idx + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition">{adv.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{adv.totalSold} ventas</span>
                          </div>
                        </div>
                        <div className="font-black text-slate-900 text-sm">${adv.totalRevenue.toLocaleString()}</div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-slate-400 font-bold text-sm italic">
                        Sin ventas registradas
                      </div>
                    )}
                  </div>
                </section>

                {/* Audit Logs Section */}
                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <ClipboardList size={20} className="text-slate-400" />
                    <h3 className="font-black text-slate-900 uppercase text-sm tracking-widest">Registros (Auditoría)</h3>
                  </div>
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
                    {auditLogs.length > 0 ? auditLogs.map((log) => (
                      <div key={log.id} className="border-l-2 border-slate-100 pl-4 py-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black uppercase text-indigo-600">Ticket #{log.ticketId}</span>
                          <span className="text-[9px] text-slate-400 font-bold">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 leading-tight">
                          {log.action === 'reset' ? '🔄 Número reseteado' : 
                           log.action === 'status_change' ? `📝 Estado: ${log.newState.status?.replace('_', ' ')}` : 
                           '✏️ Datos modificados'}
                        </p>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-slate-400 font-bold text-xs italic">
                        Sin actividad registrada
                      </div>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>

      {/* New Raffle Modal */}
      <Modal 
        isOpen={isNewRaffleModalOpen} 
        onClose={() => setIsNewRaffleModalOpen(false)} 
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
              <option value={2}>2 Cifras (00 - 99)</option>
              <option value={3}>3 Cifras (000 - 999)</option>
              <option value={4}>4 Cifras (0000 - 9999)</option>
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
          <button
            type="submit"
            disabled={loading}
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
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Estado</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                value={editFormData.status}
                onChange={e => setEditFormData({...editFormData, status: e.target.value as TicketStatus})}
              >
                <option value="disponible">Disponible</option>
                <option value="reservado">Reservado</option>
                <option value="pagado_transferencia">Pagado (Transferencia)</option>
                <option value="pagado_efectivo">Pagado (Efectivo)</option>
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
                  <img 
                    src={editFormData.receiptUrl} 
                    alt="Comprobante" 
                    className="w-full h-48 object-cover rounded-2xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, receiptUrl: '' })}
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
                        const url = await uploadReceipt(currentRaffle.id, selectedTicket.id, file);
                        setEditFormData({ ...editFormData, receiptUrl: url });
                      } catch {
                        alert("Error al subir imagen");
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
    </div>
  );
};

export default AdminDashboard;
