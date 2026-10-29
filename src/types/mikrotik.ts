export interface MikroTikRouterConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  useSsl: boolean;
  username: string;
  password?: string; // Only provided when creating/updating from Super Admin; redacted in API responses
  hasPassword?: boolean;
  status: 'online' | 'offline' | 'checking' | 'error';
  lastChecked?: string;
  lastError?: string;
  assignedResellerIds: string[]; // List of reseller IDs or codes; ['all'] = shared by all resellers; empty = Super Admin only
  allowedFeatures: ('pppoe' | 'hotspot' | 'traffic' | 'profiles' | 'active_sessions')[];
  systemInfo?: MikroTikSystemResource;
  createdAt: string;
  updatedAt: string;
}

export interface MikroTikSystemResource {
  identity: string;
  uptime: string;
  version: string;
  cpu: string;
  cpuLoad: number;
  freeMemory: number;
  totalMemory: number;
  freeHdd: number;
  totalHdd: number;
  boardName: string;
  architecture: string;
  activeSessionsCount?: number;
  totalSecretsCount?: number;
}

export interface PPPoESecret {
  id: string; // RouterOS .id (e.g. *1)
  name: string; // Username
  password?: string;
  service: string; // 'pppoe' | 'any'
  profile: string; // Bandwidth profile
  localAddress?: string;
  remoteAddress?: string;
  disabled: boolean;
  comment?: string;
  lastCallerId?: string;
  lastDisconnectReason?: string;
  lastLoggedOut?: string;
  resellerId?: string;
}

export interface PPPoEActiveSession {
  id: string;
  name: string;
  service: string;
  callerId: string; // MAC Address
  address: string; // Assigned IP
  uptime: string;
  encoding?: string;
  sessionId?: string;
  limitBytesIn?: number;
  limitBytesOut?: number;
}

export interface HotspotUser {
  id: string;
  name: string;
  profile: string;
  uptime?: string;
  bytesIn?: number;
  bytesOut?: number;
  disabled: boolean;
  comment?: string;
}

export interface HotspotActiveSession {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
}

export interface MikroTikProfile {
  id: string;
  name: string;
  rateLimit?: string;
  localAddress?: string;
  remoteAddress?: string;
  onlyOne?: string;
}

export interface InterfaceTraffic {
  interfaceName: string;
  rxBps: number;
  txBps: number;
  rxPps: number;
  txPps: number;
  timestamp: number;
}

export interface MikroTikAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  routerId: string;
  routerName: string;
  action: string;
  details: string;
  status: 'success' | 'failure';
}
