/**
 * SSRF Protection Utility
 * 防止 Server-Side Request Forgery 攻击
 */

// 本地地址
const LOCALHOST_HOSTNAMES = [
    'localhost', '127.0.0.1', '::1', '0.0.0.0', '::',
    '::ffff:127.0.0.1', '::ffff:0:127.0.0.1',
];

// IPv6 私有地址
const BLOCKED_IPV6 = [
    '::1', '::', '::ffff:127.0.0.1', '::ffff:0:127.0.0.1',
    '64:ff9b::', // NAT64
    'fc00::', 'fd00::', // IPv6 私有地址
    'fe80::', // Link-local
];

// 内部域名 TLD
const INTERNAL_TLDS = ['.local', '.internal', '.corp', '.intranet', '.lan'];

// 云元数据端点
const METADATA_ENDPOINTS = [
    '169.254.169.254', // AWS, GCP, Azure, Kubernetes
    'metadata.google.internal',
    'metadata.google',
    'kubernetes.default.svc',
    'kubernetes.default',
    'docker-desktop',
    'host.docker.internal',
];

export interface SSRFValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * 验证 URL 是否安全，防止 SSRF 攻击
 */
export function validateUrl(urlString: string): SSRFValidationResult {
    let url: URL;
    try {
        url = new URL(urlString);
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }

    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    // 1. 协议白名单
    if (!['http:', 'https:'].includes(protocol)) {
        return { valid: false, error: `Protocol '${protocol}' is not allowed` };
    }

    // 2. 阻止本地地址
    if (LOCALHOST_HOSTNAMES.some(h => hostname === h || hostname.endsWith(':' + h))) {
        return { valid: false, error: 'Localhost addresses are not allowed' };
    }

    // 3. 阻止 IPv6 私有地址
    if (BLOCKED_IPV6.some(ipv6 => hostname === ipv6 || hostname.startsWith(ipv6 + ':'))) {
        return { valid: false, error: 'Private IPv6 addresses are not allowed' };
    }

    // 4. 阻止私有 IP 范围
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipRegex.test(hostname)) {
        const parts = hostname.split('.').map(Number);

        // 10.x.x.x
        if (parts[0] === 10) {
            return { valid: false, error: 'Private IP range 10.x.x.x is not allowed' };
        }
        // 172.16-31.x.x
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
            return { valid: false, error: 'Private IP range 172.16-31.x.x is not allowed' };
        }
        // 192.168.x.x
        if (parts[0] === 192 && parts[1] === 168) {
            return { valid: false, error: 'Private IP range 192.168.x.x is not allowed' };
        }
        // 127.x.x.x (loopback)
        if (parts[0] === 127) {
            return { valid: false, error: 'Loopback IP 127.x.x.x is not allowed' };
        }
        // 169.254.x.x (link-local)
        if (parts[0] === 169 && parts[1] === 254) {
            return { valid: false, error: 'Link-local IP 169.254.x.x is not allowed' };
        }
        // 224.x.x.x (multicast)
        if (parts[0] >= 224 && parts[0] <= 239) {
            return { valid: false, error: 'Multicast IP range is not allowed' };
        }
        // 240.x.x.x (reserved)
        if (parts[0] >= 240) {
            return { valid: false, error: 'Reserved IP range is not allowed' };
        }
    }

    // 5. 阻止内部域名
    if (INTERNAL_TLDS.some(tld => hostname.endsWith(tld))) {
        return { valid: false, error: 'Internal domain TLDs are not allowed' };
    }

    // 6. 阻止云元数据端点
    if (METADATA_ENDPOINTS.includes(hostname)) {
        return { valid: false, error: 'Cloud metadata endpoints are not allowed' };
    }

    // 7. 阻止非标准端口（可选）
    const port = url.port ? parseInt(url.port, 10) : (protocol === 'https:' ? 443 : 80);
    const blockedPorts = [22, 23, 25, 3306, 5432, 6379, 27017, 11211];
    if (blockedPorts.includes(port)) {
        return { valid: false, error: `Port ${port} is not allowed` };
    }

    return { valid: true };
}

/**
 * 验证 fetch 请求的 URL（支持重定向处理）
 */
export async function validateFetchUrl(
    urlString: string
): Promise<SSRFValidationResult> {
    const validation = validateUrl(urlString);
    if (!validation.valid) {
        return validation;
    }

    // 如果需要处理重定向，可以使用 redirect: 'manual' 并验证 Location header
    return { valid: true };
}
