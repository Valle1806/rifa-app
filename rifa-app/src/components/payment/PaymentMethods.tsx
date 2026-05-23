import React from 'react';
import { Landmark, CheckCircle2 } from 'lucide-react';

export const PaymentMethods: React.FC = () => {
  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-sm mt-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 border-b border-indigo-100 pb-3 mb-5">
        <Landmark className="text-indigo-600 w-6 h-6 flex-shrink-0" />
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">
          ¿Cómo pagar tus boletas seleccionadas?
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
        {/* Bloque Bre-B */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <p className="font-bold text-slate-800 flex items-center gap-1.5 text-base">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Llaves Bre-B
          </p>
          <p className="text-xs text-slate-500">Transfiere usando cualquiera de estas dos llaves:</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="flex flex-col flex-1 min-w-[120px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1">Usuario</span>
              <code className="font-mono bg-slate-50 text-slate-800 px-2.5 py-2 rounded-lg border border-slate-200 font-bold text-center select-all cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                @crvacu
              </code>
            </div>
            <div className="flex flex-col flex-1 min-w-[120px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1">Celular</span>
              <code className="font-mono bg-slate-50 text-slate-800 px-2.5 py-2 rounded-lg border border-slate-200 font-bold text-center select-all cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                @3147285337
              </code>
            </div>
          </div>
          <p className="text-xs text-slate-400 italic pt-1">
            Titular: Cristian Camilo Vallecilla Cuellar
          </p>
        </div>

        {/* Bloque Nequi */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2 flex flex-col justify-between">
          <div>
            <p className="font-bold text-slate-800 flex items-center gap-1.5 text-base">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Cuenta Nequi
            </p>
            <div className="flex flex-col pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1">Número de Cuenta</span>
              <code className="font-mono bg-purple-50 text-purple-700 px-4 py-2.5 rounded-lg border border-purple-100 text-lg font-black text-center select-all cursor-pointer hover:bg-purple-100 transition-colors block w-full">
                3147285448
              </code>
            </div>
          </div>
          <p className="text-xs text-slate-400 italic pt-2 md:pt-0">
            Titular: Cristian Vallecilla
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 bg-amber-50/80 p-4 rounded-2xl border border-amber-100 text-xs text-amber-800 mt-5">
        <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="font-medium leading-relaxed">
          <strong>Instrucciones:</strong> Elige tus números preferidos, y no olvides realizar la transferencia por el valor total de tus boletas a cualquiera de las cuentas asignadas y recuerda adjuntar o enviar el comprobante de pago en el formulario para asegurar tu cupo.
        </p>
      </div>
    </div>
  );
};