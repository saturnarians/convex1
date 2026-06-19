"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartProps {
  title: string;
  description: string;
  data: ChartDataPoint[];
  maxValue?: number;
}

export function SimpleChart({ title, description, data, maxValue }: ChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const normalizedData = data.map((d) => ({
    ...d,
    height: (d.value / max) * 100,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {normalizedData.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-slate-400">
            No chart data yet.
          </div>
        ) : null}
        {normalizedData.length > 0 ? (
        <div className="flex items-end justify-between h-64 gap-2 p-4 glass-dark rounded-lg">
          {normalizedData.map((point, idx) => (
            <motion.div
              key={point.label}
              initial={{ height: 0 }}
              animate={{ height: `${point.height}%` }}
              transition={{ duration: 0.8, delay: idx * 0.1 }}
              className="flex-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-lg opacity-80 hover:opacity-100 transition-opacity group cursor-pointer relative"
            >
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-slate-400 whitespace-nowrap w-full text-center">
                {point.label}
              </div>
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {point.value}
              </div>
            </motion.div>
          ))}
        </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
