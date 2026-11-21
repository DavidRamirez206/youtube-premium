// Proxy auto-discovery for older Tizen TVs.
// On first launch, scans the local /24 subnet for a running proxy server.
// Caches the result in localStorage so subsequent launches are instant.

const PROXY_PORT = 3000;
const STORAGE_KEY = 'ytaf_proxy_ip';
const SCAN_TIMEOUT_MS = 2000;
const BATCH_SIZE = 25;

// Resolved proxy IP, set by discoverProxyIP(). null when no proxy was found.
let resolvedProxyIP: string | null = null;

export function getProxyIP(): string | null {
  return resolvedProxyIP;
}

/**
 * Pings a single IP on the proxy port. Resolves with the IP if it responds
 * with the expected service identifier, otherwise rejects.
 */
function pingHost(ip: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = setTimeout(() => {
      xhr.abort();
      reject(new Error('timeout'));
    }, SCAN_TIMEOUT_MS);

    xhr.onload = () => {
      clearTimeout(timer);
      try {
        const data = JSON.parse(xhr.responseText);
        if (data && data.service === 'yt-proxy') {
          resolve(ip);
          return;
        }
      } catch (e) {}
      reject(new Error('not a proxy'));
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      reject(new Error('error'));
    };
    xhr.ontimeout = () => {
      clearTimeout(timer);
      reject(new Error('timeout'));
    };

    xhr.open('GET', `http://${ip}:${PROXY_PORT}/ping`, true);
    xhr.timeout = SCAN_TIMEOUT_MS;
    xhr.send();
  });
}

/**
 * Scans a list of IPs in batches, returning the first one that responds.
 */
async function scanBatch(ips: string[]): Promise<string | null> {
  for (let i = 0; i < ips.length; i += BATCH_SIZE) {
    const batch = ips.slice(i, i + BATCH_SIZE);
    try {
      const found = await Promise.any(batch.map((ip) => pingHost(ip)));
      return found;
    } catch (e) {
      // All in this batch failed, continue to next
    }
  }
  return null;
}

/**
 * Tries to determine the device's local IP using the Tizen systeminfo API.
 * Returns null if unavailable.
 */
function getDeviceIP(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      if (window.tizen && window.tizen.systeminfo) {
        window.tizen.systeminfo.getPropertyValue(
          'WIFI_NETWORK',
          (wifi: any) => {
            resolve(wifi && wifi.ipAddress ? wifi.ipAddress : null);
          },
          () => {
            // WIFI failed, try ethernet
            try {
              window.tizen.systeminfo.getPropertyValue(
                'ETHERNET_NETWORK',
                (eth: any) => {
                  resolve(eth && eth.ipAddress ? eth.ipAddress : null);
                },
                () => resolve(null)
              );
            } catch (e) {
              resolve(null);
            }
          }
        );
      } else {
        resolve(null);
      }
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Builds a list of all IPs on the /24 subnet excluding the device itself.
 */
function buildSubnetIPs(deviceIP: string): string[] {
  const parts = deviceIP.split('.');
  if (parts.length !== 4) return [];
  const prefix = parts.slice(0, 3).join('.');
  const self = parseInt(parts[3] ?? '', 10);
  const ips: string[] = [];
  for (let i = 1; i <= 254; i++) {
    if (i !== self) {
      ips.push(`${prefix}.${i}`);
    }
  }
  return ips;
}

/**
 * Main discovery entry point. Call this once at app startup before patching
 * XHR/fetch. It will:
 *   1. Check localStorage for a cached IP and verify it still responds.
 *   2. If not cached or stale, scan the local subnet.
 *   3. Cache the result for next time.
 *   4. Resolve to null if nothing is found.
 */
export async function discoverProxyIP(): Promise<string | null> {
  // Check cached IP first
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      const verified = await pingHost(cached);
      resolvedProxyIP = verified;
      console.info(`[Proxy] Cached proxy verified at ${verified}`);
      return verified;
    } catch (e) {
      console.info(
        `[Proxy] Cached IP ${cached} unreachable, scanning subnet...`
      );
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Get device IP to derive subnet
  const deviceIP = await getDeviceIP();
  if (deviceIP) {
    console.info(`[Proxy] Device IP: ${deviceIP}, scanning subnet...`);
    const ips = buildSubnetIPs(deviceIP);
    const found = await scanBatch(ips);
    if (found) {
      resolvedProxyIP = found;
      localStorage.setItem(STORAGE_KEY, found);
      console.info(`[Proxy] Discovered proxy at ${found}`);
      return found;
    }
  } else {
    console.warn('[Proxy] Could not determine device IP.');
  }

  console.error('[Proxy] No proxy found on the local subnet');
  return null;
}
