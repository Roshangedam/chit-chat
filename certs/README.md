# 🔐 HTTPS Setup Guide (mkcert)

This folder contains SSL certificates for HTTPS support.

## Quick Setup

### 1. Install mkcert

**Windows (Chocolatey):**
```bash
choco install mkcert
```

**Windows (Manual):**
1. Download from: https://github.com/FiloSottile/mkcert/releases
2. Download `mkcert-v1.4.4-windows-amd64.exe`
3. Rename to `mkcert.exe`
4. Add to PATH or place in this project folder

**macOS:**
```bash
brew install mkcert
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install libnss3-tools
# Then download binary from GitHub releases
```

### 2. Install Local CA (One-time)

```bash
mkcert -install
```

This installs a local Certificate Authority in your system trust store.
All browsers will trust certificates signed by this CA.

### 3. Generate Certificates

Run this command from the project root:

```bash
mkcert localhost 127.0.0.1 192.168.0.71
```

> 📝 Replace `192.168.0.71` with YOUR LAN IP address!

This will create two files:
- `localhost+2.pem` - Certificate
- `localhost+2-key.pem` - Private key

### 4. Move Certificates

Move both `.pem` files to this `certs/` folder:

```
chit-chat/
├── certs/
│   ├── localhost+2.pem       ← Certificate
│   ├── localhost+2-key.pem   ← Private key
│   └── README.md
```

### 5. Restart Server & Client

```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm run dev
```

Server will auto-detect certificates and start in HTTPS mode:
```
🔐 HTTPS mode enabled
📡 Server running on:
   Local:   https://localhost:3000
   Network: https://192.168.0.71:3000
```

## Adding More IPs

If you add more devices or change LAN IP:

```bash
mkcert localhost 127.0.0.1 192.168.0.71 192.168.0.72 192.168.1.100
```

Then replace the old `.pem` files with new ones.

## Troubleshooting

### Browser still shows warning?

1. Make sure you ran `mkcert -install` first
2. Restart browser completely
3. On other LAN devices, you need to install the root CA:
   - Find CA certificate: `mkcert -CAROOT`
   - Copy `rootCA.pem` to other device
   - Install it in system/browser trust store

### Certificate not found error?

Make sure files are named exactly:
- `localhost+2.pem`
- `localhost+2-key.pem`

Or check `server/src/index.js` for the expected filenames.

## Security Note

⚠️ Never commit `.pem` files to git! They are already in `.gitignore`.

These certificates are for **local development only**.
For production, use proper certificates from Let's Encrypt or similar.
