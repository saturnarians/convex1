export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: number;
  memberCount: number;
}

export interface DashboardChartPoint {
  label: string;
  value: number;
}

export interface DashboardReportRow {
  id: string;
  name: string;
  email: string;
  status: string;
  revenue: number;
  date: string;
}

export interface DashboardActivityItem {
  id: string;
  user: string;
  action: string;
  entity: string;
  createdAt: number;
  description?: string;
}

export interface DashboardEventItem {
  id: string;
  event: string;
  source: "sdk" | "auth" | "system";
  createdAt: number;
  ipAddress?: string;
  deviceHash?: string;
}

export interface DashboardSnapshot {
  workspace: WorkspaceSummary;
  metrics: {
    revenue: number;
    activeUsers: number;
    growth: number;
    uptime: number | null;
  };
  charts: {
    revenueTrend: DashboardChartPoint[];
    userGrowth: DashboardChartPoint[];
  };
  recentReports: DashboardReportRow[];
  recentActivity: DashboardActivityItem[];
  telemetryEvents: DashboardEventItem[];
}
