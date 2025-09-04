// 工具函数库
export function extractNodeName(url) {
    if (!url?.trim()) return '';
    
    const trimmedUrl = url.trim();
    
    try {
        // 优先检查URL片段
        const hashIndex = trimmedUrl.indexOf('#');
        if (hashIndex !== -1 && hashIndex < trimmedUrl.length - 1) {
            return decodeURIComponent(trimmedUrl.substring(hashIndex + 1)).trim();
        }
        
        const protocolIndex = trimmedUrl.indexOf('://');
        if (protocolIndex === -1) return '';
        
        const protocol = trimmedUrl.substring(0, protocolIndex);
        const mainPart = trimmedUrl.substring(protocolIndex + 3).split('#')[0];
        
        switch (protocol) {
            case 'vmess': {
                try {
                    const padded = mainPart.padEnd(mainPart.length + (4 - mainPart.length % 4) % 4, '=');
                    const binaryString = atob(padded);
                    const bytes = new Uint8Array(binaryString.length);
                    const charCodes = Array.from(binaryString, char => char.charCodeAt(0));
                    bytes.set(charCodes);
                    const jsonString = new TextDecoder('utf-8').decode(bytes);
                    const node = JSON.parse(jsonString);
                    return node.ps || '';
                } catch (e) {
                    console.error("Failed to decode vmess link:", e);
                    return '';
                }
            }
            
            case 'trojan':
            case 'vless': {
                const atIndex = mainPart.indexOf('@');
                return atIndex === -1 ? '' : mainPart.substring(atIndex + 1).split(':')[0] || '';
            }
            
            case 'ss': {
                const atIndex = mainPart.indexOf('@');
                if (atIndex !== -1) {
                    return mainPart.substring(atIndex + 1).split(':')[0] || '';
                }
                
                try {
                    const decodedSS = atob(mainPart);
                    const ssDecodedAtIndex = decodedSS.indexOf('@');
                    return ssDecodedAtIndex !== -1 ? decodedSS.substring(ssDecodedAtIndex + 1).split(':')[0] || '' : '';
                } catch (e) {
                    return '';
                }
            }
            
            default:
                if (trimmedUrl.startsWith('http')) {
                    try {
                        return new URL(trimmedUrl).hostname;
                    } catch (e) {
                        return '';
                    }
                }
                return '';
        }
    } catch (e) { 
        return trimmedUrl.substring(0, 50); 
    }
}


// 为节点链接添加名称前缀
export function prependNodeName(link, prefix) {
  if (!prefix || !link) return link;

  const hashIndex = link.lastIndexOf('#');
  
  if (hashIndex === -1) {
    return `${link}#${encodeURIComponent(prefix)}`;
  }

  const baseLink = link.substring(0, hashIndex);
  const originalName = decodeURIComponent(link.substring(hashIndex + 1));
  
  if (originalName.startsWith(prefix)) {
    return link;
  }

  const newName = `${prefix} - ${originalName}`;
  return `${baseLink}#${encodeURIComponent(newName)}`;
}

// 从节点链接中提取主机和端口
export function extractHostAndPort(url) {
    if (!url) return { host: '', port: '' };

    try {
        const protocolEndIndex = url.indexOf('://');
        if (protocolEndIndex === -1) throw new Error('无效的 URL：缺少协议头');

        const protocol = url.substring(0, protocolEndIndex);
        const fragmentStartIndex = url.indexOf('#');
        const mainPartEndIndex = fragmentStartIndex === -1 ? url.length : fragmentStartIndex;
        let mainPart = url.substring(protocolEndIndex + 3, mainPartEndIndex);

        // VMess 专用处理
        if (protocol === 'vmess') {
            const decodedString = atob(mainPart);
            const nodeConfig = JSON.parse(decodedString);
            return { host: nodeConfig.add || '', port: String(nodeConfig.port || '') };
        }
        
        // SS/SSR Base64 解码处理
        if ((protocol === 'ss' || protocol === 'ssr') && mainPart.indexOf('@') === -1) {
            try {
                mainPart = atob(mainPart);
            } catch (e) { /* 解码失败则按原文处理 */ }
        }

        // SSR 解码后专门处理
        if (protocol === 'ssr') {
            const parts = mainPart.split(':');
            if (parts.length >= 2) {
                return { host: parts[0], port: parts[1] };
            }
        }
        
        // 通用解析逻辑
        const atIndex = mainPart.lastIndexOf('@');
        let serverPart = atIndex !== -1 ? mainPart.substring(atIndex + 1) : mainPart;

        // 移除查询参数和路径
        serverPart = serverPart.split('?')[0].split('/')[0];

        const lastColonIndex = serverPart.lastIndexOf(':');
        
        // IPv6 处理
        if (serverPart.startsWith('[') && serverPart.includes(']')) {
            const bracketEndIndex = serverPart.lastIndexOf(']');
            const host = serverPart.substring(1, bracketEndIndex);
            return { 
                host, 
                port: lastColonIndex > bracketEndIndex ? serverPart.substring(lastColonIndex + 1) : '' 
            };
        }

        // IPv4 处理
        if (lastColonIndex !== -1) {
            const potentialHost = serverPart.substring(0, lastColonIndex);
            const potentialPort = serverPart.substring(lastColonIndex + 1);
            return { 
                host: potentialHost.includes(':') ? serverPart : potentialHost, 
                port: potentialHost.includes(':') ? '' : potentialPort 
            };
        }
        
        return { host: serverPart, port: '' };

    } catch (e) {
        console.error("提取主机和端口失败:", url, e);
        return { host: '解析失败', port: 'N/A' };
    }
}