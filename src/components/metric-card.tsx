"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  trend?: number;
  icon?: React.ReactNode;
  delay?: number;
}

export function MetricCard({
  title,
  value,
  description,
  trend,
  icon,
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="relative overflow-hidden group cursor-pointer hover:shadow-xl hover:shadow-blue-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {icon && <div className="text-blue-400">{icon}</div>}
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">{value}</span>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mb-2">
                {trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : trend < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <span className="text-slate-400 text-sm">0.0%</span>
                )}
                {trend !== 0 ? (
                  <span className={trend > 0 ? "text-green-400" : "text-red-400"}>
                    {Math.abs(trend)}%
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
