/**
 * ChitChat v2 - Client Configuration
 * Simple - same origin for everything
 */

const origin = window.location.origin;
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

const config = {
    serverUrl: origin,
    wsUrl: `${wsProtocol}//${window.location.host}`
};

console.log('🔗 Server:', config.serverUrl);

export default config;
