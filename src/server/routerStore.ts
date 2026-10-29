import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MikroTikRouterConfig, MikroTikAuditLog } from '../types/mikrotik';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ROUTERS_FILE = path.join(DATA_DIR, 'mikrotik_routers.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'mikrotik_audit_logs.json');

const ENCRYPTION_KEY = (process.env.MIKROTIK_SECRET_KEY || 'tamim-super-net-mikrotik-sec-2026').padEnd(32, '0').slice(0, 32);
const IV_LENGTH = 16;

function encryptPassword(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptPassword(text: string): string {
  if (!text) return '';
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text;
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return text;
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Initial demo router configurations if no file exists yet
const SEED_ROUTERS: MikroTikRouterConfig[] = [
  {
    id: 'router-core-ccr',
    name: 'Tamim Core CCR2004 (Main BDIX & Gateway)',
    host: '103.147.168.10',
    port: 8728,
    useSsl: false,
    username: 'tamim_admin',
    password: encryptPassword('TamimNet#2026!'),
    hasPassword: true,
    status: 'offline',
    lastChecked: new Date().toISOString(),
    assignedResellerIds: ['all'],
    allowedFeatures: ['pppoe', 'hotspot', 'traffic', 'profiles', 'active_sessions'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'router-reseller-hub-01',
    name: 'North Zone CCR - Reseller Hub 1',
    host: '103.147.168.12',
    port: 8728,
    useSsl: false,
    username: 'api_reseller',
    password: encryptPassword('ResellerPass@2026'),
    hasPassword: true,
    status: 'offline',
    lastChecked: new Date().toISOString(),
    assignedResellerIds: ['RES-01', 'reseller-active', 'reseller-1'],
    allowedFeatures: ['pppoe', 'active_sessions', 'traffic', 'profiles'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export class RouterStore {
  private static routers: MikroTikRouterConfig[] = [];
  private static logs: MikroTikAuditLog[] = [];
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;
    ensureDataDir();

    try {
      if (fs.existsSync(ROUTERS_FILE)) {
        const raw = fs.readFileSync(ROUTERS_FILE, 'utf-8');
        this.routers = JSON.parse(raw);
      } else {
        this.routers = SEED_ROUTERS;
        this.persistRouters();
      }
    } catch (e) {
      console.error('Failed to load routers from disk:', e);
      this.routers = SEED_ROUTERS;
    }

    try {
      if (fs.existsSync(AUDIT_LOGS_FILE)) {
        const raw = fs.readFileSync(AUDIT_LOGS_FILE, 'utf-8');
        this.logs = JSON.parse(raw);
      } else {
        this.logs = [];
      }
    } catch (e) {
      this.logs = [];
    }

    this.isInitialized = true;
  }

  private static persistRouters(): void {
    ensureDataDir();
    fs.writeFileSync(ROUTERS_FILE, JSON.stringify(this.routers, null, 2), 'utf-8');
  }

  private static persistLogs(): void {
    ensureDataDir();
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(this.logs.slice(-500), null, 2), 'utf-8');
  }

  /**
   * Return routers sanitized for client transmission (no passwords)
   * Strictly filters routers based on caller role and reseller ID
   */
  public static getRoutersForUser(role: string, resellerId?: string): MikroTikRouterConfig[] {
    this.initialize();

    const isSuperAdmin = role === 'Super Admin' || role === 'CEO' || role === 'Admin' || role === 'Master';

    const filtered = this.routers.filter((r) => {
      if (isSuperAdmin) return true;
      if (!resellerId) return false;
      return (
        r.assignedResellerIds.includes('all') ||
        r.assignedResellerIds.includes(resellerId)
      );
    });

    return filtered.map((r) => this.sanitize(r));
  }

  /**
   * Get raw router with decrypted password (INTERNAL SERVER USE ONLY)
   */
  public static getRawRouterById(id: string): (MikroTikRouterConfig & { plainPassword?: string }) | null {
    this.initialize();
    const router = this.routers.find((r) => r.id === id);
    if (!router) return null;
    return {
      ...router,
      plainPassword: decryptPassword(router.password || ''),
    };
  }

  public static addRouter(
    data: Omit<MikroTikRouterConfig, 'id' | 'createdAt' | 'updatedAt'>,
    operator: { id: string; name: string; role: string }
  ): MikroTikRouterConfig {
    this.initialize();

    const newRouter: MikroTikRouterConfig = {
      ...data,
      id: `router-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      password: data.password ? encryptPassword(data.password) : '',
      hasPassword: Boolean(data.password),
      status: 'offline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.routers.unshift(newRouter);
    this.persistRouters();

    this.logAction({
      userId: operator.id,
      userName: operator.name,
      userRole: operator.role,
      routerId: newRouter.id,
      routerName: newRouter.name,
      action: 'CREATE_ROUTER',
      details: `Created MikroTik router: ${newRouter.name} (${newRouter.host}:${newRouter.port})`,
      status: 'success',
    });

    return this.sanitize(newRouter);
  }

  public static updateRouter(
    id: string,
    data: Partial<MikroTikRouterConfig>,
    operator: { id: string; name: string; role: string }
  ): MikroTikRouterConfig | null {
    this.initialize();
    const idx = this.routers.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const current = this.routers[idx];
    const updated: MikroTikRouterConfig = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // If new password passed, encrypt it; otherwise keep existing encrypted password
    if (data.password !== undefined && data.password !== '') {
      updated.password = encryptPassword(data.password);
      updated.hasPassword = true;
    } else {
      updated.password = current.password;
      updated.hasPassword = current.hasPassword;
    }

    this.routers[idx] = updated;
    this.persistRouters();

    this.logAction({
      userId: operator.id,
      userName: operator.name,
      userRole: operator.role,
      routerId: id,
      routerName: updated.name,
      action: 'UPDATE_ROUTER',
      details: `Updated router parameters for: ${updated.name}`,
      status: 'success',
    });

    return this.sanitize(updated);
  }

  public static updateRouterStatus(
    id: string,
    status: 'online' | 'offline' | 'checking' | 'error',
    error?: string,
    systemInfo?: any
  ): void {
    this.initialize();
    const router = this.routers.find((r) => r.id === id);
    if (!router) return;

    router.status = status;
    router.lastChecked = new Date().toISOString();
    if (error !== undefined) router.lastError = error;
    if (systemInfo) router.systemInfo = systemInfo;

    this.persistRouters();
  }

  public static deleteRouter(id: string, operator: { id: string; name: string; role: string }): boolean {
    this.initialize();
    const idx = this.routers.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    const router = this.routers[idx];
    this.routers.splice(idx, 1);
    this.persistRouters();

    this.logAction({
      userId: operator.id,
      userName: operator.name,
      userRole: operator.role,
      routerId: id,
      routerName: router.name,
      action: 'DELETE_ROUTER',
      details: `Permanently deleted router configuration: ${router.name}`,
      status: 'success',
    });

    return true;
  }

  public static logAction(data: Omit<MikroTikAuditLog, 'id' | 'timestamp'>): void {
    this.initialize();
    const log: MikroTikAuditLog = {
      ...data,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(log);
    this.persistLogs();
  }

  public static getLogs(routerId?: string): MikroTikAuditLog[] {
    this.initialize();
    if (routerId) {
      return this.logs.filter((l) => l.routerId === routerId);
    }
    return this.logs;
  }

  /**
   * Sanitize router object so passwords never reach client
   */
  public static sanitize(router: MikroTikRouterConfig): MikroTikRouterConfig {
    const copy = { ...router };
    delete copy.password;
    copy.hasPassword = Boolean(router.password);
    return copy;
  }
}
