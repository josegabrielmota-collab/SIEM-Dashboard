export interface ApiStatusResponse {
  ok: boolean;
  message?: string;
  data?: unknown;
}

export interface WazuhAlert {
  id: string | null;
  timestamp: string | null;
  level: number | null;
  description: string | null;
  groups: string[];
  agentName: string | null;
  agentIp: string | null;
  managerName: string | null;
  location: string | null;
  srcIp: string | null;
  dstIp: string | null;
  mitreTactic: string[];
  mitreTechnique: string[];
  fullLog: string | null;
}

export interface AlertListResponse {
  ok: boolean;
  total: number;
  alerts: WazuhAlert[];
}

export interface CountItem {
  label: string;
  count: number;
}

export interface CountListResponse {
  ok: boolean;
  data: CountItem[];
}
