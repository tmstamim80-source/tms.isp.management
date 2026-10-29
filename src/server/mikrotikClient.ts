import net from 'net';
import tls from 'tls';
import crypto from 'crypto';
import {
  MikroTikSystemResource,
  PPPoESecret,
  PPPoEActiveSession,
  HotspotUser,
  HotspotActiveSession,
  MikroTikProfile,
  InterfaceTraffic
} from '../types/mikrotik';

export interface RouterConnectionOptions {
  host: string;
  port: number;
  username: string;
  password?: string;
  useSsl?: boolean;
  timeoutMs?: number;
}

export class MikroTikClient {
  private socket: net.Socket | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private connected: boolean = false;
  private loggedIn: boolean = false;

  constructor(private options: RouterConnectionOptions) {}

  /**
   * Connect to RouterOS via TCP/TLS socket
   */
  public async connect(): Promise<void> {
    const timeout = this.options.timeoutMs || 7000;

    return new Promise((resolve, reject) => {
      let isSettled = false;

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.close();
          reject(new Error(`সংযোগ সময়সীমা উত্তীর্ণ (Timeout) - রাউটার ${this.options.host}:${this.options.port} থেকে কোনো সাড়া পাওয়া যায়নি। রাউটার অফলাইন হতে পারে বা ফায়ারওয়াল পোর্ট ৮৭২৮ ব্লক করছে।`));
        }
      }, timeout);

      try {
        const onConnect = async () => {
          this.connected = true;
          try {
            await this.login();
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              resolve();
            }
          } catch (err) {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              this.close();
              reject(err);
            }
          }
        };

        if (this.options.useSsl) {
          this.socket = tls.connect(
            {
              host: this.options.host,
              port: this.options.port || 8729,
              rejectUnauthorized: false, // RouterOS self-signed certs
            },
            onConnect
          );
        } else {
          this.socket = net.createConnection(
            {
              host: this.options.host,
              port: this.options.port || 8728,
            },
            onConnect
          );
        }

        this.socket.on('data', (data: Buffer) => {
          this.buffer = Buffer.concat([this.buffer, data]);
        });

        this.socket.on('error', (err: any) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            this.close();
            let msg = err.message || 'Unknown network error';
            if (err.code === 'ECONNREFUSED') {
              msg = `রাউটারের API পোর্ট (${this.options.port}) বন্ধ বা রিফিউজড। উইনবক্স বা SSH-এ '/ip service enable api' কমান্ড চালিয়ে API চালু করুন।`;
            } else if (err.code === 'ENOTFOUND' || err.code === 'EHOSTUNREACH') {
              msg = `হোস্ট (${this.options.host}) খুঁজে পাওয়া যায়নি। আইপি অ্যাড্রেস বা ডিডিএনএস ডোমেইন সঠিক কিনা পরীক্ষা করুন।`;
            } else if (err.code === 'ETIMEDOUT') {
              msg = `রাউটার আইপি (${this.options.host}) থেকে সংযোগ টাইমআউট হয়েছে। রিমোট রাউটার ও নেটওয়ার্ক গেটওয়ে পরীক্ষা করুন।`;
            }
            reject(new Error(msg));
          }
        });

        this.socket.on('close', () => {
          this.connected = false;
          this.loggedIn = false;
        });
      } catch (err: any) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    });
  }

  /**
   * RouterOS Login (Supports modern v6.43+/v7 and legacy challenge-response)
   */
  private async login(): Promise<void> {
    const username = this.options.username;
    const password = this.options.password || '';

    // First attempt: RouterOS 6.43+ and 7.x plaintext login
    const firstAttempt = await this.writeSentence([
      '/login',
      `=name=${username}`,
      `=password=${password}`,
    ]);

    // Check if directly logged in
    const doneSentence = firstAttempt.find((s) => s.type === '!done');
    if (doneSentence && !doneSentence.attributes['ret']) {
      this.loggedIn = true;
      return;
    }

    // Legacy challenge-response required
    const challengeHex = doneSentence?.attributes['ret'];
    if (challengeHex) {
      const challengeBuf = Buffer.from(challengeHex, 'hex');
      const passBuf = Buffer.from(password, 'utf8');
      const zeroBuf = Buffer.from([0]);

      const md5 = crypto.createHash('md5');
      md5.update(Buffer.concat([zeroBuf, passBuf, challengeBuf]));
      const responseHex = '00' + md5.digest('hex');

      const secondAttempt = await this.writeSentence([
        '/login',
        `=name=${username}`,
        `=response=${responseHex}`,
      ]);

      const secondDone = secondAttempt.find((s) => s.type === '!done');
      if (secondDone) {
        this.loggedIn = true;
        return;
      }
    }

    // Look for error trap
    const trap = firstAttempt.find((s) => s.type === '!trap');
    const msg = trap?.attributes['message'] || 'লগইন ব্যর্থ হয়েছে। ইউজারনেম ও পাসওয়ার্ড সঠিক কিনা পরীক্ষা করুন।';
    throw new Error(`লগইন ব্যর্থ: ${msg}`);
  }

  /**
   * Encode word into RouterOS length-prefixed bytes
   */
  private encodeWord(word: string): Buffer {
    const bytes = Buffer.from(word, 'utf8');
    const len = bytes.length;
    let lenBytes: Buffer;

    if (len < 0x80) {
      lenBytes = Buffer.from([len]);
    } else if (len < 0x4000) {
      lenBytes = Buffer.from([(len >> 8) | 0x80, len & 0xff]);
    } else if (len < 0x200000) {
      lenBytes = Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
    } else if (len < 0x10000000) {
      lenBytes = Buffer.from([
        (len >> 24) | 0xe0,
        (len >> 16) & 0xff,
        (len >> 8) & 0xff,
        len & 0xff,
      ]);
    } else {
      lenBytes = Buffer.from([
        0xf0,
        (len >> 24) & 0xff,
        (len >> 16) & 0xff,
        (len >> 8) & 0xff,
        len & 0xff,
      ]);
    }

    return Buffer.concat([lenBytes, bytes]);
  }

  /**
   * Decode a word from buffer
   */
  private decodeWord(): string | null {
    if (this.buffer.length === 0) return null;

    let len = 0;
    let offset = 0;
    const b1 = this.buffer[0];

    if ((b1 & 0x80) === 0x00) {
      len = b1;
      offset = 1;
    } else if ((b1 & 0xc0) === 0x80) {
      if (this.buffer.length < 2) return null;
      len = ((b1 & 0x3f) << 8) | this.buffer[1];
      offset = 2;
    } else if ((b1 & 0xe0) === 0xc0) {
      if (this.buffer.length < 3) return null;
      len = ((b1 & 0x1f) << 16) | (this.buffer[1] << 8) | this.buffer[2];
      offset = 3;
    } else if ((b1 & 0xf0) === 0xe0) {
      if (this.buffer.length < 4) return null;
      len = ((b1 & 0x0f) << 24) | (this.buffer[1] << 16) | (this.buffer[2] << 8) | this.buffer[3];
      offset = 4;
    } else if ((b1 & 0xf8) === 0xf0) {
      if (this.buffer.length < 5) return null;
      len = (this.buffer[1] << 24) | (this.buffer[2] << 16) | (this.buffer[3] << 8) | this.buffer[4];
      offset = 5;
    } else {
      // Invalid length or special case
      this.buffer = this.buffer.subarray(1);
      return null;
    }

    if (this.buffer.length < offset + len) {
      return null; // Not enough bytes yet
    }

    const word = this.buffer.toString('utf8', offset, offset + len);
    this.buffer = this.buffer.subarray(offset + len);
    return word;
  }

  /**
   * Write sentence and await response sentences until !done or !trap
   */
  public async writeSentence(
    words: string[],
    timeoutMs: number = 8000
  ): Promise<Array<{ type: string; attributes: Record<string, string> }>> {
    if (!this.socket || !this.connected) {
      throw new Error('রাউটারের সাথে কোনো সক্রিয় TCP সকেট নেই।');
    }

    // Build sentence
    const chunks: Buffer[] = [];
    for (const word of words) {
      chunks.push(this.encodeWord(word));
    }
    chunks.push(Buffer.from([0x00])); // End of sentence
    const fullSentence = Buffer.concat(chunks);

    this.socket.write(fullSentence);

    return new Promise((resolve, reject) => {
      const results: Array<{ type: string; attributes: Record<string, string> }> = [];
      let currentSentenceWords: string[] = [];
      let isFinished = false;

      const timer = setTimeout(() => {
        if (!isFinished) {
          isFinished = true;
          cleanup();
          reject(new Error(`কমান্ড সম্পাদন টাইমআউট (${words[0]})`));
        }
      }, timeoutMs);

      const checkBuffer = () => {
        while (true) {
          const word = this.decodeWord();
          if (word === null) break;

          if (word === '') {
            // End of sentence
            if (currentSentenceWords.length > 0) {
              const type = currentSentenceWords[0];
              const attributes: Record<string, string> = {};

              for (let i = 1; i < currentSentenceWords.length; i++) {
                const w = currentSentenceWords[i];
                if (w.startsWith('=')) {
                  const eqIdx = w.indexOf('=', 1);
                  if (eqIdx !== -1) {
                    const key = w.substring(1, eqIdx);
                    const val = w.substring(eqIdx + 1);
                    attributes[key] = val;
                  }
                }
              }

              results.push({ type, attributes });

              if (type === '!done') {
                if (!isFinished) {
                  isFinished = true;
                  cleanup();
                  resolve(results);
                  return;
                }
              } else if (type === '!trap') {
                const trapMsg = attributes['message'] || 'Unknown RouterOS trap';
                if (!isFinished) {
                  isFinished = true;
                  cleanup();
                  reject(new Error(`রাউটার ত্রুটি: ${trapMsg}`));
                  return;
                }
              } else if (type === '!fatal') {
                if (!isFinished) {
                  isFinished = true;
                  cleanup();
                  reject(new Error('রাউটার সংযোগ অনির্দিষ্ট কারণে বিচ্ছিন্ন (Fatal)'));
                  return;
                }
              }

              currentSentenceWords = [];
            }
          } else {
            currentSentenceWords.push(word);
          }
        }
      };

      const onData = () => {
        checkBuffer();
      };

      const onError = (err: any) => {
        if (!isFinished) {
          isFinished = true;
          cleanup();
          reject(err);
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        if (this.socket) {
          this.socket.removeListener('data', onData);
          this.socket.removeListener('error', onError);
        }
      };

      if (this.socket) {
        this.socket.on('data', onData);
        this.socket.on('error', onError);
      }

      // Check whatever might already be buffered
      checkBuffer();
    });
  }

  public close(): void {
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {
        // ignore
      }
      this.socket = null;
    }
    this.connected = false;
    this.loggedIn = false;
    this.buffer = Buffer.alloc(0);
  }

  // ==========================================
  // HIGH LEVEL SYSTEM & IDENTITY OPERATIONS
  // ==========================================

  public async getSystemInfo(): Promise<MikroTikSystemResource> {
    const identityRes = await this.writeSentence(['/system/identity/print']);
    const identityItem = identityRes.find((r) => r.type === '!re');
    const identityName = identityItem?.attributes['name'] || this.options.host;

    const resourceRes = await this.writeSentence(['/system/resource/print']);
    const resourceItem = resourceRes.find((r) => r.type === '!re');
    const attrs = resourceItem?.attributes || {};

    const freeMem = parseInt(attrs['free-memory'] || '0', 10);
    const totalMem = parseInt(attrs['total-memory'] || '0', 10);
    const freeHdd = parseInt(attrs['free-hdd-space'] || '0', 10);
    const totalHdd = parseInt(attrs['total-hdd-space'] || '0', 10);
    const cpuLoad = parseInt(attrs['cpu-load'] || '0', 10);

    return {
      identity: identityName,
      uptime: attrs['uptime'] || 'N/A',
      version: attrs['version'] || 'RouterOS',
      cpu: attrs['cpu'] || 'MIPS / ARM / x86',
      cpuLoad,
      freeMemory: freeMem,
      totalMemory: totalMem,
      freeHdd,
      totalHdd,
      boardName: attrs['board-name'] || attrs['platform'] || 'MikroTik Board',
      architecture: attrs['architecture-name'] || 'RouterBOARD',
    };
  }

  public async getInterfaces(): Promise<Array<{ id: string; name: string; type: string; running: boolean; disabled: boolean; comment?: string }>> {
    const res = await this.writeSentence(['/interface/print']);
    return res
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id: r.attributes['.id'],
        name: r.attributes['name'] || 'unknown',
        type: r.attributes['type'] || 'ether',
        running: r.attributes['running'] === 'true',
        disabled: r.attributes['disabled'] === 'true',
        comment: r.attributes['comment'],
      }));
  }

  // ==========================================
  // PPPoE OPERATIONS
  // ==========================================

  public async getPPPoESecrets(): Promise<PPPoESecret[]> {
    const res = await this.writeSentence(['/ppp/secret/print']);
    return res
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id: r.attributes['.id'],
        name: r.attributes['name'] || '',
        password: r.attributes['password'] || '',
        service: r.attributes['service'] || 'pppoe',
        profile: r.attributes['profile'] || 'default',
        localAddress: r.attributes['local-address'],
        remoteAddress: r.attributes['remote-address'],
        disabled: r.attributes['disabled'] === 'true',
        comment: r.attributes['comment'],
        lastCallerId: r.attributes['last-caller-id'],
        lastDisconnectReason: r.attributes['last-disconnect-reason'],
        lastLoggedOut: r.attributes['last-logged-out'],
      }));
  }

  public async getPPPoEActive(): Promise<PPPoEActiveSession[]> {
    const res = await this.writeSentence(['/ppp/active/print']);
    return res
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id: r.attributes['.id'],
        name: r.attributes['name'] || '',
        service: r.attributes['service'] || 'pppoe',
        callerId: r.attributes['caller-id'] || '',
        address: r.attributes['address'] || '',
        uptime: r.attributes['uptime'] || '0s',
        encoding: r.attributes['encoding'],
        sessionId: r.attributes['session-id'],
        limitBytesIn: r.attributes['limit-bytes-in'] ? parseInt(r.attributes['limit-bytes-in'], 10) : undefined,
        limitBytesOut: r.attributes['limit-bytes-out'] ? parseInt(r.attributes['limit-bytes-out'], 10) : undefined,
      }));
  }

  public async addPPPoESecret(data: {
    name: string;
    password?: string;
    service?: string;
    profile?: string;
    localAddress?: string;
    remoteAddress?: string;
    comment?: string;
  }): Promise<string> {
    const words = [
      '/ppp/secret/add',
      `=name=${data.name}`,
      `=service=${data.service || 'pppoe'}`,
    ];
    if (data.password) words.push(`=password=${data.password}`);
    if (data.profile) words.push(`=profile=${data.profile}`);
    if (data.localAddress) words.push(`=local-address=${data.localAddress}`);
    if (data.remoteAddress) words.push(`=remote-address=${data.remoteAddress}`);
    if (data.comment) words.push(`=comment=${data.comment}`);

    const res = await this.writeSentence(words);
    const done = res.find((r) => r.type === '!done');
    return done?.attributes['ret'] || 'ok';
  }

  public async updatePPPoESecret(
    id: string,
    data: {
      password?: string;
      profile?: string;
      disabled?: boolean;
      comment?: string;
      remoteAddress?: string;
    }
  ): Promise<void> {
    const words = ['/ppp/secret/set', `=.id=${id}`];
    if (data.password !== undefined) words.push(`=password=${data.password}`);
    if (data.profile !== undefined) words.push(`=profile=${data.profile}`);
    if (data.disabled !== undefined) words.push(`=disabled=${data.disabled ? 'yes' : 'no'}`);
    if (data.comment !== undefined) words.push(`=comment=${data.comment}`);
    if (data.remoteAddress !== undefined) words.push(`=remote-address=${data.remoteAddress}`);

    await this.writeSentence(words);
  }

  public async removePPPoESecret(id: string): Promise<void> {
    await this.writeSentence(['/ppp/secret/remove', `=.id=${id}`]);
  }

  public async disconnectPPPoEActive(id: string): Promise<void> {
    await this.writeSentence(['/ppp/active/remove', `=.id=${id}`]);
  }

  public async getPPPoEProfiles(): Promise<MikroTikProfile[]> {
    const res = await this.writeSentence(['/ppp/profile/print']);
    return res
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id: r.attributes['.id'],
        name: r.attributes['name'] || '',
        rateLimit: r.attributes['rate-limit'],
        localAddress: r.attributes['local-address'],
        remoteAddress: r.attributes['remote-address'],
        onlyOne: r.attributes['only-one'],
      }));
  }

  // ==========================================
  // HOTSPOT OPERATIONS
  // ==========================================

  public async getHotspotUsers(): Promise<HotspotUser[]> {
    const res = await this.writeSentence(['/ip/hotspot/user/print']);
    return res
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id: r.attributes['.id'],
        name: r.attributes['name'] || '',
        profile: r.attributes['profile'] || 'default',
        uptime: r.attributes['uptime'],
        bytesIn: r.attributes['bytes-in'] ? parseInt(r.attributes['bytes-in'], 10) : 0,
        bytesOut: r.attributes['bytes-out'] ? parseInt(r.attributes['bytes-out'], 10) : 0,
        disabled: r.attributes['disabled'] === 'true',
        comment: r.attributes['comment'],
      }));
  }

  public async getHotspotActive(): Promise<HotspotActiveSession[]> {
    const res = await this.writeSentence(['/ip/hotspot/active/print']);
    return res
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id: r.attributes['.id'],
        user: r.attributes['user'] || '',
        address: r.attributes['address'] || '',
        macAddress: r.attributes['mac-address'] || '',
        uptime: r.attributes['uptime'] || '0s',
        bytesIn: r.attributes['bytes-in'] ? parseInt(r.attributes['bytes-in'], 10) : 0,
        bytesOut: r.attributes['bytes-out'] ? parseInt(r.attributes['bytes-out'], 10) : 0,
      }));
  }

  public async addHotspotUser(data: {
    name: string;
    password?: string;
    profile?: string;
    comment?: string;
  }): Promise<string> {
    const words = ['/ip/hotspot/user/add', `=name=${data.name}`];
    if (data.password) words.push(`=password=${data.password}`);
    if (data.profile) words.push(`=profile=${data.profile}`);
    if (data.comment) words.push(`=comment=${data.comment}`);

    const res = await this.writeSentence(words);
    const done = res.find((r) => r.type === '!done');
    return done?.attributes['ret'] || 'ok';
  }

  public async updateHotspotUser(
    id: string,
    data: {
      password?: string;
      profile?: string;
      disabled?: boolean;
      comment?: string;
    }
  ): Promise<void> {
    const words = ['/ip/hotspot/user/set', `=.id=${id}`];
    if (data.password !== undefined) words.push(`=password=${data.password}`);
    if (data.profile !== undefined) words.push(`=profile=${data.profile}`);
    if (data.disabled !== undefined) words.push(`=disabled=${data.disabled ? 'yes' : 'no'}`);
    if (data.comment !== undefined) words.push(`=comment=${data.comment}`);

    await this.writeSentence(words);
  }

  public async removeHotspotUser(id: string): Promise<void> {
    await this.writeSentence(['/ip/hotspot/user/remove', `=.id=${id}`]);
  }

  public async disconnectHotspotActive(id: string): Promise<void> {
    await this.writeSentence(['/ip/hotspot/active/remove', `=.id=${id}`]);
  }

  public async getHotspotProfiles(): Promise<MikroTikProfile[]> {
    const res = await this.writeSentence(['/ip/hotspot/user/profile/print']);
    return res
      .filter((r) => r.type === '!re')
      .map((r) => ({
        id: r.attributes['.id'],
        name: r.attributes['name'] || '',
        rateLimit: r.attributes['rate-limit'],
      }));
  }

  // ==========================================
  // REAL-TIME TRAFFIC MONITORING
  // ==========================================

  public async monitorInterfaceTraffic(interfaceName: string): Promise<InterfaceTraffic> {
    const res = await this.writeSentence([
      '/interface/monitor-traffic',
      `=interface=${interfaceName}`,
      '=once=',
    ]);

    const item = res.find((r) => r.type === '!re');
    const attrs = item?.attributes || {};

    return {
      interfaceName,
      rxBps: parseInt(attrs['rx-bits-per-second'] || '0', 10),
      txBps: parseInt(attrs['tx-bits-per-second'] || '0', 10),
      rxPps: parseInt(attrs['rx-packets-per-second'] || '0', 10),
      txPps: parseInt(attrs['tx-packets-per-second'] || '0', 10),
      timestamp: Date.now(),
    };
  }
}
