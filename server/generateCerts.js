/**
 * Generate SSL Certificates using mkcert (npm package)
 * 
 * Usage:
 *   node generateCerts.js                    # Uses default IPs
 *   node generateCerts.js 192.168.1.100      # Add custom IP
 *   node generateCerts.js 10.0.0.5 10.0.0.6  # Add multiple IPs
 */

const mkcert = require('mkcert');
const fs = require('fs');
const path = require('path');

async function generateCertificates() {
    console.log('🔐 Generating SSL certificates...\n');

    // Default domains/IPs
    const defaultDomains = ['127.0.0.1', 'localhost'];

    // Add custom IPs from command line arguments
    const customIPs = process.argv.slice(2);

    // Combine all domains
    const allDomains = [...defaultDomains, ...customIPs];

    // If no custom IPs, try to detect local IP
    if (customIPs.length === 0) {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    allDomains.push(iface.address);
                    console.log(`📡 Detected LAN IP: ${iface.address}`);
                }
            }
        }
    }

    console.log(`\n📋 Generating certificate for: ${allDomains.join(', ')}\n`);

    // Create Certificate Authority
    const ca = await mkcert.createCA({
        organization: 'ChitChat Dev CA',
        countryCode: 'IN',
        state: 'Maharashtra',
        locality: 'Mumbai',
        validity: 365
    });

    console.log('✅ Certificate Authority created');

    // Create certificate for all domains/IPs
    const cert = await mkcert.createCert({
        domains: allDomains,
        validity: 365,
        ca: {
            key: ca.key,
            cert: ca.cert
        }
    });

    console.log('✅ SSL Certificate created');

    // Save certificates to certs folder
    const certsDir = path.join(__dirname, '../certs');

    // Create certs directory if not exists
    if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
    }

    // Save CA certificate (for importing in browsers)
    fs.writeFileSync(path.join(certsDir, 'ca.pem'), ca.cert);
    console.log('📄 Saved: certs/ca.pem (Certificate Authority)');

    // Save server certificate and key
    fs.writeFileSync(path.join(certsDir, 'localhost+2.pem'), cert.cert);
    fs.writeFileSync(path.join(certsDir, 'localhost+2-key.pem'), cert.key);

    console.log('📄 Saved: certs/localhost+2.pem (Certificate)');
    console.log('📄 Saved: certs/localhost+2-key.pem (Private Key)');

    console.log('\n🎉 Done! Certificates generated successfully.');
    console.log('\n📌 Domains/IPs in certificate:');
    allDomains.forEach(d => console.log(`   ✓ ${d}`));

    console.log('\n📌 Next steps:');
    console.log('   1. Restart the server: npm run dev');
    console.log('   2. Open https://<server-ip>:3000 in browser');
    console.log('   3. Accept the certificate warning (first time only)');
    console.log('\n💡 For trusted HTTPS (no warning):');
    console.log('   Import certs/ca.pem in browser\'s certificate manager');
    console.log('');
}

generateCertificates().catch(console.error);
