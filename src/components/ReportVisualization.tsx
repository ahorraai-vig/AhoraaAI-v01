import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "motion/react";

interface VisualizationProps {
  conversations: number;
  reservations: number;
  monthsActive: number;
}

export default function ReportVisualization({ conversations, reservations, monthsActive }: VisualizationProps) {
  const generateData = () => {
    const data = [];
    const maxRoi = conversations / 10;
    const maxSavings = reservations * 1.5;
    
    const actualMonths = Math.max(1, monthsActive || 1);

    for (let i = 1; i <= actualMonths; i++) {
      const progress = actualMonths === 1 ? 1 : (i - 1) / (actualMonths - 1);
      const curve = Math.pow(progress, 1.2);

      const minRoi = Math.min(10, maxRoi * 0.1); 
      const minSavings = Math.min(5, maxSavings * 0.1);

      data.push({
        name: `Mes ${i}`,
        roi: Number((minRoi + (maxRoi - minRoi) * curve).toFixed(1)),
        savings: Number((minSavings + (maxSavings - minSavings) * curve).toFixed(1)),
      });
    }
    
    return data;
  };

  const data = generateData();

  return (
    <motion.div
      key={conversations + reservations + monthsActive}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Proyección Continua de Impacto (AhorraAI ROI)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: '8px' }} />
            <Legend />
            <Line type="monotone" dataKey="roi" name="Crecimiento ROI (%)" stroke="#0d9488" strokeWidth={2} />
            <Line type="monotone" dataKey="savings" name="Tiempo Ahorrado (h)" stroke="#6366f1" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
