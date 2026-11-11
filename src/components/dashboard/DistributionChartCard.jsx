import React from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import CardTitle from './CardTitle';

const tooltipContentStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '0.8125rem',
};

/**
 * Tarjeta con gráfico de dona de días por categoría (rol, tipo, …).
 *
 * @param {Object} props
 * @param {Array<{name: string, value: number, fill: string}>} props.data
 */
export default function DistributionChartCard({ title, icon, iconBackground, data }) {
  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <CardTitle icon={icon} iconBackground={iconBackground}>
        {title}
      </CardTitle>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={55}
              paddingAngle={3}
              label={false}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value) => [`${value} días`, 'Duración']}
              contentStyle={tooltipContentStyle}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="chart-legend" aria-label={title}>
        {data.map(entry => <li key={entry.name}><span aria-hidden="true" style={{ background: entry.fill }}/><span>{entry.name}</span><strong>{entry.value} días</strong></li>)}
      </ul>
    </div>
  );
}
