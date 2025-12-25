'use client';

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface HeatmapProps {
  data: { weekday: number; hour: number; count: number }[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CustomShape = (props: any) => {
  const { cx, cy, payload } = props;
  
  // Calculate color intensity based on count (Simple linear scale for now)
  // In a real app, you'd pass a maxCount to normalize this
  const opacity = Math.min(0.2 + (payload.count / 20), 1); 

  return (
    <rect
      x={cx - 15} // Center the rect
      y={cy - 15}
      width={30}
      height={30}
      fill={`rgba(37, 99, 235, ${opacity})`} // Tailwind blue-600
      rx={4} // Rounded corners
    />
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-sm">
        <p className="font-bold text-slate-800">{DAYS[data.weekday - 1]} at {data.hour}:00</p>
        <p className="text-blue-600 font-medium">{data.count} Visits</p>
      </div>
    );
  }
  return null;
};

export default function HeatmapChart({ data }: HeatmapProps) {
  // Ensure we have data for empty cells (optional, but makes grid look complete)
  // For now, we assume backend sends sparse data and we just plot points
  
  return (
    <div className="w-full h-[300px] bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-500 mb-4">Peak Traffic Hours</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <XAxis 
            type="number" 
            dataKey="hour" 
            name="Hour" 
            domain={[0, 23]} 
            tickCount={12}
            tickFormatter={(tick) => `${tick}:00`}
            className="text-xs"
          />
          <YAxis 
            type="number" 
            dataKey="weekday" 
            name="Day" 
            domain={[1, 7]} 
            tickFormatter={(tick) => DAYS[tick - 1]}
            className="text-xs font-medium"
          />
          <ZAxis type="number" dataKey="count" range={[0, 100]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} shape={<CustomShape />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

