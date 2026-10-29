import { Router, Request, Response } from 'express';
import { RouterStore } from './routerStore';
import { MikroTikClient } from './mikrotikClient';

export const mikrotikRouter = Router();

// Helper to extract user identity from headers
function getCaller(req: Request) {
  const role = (req.headers['x-user-role'] as string) || 'Guest';
  const userId = (req.headers['x-user-id'] as string) || 'guest';
  const userName = (req.headers['x-user-name'] as string) || 'Guest User';
  const resellerId = (req.headers['x-reseller-id'] as string) || undefined;
  const isSuperAdmin = ['Super Admin', 'CEO', 'Admin', 'Master'].includes(role);

  return { role, userId, userName, resellerId, isSuperAdmin };
}

// 1. List routers available to caller
mikrotikRouter.get('/routers', (req: Request, res: Response) => {
  try {
    const { role, resellerId } = getCaller(req);
    const routers = RouterStore.getRoutersForUser(role, resellerId);
    res.json({ success: true, routers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Create router (Super Admin only)
mikrotikRouter.post('/routers', (req: Request, res: Response) => {
  try {
    const caller = getCaller(req);
    if (!caller.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'অননুমোদিত: শুধুমাত্র সুপার এডমিন বা সিইও নতুন মিক্রোটিক রাউটার যুক্ত করতে পারবেন।',
      });
    }

    const { name, host, port, useSsl, username, password, assignedResellerIds, allowedFeatures } = req.body;
    if (!name || !host || !username) {
      return res.status(400).json({
        success: false,
        error: 'রাউটারের নাম, হোস্ট (আইপি) এবং ইউজারনেম আবশ্যক।',
      });
    }

    const created = RouterStore.addRouter(
      {
        name,
        host,
        port: Number(port) || 8728,
        useSsl: Boolean(useSsl),
        username,
        password: password || '',
        status: 'offline',
        assignedResellerIds: Array.isArray(assignedResellerIds) ? assignedResellerIds : ['all'],
        allowedFeatures: Array.isArray(allowedFeatures)
          ? allowedFeatures
          : ['pppoe', 'hotspot', 'traffic', 'profiles', 'active_sessions'],
      },
      { id: caller.userId, name: caller.userName, role: caller.role }
    );

    res.json({ success: true, router: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Update router (Super Admin only)
mikrotikRouter.put('/routers/:id', (req: Request, res: Response) => {
  try {
    const caller = getCaller(req);
    if (!caller.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'অননুমোদিত: রাউটার কনফিগারেশন এডিট করার অনুমতি আপনার নেই।',
      });
    }

    const { id } = req.params;
    const updated = RouterStore.updateRouter(id, req.body, {
      id: caller.userId,
      name: caller.userName,
      role: caller.role,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'রাউটার খুঁজে পাওয়া যায়নি।' });
    }

    res.json({ success: true, router: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Delete router (Super Admin only)
mikrotikRouter.delete('/routers/:id', (req: Request, res: Response) => {
  try {
    const caller = getCaller(req);
    if (!caller.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'অননুমোদিত: রাউটার ডিলিট করার অনুমতি নেই।',
      });
    }

    const { id } = req.params;
    const ok = RouterStore.deleteRouter(id, {
      id: caller.userId,
      name: caller.userName,
      role: caller.role,
    });

    if (!ok) {
      return res.status(404).json({ success: false, error: 'রাউটার খুঁজে পাওয়া যায়নি।' });
    }

    res.json({ success: true, message: 'রাউটার সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to get authorized raw router for an operation
function getAuthorizedRawRouter(routerId: string, req: Request) {
  const caller = getCaller(req);
  const raw = RouterStore.getRawRouterById(routerId);
  if (!raw) {
    throw new Error('রাউটার খুঁজে পাওয়া যায়নি।');
  }

  if (!caller.isSuperAdmin) {
    const isAssigned =
      raw.assignedResellerIds.includes('all') ||
      (caller.resellerId && raw.assignedResellerIds.includes(caller.resellerId));
    if (!isAssigned) {
      throw new Error('অননুমোদিত: এই রাউটারটিতে আপনার রিসেলার অ্যাকাউন্টের অ্যাক্সেস নেই।');
    }
  }

  return { raw, caller };
}

// 5. Test Live Connection to RouterOS
mikrotikRouter.post('/routers/:id/test', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { raw, caller } = getAuthorizedRawRouter(id, req);

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
      timeoutMs: 6500,
    });

    const startTime = Date.now();
    await client.connect();
    const systemInfo = await client.getSystemInfo();
    const latency = Date.now() - startTime;
    client.close();

    RouterStore.updateRouterStatus(id, 'online', undefined, systemInfo);

    RouterStore.logAction({
      userId: caller.userId,
      userName: caller.userName,
      userRole: caller.role,
      routerId: id,
      routerName: raw.name,
      action: 'TEST_CONNECTION',
      details: `Successful connection test to ${raw.name} (${raw.host}). Latency: ${latency}ms, CPU: ${systemInfo.cpuLoad}%`,
      status: 'success',
    });

    res.json({
      success: true,
      status: 'online',
      latency,
      systemInfo,
      message: `রাউটার অনলাইনে আছে! সংযোগ সফল (${latency}ms)`,
    });
  } catch (err: any) {
    const errMsg = err.message || 'রাউটারে সংযোগ করা সম্ভব হয়নি।';
    RouterStore.updateRouterStatus(id, 'offline', errMsg);

    res.json({
      success: false,
      status: 'offline',
      error: errMsg,
    });
  }
});

// 6. Get System Resources & Interfaces
mikrotikRouter.get('/routers/:id/system', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { raw } = getAuthorizedRawRouter(id, req);

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
    });

    await client.connect();
    const systemInfo = await client.getSystemInfo();
    const interfaces = await client.getInterfaces();
    client.close();

    RouterStore.updateRouterStatus(id, 'online', undefined, systemInfo);

    res.json({
      success: true,
      systemInfo,
      interfaces,
    });
  } catch (err: any) {
    RouterStore.updateRouterStatus(id, 'offline', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

// 7. Get PPPoE Secrets
mikrotikRouter.get('/routers/:id/pppoe/secrets', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { raw, caller } = getAuthorizedRawRouter(id, req);
    if (!raw.allowedFeatures.includes('pppoe')) {
      return res.status(403).json({ success: false, error: 'এই রাউটারে PPPoE সেবা অ্যাক্সেস বন্ধ রয়েছে।' });
    }

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
    });

    await client.connect();
    let secrets = await client.getPPPoESecrets();
    client.close();

    // If caller is reseller, filter secrets tagged with their reseller identifier or prefix
    if (!caller.isSuperAdmin && caller.resellerId) {
      secrets = secrets.filter(
        (s) =>
          !s.comment ||
          s.comment.includes(caller.resellerId!) ||
          s.name.startsWith(caller.resellerId!.toLowerCase())
      );
    }

    res.json({ success: true, secrets });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 8. Add PPPoE Secret
mikrotikRouter.post('/routers/:id/pppoe/secrets', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { raw, caller } = getAuthorizedRawRouter(id, req);
    if (!raw.allowedFeatures.includes('pppoe')) {
      return res.status(403).json({ success: false, error: 'এই রাউটারে PPPoE যুক্ত করার অনুমতি নেই।' });
    }

    const { name, password, profile, localAddress, remoteAddress, comment } = req.body;
    if (!name || !password) {
      return res.status(400).json({ success: false, error: 'ইউজারনেম ও পাসওয়ার্ড আবশ্যক।' });
    }

    // Append reseller tag to comment for multi-tenant isolation
    const resellerTag = caller.isSuperAdmin ? '' : ` [RES:${caller.resellerId}]`;
    const finalComment = (comment || '') + resellerTag;

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
    });

    await client.connect();
    const resultId = await client.addPPPoESecret({
      name,
      password,
      profile,
      localAddress,
      remoteAddress,
      comment: finalComment.trim(),
    });
    client.close();

    RouterStore.logAction({
      userId: caller.userId,
      userName: caller.userName,
      userRole: caller.role,
      routerId: id,
      routerName: raw.name,
      action: 'ADD_PPPOE_SECRET',
      details: `Added PPPoE user "${name}" with profile "${profile || 'default'}"`,
      status: 'success',
    });

    res.json({ success: true, secretId: resultId, message: 'PPPoE ইউজার সফলভাবে তৈরি হয়েছে।' });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 9. Update PPPoE Secret
mikrotikRouter.put('/routers/:id/pppoe/secrets/:secretId', async (req: Request, res: Response) => {
  const { id, secretId } = req.params;
  try {
    const { raw, caller } = getAuthorizedRawRouter(id, req);
    const { password, profile, disabled, comment, remoteAddress } = req.body;

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
    });

    await client.connect();
    await client.updatePPPoESecret(secretId, {
      password,
      profile,
      disabled,
      comment,
      remoteAddress,
    });
    client.close();

    RouterStore.logAction({
      userId: caller.userId,
      userName: caller.userName,
      userRole: caller.role,
      routerId: id,
      routerName: raw.name,
      action: 'UPDATE_PPPOE_SECRET',
      details: `Updated PPPoE secret ${secretId}`,
      status: 'success',
    });

    res.json({ success: true, message: 'PPPoE অ্যাকাউন্ট আপডেট সম্পন্ন।' });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 10. Remove PPPoE Secret
mikrotikRouter.delete('/routers/:id/pppoe/secrets/:secretId', async (req: Request, res: Response) => {
  const { id, secretId } = req.params;
  try {
    const { raw, caller } = getAuthorizedRawRouter(id, req);

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
    });

    await client.connect();
    await client.removePPPoESecret(secretId);
    client.close();

    RouterStore.logAction({
      userId: caller.userId,
      userName: caller.userName,
      userRole: caller.role,
      routerId: id,
      routerName: raw.name,
      action: 'DELETE_PPPOE_SECRET',
      details: `Removed PPPoE secret ${secretId}`,
      status: 'success',
    });

    res.json({ success: true, message: 'PPPoE অ্যাকাউন্ট ডিলিট সম্পন্ন।' });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 11. Get Active PPPoE Sessions
mikrotikRouter.get('/routers/:id/pppoe/active', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { raw, caller } = getAuthorizedRawRouter(id, req);

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
    });

    await client.connect();
    let sessions = await client.getPPPoEActive();
    client.close();

    if (!caller.isSuperAdmin && caller.resellerId) {
      sessions = sessions.filter((s) => s.name.startsWith(caller.resellerId!.toLowerCase()));
    }

    res.json({ success: true, sessions });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 12. Kick / Terminate Active PPPoE Session
mikrotikRouter.delete('/routers/:id/pppoe/active/:sessionId', async (req: Request, res: Response) => {
  const { id, sessionId } = req.params;
  try {
    const { raw, caller } = getAuthorizedRawRouter(id, req);

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
    });

    await client.connect();
    await client.disconnectPPPoEActive(sessionId);
    client.close();

    RouterStore.logAction({
      userId: caller.userId,
      userName: caller.userName,
      userRole: caller.role,
      routerId: id,
      routerName: raw.name,
      action: 'DISCONNECT_PPPOE_ACTIVE',
      details: `Terminated active PPPoE session ${sessionId}`,
      status: 'success',
    });

    res.json({ success: true, message: 'সেশন সফলভাবে বিচ্ছিন্ন (Disconnected) করা হয়েছে।' });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 13. Get Hotspot Users
mikrotikRouter.get('/routers/:id/hotspot/users', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { raw } = getAuthorizedRawRouter(id, req);
    if (!raw.allowedFeatures.includes('hotspot')) {
      return res.status(403).json({ success: false, error: 'এই রাউটারে হটস্পট সেবা অনুমোদিত নয়।' });
    }

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
    });

    await client.connect();
    const users = await client.getHotspotUsers();
    client.close();

    res.json({ success: true, users });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 14. Add Hotspot User
mikrotikRouter.post('/routers/:id/hotspot/users', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { raw, caller } = getAuthorizedRawRouter(id, req);
    if (!raw.allowedFeatures.includes('hotspot')) {
      return res.status(403).json({ success: false, error: 'এই রাউটারে হটস্পট সেবা অনুমোদিত নয়।' });
    }

    const { name, password, profile, comment } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'হটস্পট ইউজারনেম আবশ্যক।' });
    }

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
    });

    await client.connect();
    const resultId = await client.addHotspotUser({
      name,
      password,
      profile,
      comment,
    });
    client.close();

    RouterStore.logAction({
      userId: caller.userId,
      userName: caller.userName,
      userRole: caller.role,
      routerId: id,
      routerName: raw.name,
      action: 'ADD_HOTSPOT_USER',
      details: `Added Hotspot user "${name}"`,
      status: 'success',
    });

    res.json({ success: true, userId: resultId, message: 'হটস্পট ইউজার তৈরি সম্পন্ন।' });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 15. Get Profiles (PPPoE + Hotspot)
mikrotikRouter.get('/routers/:id/profiles', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { raw } = getAuthorizedRawRouter(id, req);

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
    });

    await client.connect();
    const pppoeProfiles = await client.getPPPoEProfiles();
    let hotspotProfiles: any[] = [];
    if (raw.allowedFeatures.includes('hotspot')) {
      try {
        hotspotProfiles = await client.getHotspotProfiles();
      } catch {
        // ignore if hotspot not configured on router
      }
    }
    client.close();

    res.json({ success: true, pppoeProfiles, hotspotProfiles });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 16. Real-time Live Interface Traffic Monitor
mikrotikRouter.get('/routers/:id/traffic', async (req: Request, res: Response) => {
  const { id } = req.params;
  const interfaceName = (req.query.interface as string) || 'ether1';

  try {
    const { raw } = getAuthorizedRawRouter(id, req);

    const client = new MikroTikClient({
      host: raw.host,
      port: raw.port,
      username: raw.username,
      password: raw.plainPassword || '',
      useSsl: raw.useSsl,
      timeoutMs: 4000,
    });

    await client.connect();
    const traffic = await client.monitorInterfaceTraffic(interfaceName);
    client.close();

    res.json({ success: true, traffic });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 17. Audit Logs
mikrotikRouter.get('/audit-logs', (req: Request, res: Response) => {
  try {
    const { isSuperAdmin } = getCaller(req);
    if (!isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'অননুমোদিত' });
    }
    const routerId = req.query.routerId as string | undefined;
    const logs = RouterStore.getLogs(routerId);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
