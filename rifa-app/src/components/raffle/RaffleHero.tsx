import React from 'react';
import { Smartphone } from 'lucide-react';
import type { AppConfig } from '../../types';

interface RaffleHeroProps {
  config: AppConfig;
  soldCount: number;
}

export const RaffleHero: React.FC<RaffleHeroProps> = ({ config, soldCount }) => {
  const progress = Math.min((soldCount / config.totalTickets) * 100, 100);

  return (
    <section className="w-full bg-white rounded-3xl p-5 sm:p-8 md:p-10 shadow-sm border border-slate-100 flex flex-col md:flex-row items-stretch gap-6 md:gap-10 mb-12 overflow-visible">
      
      {/* Contenedor de la Imagen - Flexible y adaptable */}
      <div className="w-full md:w-1/2 flex flex-col justify-start relative">
        <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-lg opacity-20"></div>
        <div className="relative bg-slate-900 rounded-2xl aspect-square w-full max-w-[320px] mx-auto md:max-w-none flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
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

      {/* Contenedor del Texto - Crecimiento vertical garantizado */}
      <div className="w-full md:w-1/2 flex flex-col justify-between space-y-6 h-full min-w-0">
        <div className="space-y-4">
          <div>
            <span className="inline-block bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-3">
              Sorteo Especial
            </span>
            {/* break-words evita que títulos larguísimos rompan la pantalla hacia los lados */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight break-words">
              {config.title}
            </h2>
          </div>

          {/* Renderiza saltos de línea reales (\n) y ajusta su tamaño si hay mucha data */}
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed whitespace-pre-line break-words clear-both">
            {config.description}
          </p>
        </div>

        {/* Sección de progreso de boletas al final del flujo */}
        <div className="space-y-3 pt-4 md:pt-0">
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
  );
};