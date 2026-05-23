import React from 'react';
import type { AdvisorStats } from '../../types';

interface AdvisorRankingProps {
  advisors: AdvisorStats[];
}

export const AdvisorRanking: React.FC<AdvisorRankingProps> = ({ advisors }) => {
  return (
    <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-black text-slate-900 uppercase text-sm tracking-widest">Ranking Asesores</h3>
      </div>
      <div className="space-y-4">
        {advisors.length > 0 ? advisors.map((adv, idx) => (
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
  );
};
