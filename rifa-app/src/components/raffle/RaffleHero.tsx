import React from 'react';
import { Smartphone } from 'lucide-react';
import type { AppConfig } from '../../types';

interface RaffleHeroProps {
  config: AppConfig;
  soldCount: number;
}

export const RaffleHero: React.FC<RaffleHeroProps> = ({ config, soldCount }) => {
  const progress = (soldCount / config.totalTickets) * 100;

  return (
    <section className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 md:p-6 shadow-md shadow-indigo-200/20 border border-white/80 flex flex-col md:flex-row items-center gap-5 md:gap-6 mb-5">
      <div className="relative shrink-0 flex justify-center w-full md:w-auto">
        <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20" aria-hidden />
        <div className="relative w-48 h-48 sm:w-52 sm:h-52 md:w-60 md:h-60 lg:w-64 lg:h-64 bg-slate-900 rounded-2xl flex items-center justify-center border-2 border-white shadow-lg overflow-hidden">
          {config.imageUrl ? (
            <img
              src={config.imageUrl}
              alt={config.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Smartphone size={64} className="text-indigo-400" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 w-full space-y-2.5 text-center md:text-left">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
          <span className="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">
            Sorteo Especial
          </span>
          <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm sm:text-base font-black border border-indigo-500 shadow-sm">
            ${config.price.toLocaleString('es-CO')} COP
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight line-clamp-2">
          {config.title}
        </h2>

        <p className="text-slate-600 text-sm leading-snug line-clamp-2">
          {config.description}
        </p>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Progreso de ventas</span>
            <span>{soldCount} / {config.totalTickets}</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
