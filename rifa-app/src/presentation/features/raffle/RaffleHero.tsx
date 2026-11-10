import { Gift } from 'lucide-react';
import { formatMoney, type Raffle } from '../../../domain';
import { ProgressBar } from './ProgressBar';

export const RaffleHero = ({ raffle, soldCount }: { raffle: Raffle; soldCount: number }) => (
  <section className="bg-white rounded-3xl p-5 sm:p-8 md:p-10 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 md:gap-10">
    <div className="w-full md:w-1/2">
      <div className="bg-slate-900 rounded-2xl aspect-square w-full max-w-[320px] mx-auto md:max-w-none flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
        {raffle.imageUrl ? (
          <img src={raffle.imageUrl} alt={`Premio: ${raffle.title}`} className="w-full h-full object-cover" />
        ) : (
          <Gift size={64} className="text-indigo-400" aria-hidden="true" />
        )}
      </div>
    </div>

    <div className="w-full md:w-1/2 flex flex-col justify-between gap-6 min-w-0">
      <div className="space-y-4">
        <span className="inline-block bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
          {formatMoney(raffle.price)} por número
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight break-words text-balance">
          {raffle.title}
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed whitespace-pre-line break-words">
          {raffle.description}
        </p>
      </div>
      <ProgressBar label="Números vendidos" value={soldCount} total={raffle.totalTickets} />
    </div>
  </section>
);
