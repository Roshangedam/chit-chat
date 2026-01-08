# 🚀 ChitChat v2 - Complete Implementation Plan

---

## 🛠️ Tech Stack (Recommended)

| Component | Technology | Why Best? |
|-----------|------------|-----------|
| **Backend** | Node.js + Express | Fast, JavaScript everywhere, Socket.io ka best support |
| **Real-time** | Socket.io | WhatsApp jaisa instant messaging, typing indicators, read receipts |
| **Database** | SQLite (LAN) / PostgreSQL (Cloud) | SQLite simple hai LAN ke liye, PostgreSQL scalable hai cloud ke liye |
| **Frontend** | React + Vite | Fast development, modern UI, component-based |
| **Desktop** | Electron | Cross-platform (Windows, Mac, Linux) |
| **Mobile** | React Native | Same codebase for iOS + Android |
| **UI Styling** | CSS + Glassmorphism | Modern look, premium feel |
| **State Management** | Zustand | Simple, lightweight, React ke saath perfect |
| **Authentication** | JWT + OTP | Secure, stateless, email verification |
| **File Storage** | Local FS (LAN) / AWS S3 (Cloud) | Reliable file storage |
| **Voice/Video** | WebRTC + Simple-peer | P2P calls, low latency |

---

## 🏗️ Architecture: Server-Primary

```
SERVER = Primary Storage (Single Source of Truth)
   │
   ├──► Browser loads from server
   ├──► Desktop loads from server
   └──► Mobile loads from server

✅ No dependency between devices
✅ Simple implementation
✅ Works like Telegram/Slack
```

---

## ⚡ Real-Time Sync (No Refresh Needed!)

### 🎯 Core Principle
> **Everything updates INSTANTLY. No refresh. No delay. Real-time like WhatsApp.**

### ✅ All Real-Time Features

| Feature | Update Type | Instant? |
|---------|-------------|----------|
| **New Messages** | Push to all tabs/devices | ⚡ Instant |
| **Typing Indicator** | "Roshan is typing..." | ⚡ Instant |
| **Read Receipts** | ✓ Sent → ✓✓ Delivered → ✓✓ Read | ⚡ Instant |
| **Online/Offline Status** | 🟢 → 🔴 | ⚡ Instant |
| **Last Seen** | "Last seen 2 min ago" | ⚡ Instant |
| **Profile Photo Change** | New photo shows everywhere | ⚡ Instant |
| **Name Change** | Updated name everywhere | ⚡ Instant |
| **Status Update** | "Busy", "Away", etc. | ⚡ Instant |
| **Message Reactions** | 👍❤️😂 appear instantly | ⚡ Instant |
| **Message Edit** | Edited text updates live | ⚡ Instant |
| **Message Delete** | Disappears for everyone | ⚡ Instant |
| **User Joins Group** | Member list updates | ⚡ Instant |
| **User Leaves Group** | Member list updates | ⚡ Instant |
| **Admin Changes** | Permissions update live | ⚡ Instant |
| **Group Settings Change** | All members see change | ⚡ Instant |
| **File Upload Progress** | Progress bar live | ⚡ Instant |
| **New User Online** | Appears in user list | ⚡ Instant |

### 🔄 How It Works (Socket.io Events)

```
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME EVENT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User A (Browser)              SERVER              User B       │
│       │                          │                    │         │
│       │── typing:start ─────────►│                    │         │
│       │                          │── user:typing ────►│         │
│       │                          │    (A is typing)   │         │
│       │                          │                    │         │
│       │── send:message ─────────►│                    │         │
│       │                          │── new:message ────►│         │
│       │◄── message:sent ─────────│    (instant!)      │         │
│       │                          │                    │         │
│       │                          │◄── message:read ───│         │
│       │◄── receipt:read ─────────│                    │         │
│       │   (✓✓ turns blue)        │                    │         │
│       │                          │                    │         │
│       │── update:avatar ────────►│                    │         │
│       │                          │── user:updated ───►│         │
│       │                          │  (new photo shows) │         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 📡 Socket.io Events List

```javascript
// User Events (Real-time)
'user:online'        // User came online
'user:offline'       // User went offline
'user:typing'        // User is typing
'user:stop-typing'   // User stopped typing
'user:updated'       // Profile/avatar/name changed

// Message Events (Real-time)
'message:new'        // New message received
'message:sent'       // Message sent confirmation
'message:delivered'  // Message delivered to recipient
'message:read'       // Message was read
'message:edited'     // Message was edited
'message:deleted'    // Message was deleted
'message:reaction'   // Reaction added/removed

// Group Events (Real-time)
'group:member-added'     // New member joined
'group:member-removed'   // Member left/removed
'group:admin-changed'    // Admin role changed
'group:settings-updated' // Group settings changed
'group:message-new'      // New group message

// System Events (Real-time)
'connection:established' // Connected to server
'connection:lost'        // Disconnected
'sync:complete'          // Initial data loaded
```

### 🔁 Multi-Tab Sync

```
┌─────────────────────────────────────────────────────────────────┐
│  SAME USER - MULTIPLE TABS                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tab 1 (Chrome)        Tab 2 (Chrome)        Tab 3 (Firefox)   │
│       │                     │                      │            │
│       │                     │                      │            │
│       │                SERVER                      │            │
│       │                  │                         │            │
│       │◄── sync ─────────┼─────── sync ───────────►│            │
│       │                  │                         │            │
│       │   ALL TABS SHOW SAME DATA INSTANTLY!       │            │
│       │   • Same messages                          │            │
│       │   • Same unread count                      │            │
│       │   • Same typing status                     │            │
│       │   • Send from Tab 1 → appears in Tab 2,3   │            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ⚠️ Important Notes

- ❌ **No page refresh needed** for any update
- ❌ **No polling** (don't ask server every X seconds)
- ✅ **Push-based** (server pushes updates instantly)
- ✅ **WebSocket** connection stays open always
- ✅ **Auto-reconnect** if connection drops

## 🔑 User Identity: Zero Registration (LAN-based)

### ✅ Core Decisions
| Decision | Choice | Reason |
|----------|--------|--------|
| Registration | ❌ No registration | Quick start, LAN-based |
| User ID | IP Address | Simple, automatic |
| Multiple Tabs | Same User | 1 IP = 1 User always |
| Name Change | ✅ Allowed | User can set custom name |
| MAC Address | ❌ Not needed | IP is enough for LAN |

### 🔄 How It Works
```
┌──────────────────────────────────────────────────────────────┐
│  ZERO REGISTRATION FLOW                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  STEP 1: Open App (Browser/Desktop)                          │
│          → Device IP detected: 192.168.1.15                  │
│                                                              │
│  STEP 2: Connect to Server                                   │
│          → Server checks: Is IP in allowed LAN range?        │
│          → ✅ Yes! Auto-create user                          │
│                                                              │
│  STEP 3: First Time? Set Your Name                           │
│          → Prompt: "Enter your name"                         │
│          → User types: "Roshan"                              │
│          → Saved! (Can change later in settings)             │
│                                                              │
│  STEP 4: Ready to Chat!                                      │
│          → See all online users on same LAN                  │
│          → Start messaging instantly                         │
│                                                              │
│  MULTIPLE TABS:                                               │
│  → Same IP = Same User                                       │
│  → Messages sync across all tabs                             │
│  → Close all tabs = Go offline                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 👤 User Profile (Auto-created)
```
┌────────────────────────────────────────┐
│  User Profile                          │
├────────────────────────────────────────┤
│  ID:        192.168.1.15 (IP)          │
│  Name:      Roshan (user set)          │
│  Avatar:    🎨 (can upload)            │
│  Status:    🟢 Online                  │
│  Device:    Chrome on Windows          │
│  First seen: 26 Dec 2024               │
└────────────────────────────────────────┘
```

### 🔒 Admin LAN Configuration
```
┌──────────────────────────────────────────────────────────────┐
│  ADMIN PANEL > LAN SETTINGS                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📡 Allowed IP Ranges:                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 192.168.1.0/24    "Office LAN"              [✅ Active] │ │
│  │ 192.168.0.0/24    "Home Network"            [✅ Active] │ │
│  │ 10.0.0.0/8        "Corporate"               [❌ Off]    │ │
│  │ [+ Add Range]                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  🔐 Access Control:                                          │
│  ☑️ Auto-allow new devices in range                          │
│  ☐ Require admin approval for new devices                    │
│  ☑️ Block IPs outside allowed ranges                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 📊 Identity Summary
| Feature | Value |
|---------|-------|
| Registration | ❌ Not needed |
| Login | ❌ Not needed |
| Auto-identify | ✅ By IP address |
| Name | ✅ User can set/change |
| Multiple tabs | Same user (synced) |
| Different device | Different user (different IP) |

---

## 🔗 IP-Email Linking (Remote Access)

### ✅ Two Ways to Link Email

| Method | Who Does It | Verification | Use Case |
|--------|-------------|--------------|----------|
| **Admin Panel** | Admin | No OTP needed | Pre-assign emails to known users |
| **User Self-link** | User | OTP required | User links own email |

### 🛡️ Method 1: Admin Links Email (Admin Panel)

```
┌──────────────────────────────────────────────────────────────┐
│  ADMIN PANEL > User Management > Link Email                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  User: Roshan (192.168.1.15)                                 │
│                                                              │
│  📧 Link Email to this User:                                 │
│  ┌────────────────────────────────────────────────────┐      │
│  │ Email: [roshan@gmail.com                        ]  │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  ☑️ Skip OTP verification (Admin trusted)                    │
│  ☐ Send welcome email to user                                │
│                                                              │
│  [Link Email]                                                │
│                                                              │
│  ✅ Admin can link any email to any IP user                  │
│  ✅ No OTP required (Admin is trusted)                       │
│  ✅ User can now login from internet with this email         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 👤 Method 2: User Self-Links Email (OTP Verification)

```
┌──────────────────────────────────────────────────────────────┐
│  USER APP > Settings > Link Email for Remote Access           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🔗 Link Email to Access from Anywhere                       │
│                                                              │
│  Step 1: Enter your email                                    │
│  ┌────────────────────────────────────────────────────┐      │
│  │ Email: [roshan@gmail.com                        ]  │      │
│  └────────────────────────────────────────────────────┘      │
│  [Send OTP]                                                  │
│                                                              │
│  Step 2: Enter OTP (sent to email)                           │
│  ┌────────────────────────────────────────────────────┐      │
│  │ OTP: [1 2 3 4 5 6]                                 │      │
│  └────────────────────────────────────────────────────┘      │
│  [Verify & Link]                                             │
│                                                              │
│  ✅ OTP verified!                                            │
│  ✅ Email linked to your account                             │
│  ✅ Now you can login from anywhere using this email         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 🌐 Internet Login Flow (When Outside LAN)

```
┌──────────────────────────────────────────────────────────────┐
│  INTERNET LOGIN (Not on LAN)                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  User opens app from internet (different network)            │
│  IP: 103.45.67.89 (not in allowed LAN range)                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │  🔐 ChitChat Login                                 │      │
│  │                                                    │      │
│  │  You're not on the LAN network.                    │      │
│  │  Login with your linked email:                     │      │
│  │                                                    │      │
│  │  📧 Email: [roshan@gmail.com              ]        │      │
│  │  [Send OTP]                                        │      │
│  │                                                    │      │
│  │  🔢 OTP:   [• • • • • •]                           │      │
│  │  [Login]                                           │      │
│  │                                                    │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  After OTP verified:                                         │
│  → Find user with this linked email                          │
│  → Login as that user (same account, same messages)          │
│  → Can chat with LAN users                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 📊 Complete Access Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    APP OPENS - DECISION FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        ┌───────────┐                            │
│                        │ App Opens │                            │
│                        └─────┬─────┘                            │
│                              │                                  │
│                              ▼                                  │
│                   ┌──────────────────┐                          │
│                   │ Get User's IP    │                          │
│                   └────────┬─────────┘                          │
│                            │                                    │
│                            ▼                                    │
│              ┌──────────────────────────┐                       │
│              │  Is IP in allowed range? │                       │
│              └─────────────┬────────────┘                       │
│                           │                                    │
│            ┌──────────────┴──────────────┐                      │
│            │                             │                      │
│       YES (LAN)                    NO (Internet)                │
│            │                             │                      │
│            ▼                             ▼                      │
│    ┌───────────────┐          ┌────────────────────┐           │
│    │ AUTO LOGIN    │          │ Show Login Page    │           │
│    │ by IP address │          │ "Enter Email"      │           │
│    │               │          │ "Enter OTP"        │           │
│    │ • No password │          │                    │           │
│    │ • Instant!    │          │ Find linked user   │           │
│    └───────────────┘          └────────────────────┘           │
│            │                             │                      │
│            │                             │                      │
│            └──────────┬──────────────────┘                      │
│                       │                                         │
│                       ▼                                         │
│              ┌────────────────┐                                 │
│              │   LOGGED IN!   │                                 │
│              │  Same account  │                                 │
│              │  Same messages │                                 │
│              └────────────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

> **📌 Database Tables:** See "Database Schema" section below for complete `users`, `otp_codes`, and `email_link_history` tables.

### ⚙️ Admin Panel: Email Configuration

```
┌──────────────────────────────────────────────────────────────┐
│  ADMIN PANEL > Settings > Email Configuration                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📧 SMTP Settings (for sending OTP emails)                   │
│  ┌────────────────────────────────────────────────────┐      │
│  │ SMTP Host:     [smtp.gmail.com                  ]  │      │
│  │ SMTP Port:     [587                             ]  │      │
│  │ Username:      [chitchat@gmail.com              ]  │      │
│  │ Password:      [••••••••••••                    ]  │      │
│  │ From Name:     [ChitChat Server                 ]  │      │
│  └────────────────────────────────────────────────────┘      │
│  [Test Connection] [Save]                                    │
│                                                              │
│  🔐 OTP Settings                                             │
│  ┌────────────────────────────────────────────────────┐      │
│  │ OTP Length:        [6] digits                      │      │
│  │ OTP Expiry:        [5] minutes                     │      │
│  │ Max Attempts:      [3] per hour                    │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  🔗 Email Linking Rules                                      │
│  ┌────────────────────────────────────────────────────┐      │
│  │ ☑️ Allow users to self-link email                  │      │
│  │ ☑️ Require OTP for user self-link                  │      │
│  │ ☐ Admin must approve user email links              │      │
│  │ ☑️ Allow internet login (outside LAN)              │      │
│  │ ☐ Only whitelisted domains (e.g., @company.com)    │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  📋 Allowed Email Domains (if enabled)                       │
│  ┌────────────────────────────────────────────────────┐      │
│  │ @company.com                                       │      │
│  │ @gmail.com                                         │      │
│  │ [+ Add Domain]                                     │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Admin First Setup (Server Initialization)

### ✅ Chosen Approach: Setup Wizard + Secret Token

```
┌──────────────────────────────────────────────────────────────┐
│  ADMIN FIRST SETUP FLOW                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  STEP 1: Server Starts (First Time)                          │
│          └─► Generate random Setup Token                     │
│          └─► Display in console:                             │
│              ┌────────────────────────────────────────┐      │
│              │ 🔐 ChitChat Server Started!             │      │
│              │                                        │      │
│              │ FIRST TIME SETUP REQUIRED              │      │
│              │ Setup Token: ABC123XYZ                 │      │
│              │                                        │      │
│              │ Open in browser:                       │      │
│              │ http://192.168.1.100:3000/setup        │      │
│              │                                        │      │
│              │ Token expires in 30 minutes            │      │
│              └────────────────────────────────────────┘      │
│                                                              │
│  STEP 2: Open Setup URL in Browser                           │
│          └─► Enter Setup Token                               │
│          └─► If valid, show Setup Wizard                     │
│                                                              │
│  STEP 3: Setup Wizard                                        │
│          ┌────────────────────────────────────────────┐      │
│          │  🚀 ChitChat Setup Wizard                   │      │
│          │                                            │      │
│          │  Step 1/3: Server Details                  │      │
│          │  ─────────────────────────                 │      │
│          │  Server Name: [Office Chat Server    ]     │      │
│          │  Server Port: [3000                  ]     │      │
│          │                                            │      │
│          │  Step 2/3: Admin Account                   │      │
│          │  ─────────────────────────                 │      │
│          │  Admin Username: [admin              ]     │      │
│          │  Admin Password: [••••••••••         ]     │      │
│          │  Confirm Password: [••••••••••       ]     │      │
│          │                                            │      │
│          │  Step 3/3: LAN Configuration               │      │
│          │  ─────────────────────────                 │      │
│          │  Your IP: 192.168.1.100                    │      │
│          │  Allowed Range: [192.168.1.0/24      ]     │      │
│          │  ☑️ Auto-allow devices in this range       │      │
│          │                                            │      │
│          │  [Complete Setup]                          │      │
│          └────────────────────────────────────────────┘      │
│                                                              │
│  STEP 4: Setup Complete                                      │
│          └─► Admin account created                           │
│          └─► LAN range configured                            │
│          └─► Server ready for users                          │
│          └─► Setup token invalidated                         │
│          └─► Redirect to Admin Panel login                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 🔐 Admin Panel Access (After Setup)

```
URL: http://192.168.1.100:3000/admin

┌────────────────────────────────────────────────────┐
│  🔐 ChitChat Admin Login                           │
│                                                    │
│  Username: [admin                            ]     │
│  Password: [••••••••••                       ]     │
│                                                    │
│  [Login]                                           │
│                                                    │
│  ⚠️ Admin panel is password protected             │
│  💡 Normal users don't need login (IP-based)      │
└────────────────────────────────────────────────────┘
```

### 📋 Setup Summary

| Item | How It Works |
|------|--------------|
| **First Run Detection** | Check if `admins` table is empty |
| **Setup Token** | Random string, 30 min expiry, shown in console |
| **Admin Account** | Username + Password (hashed) |
| **Normal Users** | No login needed, IP-based auto-identify |
| **LAN Range** | Configured during setup, editable in admin panel |

---

## ⚙️ Server Configuration

### 📁 Config File: `config.json`

```json
{
  "server": {
    "name": "ChitChat Server",
    "port": 3000,
    "host": "0.0.0.0"
  },
  
  "lan": {
    "allowedRanges": [
      {
        "cidr": "192.168.1.0/24",
        "label": "Office LAN",
        "active": true
      }
    ],
    "autoAllowNewDevices": true,
    "blockOutsideRange": true
  },
  
  "email": {
    "enabled": false,
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false,
      "user": "",
      "pass": ""
    },
    "from": {
      "name": "ChitChat",
      "email": "noreply@chitchat.local"
    }
  },
  
  "otp": {
    "length": 6,
    "expiryMinutes": 5,
    "maxAttempts": 3
  },
  
  "files": {
    "uploadDir": "./uploads",
    "maxSizeMB": 100,
    "allowedTypes": ["image/*", "video/*", "audio/*", "application/pdf"],
    "expiryDays": 30
  },
  
  "security": {
    "jwtSecret": "auto-generated-on-first-run",
    "sessionTimeout": 86400,
    "maxFailedLogins": 5,
    "lockoutMinutes": 30
  },
  
  "database": {
    "type": "sqlite",
    "path": "./data/chitchat.db"
  },
  
  "logging": {
    "level": "info",
    "file": "./logs/server.log",
    "retentionDays": 30
  }
}
```

### 🌍 Environment Variables (Optional Override)

```bash
# Server
PORT=3000
HOST=0.0.0.0

# Database
DB_PATH=./data/chitchat.db

# Security
JWT_SECRET=your-secret-key

# Email (if using)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 📂 Data Directory Structure

```
chit-chat/
├── config.json              # Server configuration
├── data/
│   └── chitchat.db          # SQLite database
├── uploads/                 # Uploaded files
│   ├── avatars/             # Profile pictures
│   └── files/               # Shared files
├── logs/
│   └── server.log           # Application logs
└── server/
    └── src/
        └── ...              # Server code
```

---

## 📦 ALL Features

### Phase 1: Core Chat
- [ ] Server with Socket.io
- [ ] IP-based auto-identification
- [ ] Peer list display
- [ ] 1-to-1 messaging
- [ ] Typing indicator
- [ ] Read receipts (✓ Sent, ✓✓ Delivered, ✓✓ Read)
- [ ] Online/offline status

### Phase 2: Chat Enhancements
- [ ] Message reactions (👍❤️😂🔥👏)
- [ ] Reply to message (quote)
- [ ] Forward message
- [ ] Message search
- [ ] Delete message (for me / for everyone)
- [ ] Edit message
- [ ] Pin messages
- [ ] Message timestamps
- [ ] **Emoji picker** (full emoji support)
- [ ] **GIF support** (Giphy/Tenor)
- [ ] **Stickers** (custom sticker packs)

### Phase 3: Files & Media
- [ ] File sharing (drag & drop)
- [ ] Image preview (inline)
- [ ] Video preview (inline)
- [ ] PDF preview
- [ ] Progress bar (upload/download)
- [ ] File size limits
- [ ] File type restrictions
- [ ] Chunked transfer for large files

### Phase 4: Voice & Video (🔮 FUTURE)
- [ ] Voice messages (record & send)
- [ ] Voice call (P2P WebRTC)
- [ ] Video call (P2P WebRTC)
- [ ] Screen share
- [ ] **Remote screen control**
- [ ] Call history
- [ ] Call recording

### Phase 5: Groups & Channels (WhatsApp-style)

#### Group Creation & Basics
- [ ] Create group (with name, avatar, description)
- [ ] Group invite link
- [ ] QR code to join group
- [ ] Group subject/description edit

#### Admin Hierarchy (WhatsApp-style)
```
Creator (Super Admin)
   └── Can do everything
   └── Can make others admin
   └── Can remove admins
   └── Cannot be removed

Admins
   └── Add/remove members
   └── Make others admin (if allowed)
   └── Edit group info (if allowed)
   └── Delete messages for all
   └── Can be removed by creator

Members
   └── Send messages (if allowed)
   └── Send media (if allowed)
   └── Add members (if allowed)
```

#### Group Settings (Configurable by Admin)
- [ ] Who can edit group info (all/admins only)
- [ ] Who can send messages (all/admins only)
- [ ] Who can add members (all/admins only)
- [ ] Approve new members (on/off)
- [ ] Message timer (disappearing messages)
- [ ] Lock group (only admins can send)

#### 🔐 Admin Messaging Control (WhatsApp-style) - NEW!

```
┌─────────────────────────────────────────────────────────────────┐
│  GROUP MESSAGE PERMISSIONS                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Who Can Send Messages:                                      │
│     ○ All Members                                               │
│     ○ Only Admins                                               │
│                                                                 │
│  2. Who Can Send Media (Photos/Videos/Files):                   │
│     ○ All Members                                               │
│     ○ Only Admins                                               │
│                                                                 │
│  3. Member-wise Permission Control:                             │
│     ┌───────────────────────────────────────────────────┐       │
│     │ User          │ Can Message │ Can Media │ Status  │       │
│     ├───────────────┼─────────────┼───────────┼─────────┤       │
│     │ Roshan        │ ✅ Yes      │ ✅ Yes    │ Active  │       │
│     │ Amit          │ ❌ No       │ ❌ No     │ Muted   │       │
│     │ Priya         │ ✅ Yes      │ ❌ No     │ Limited │       │
│     └───────────────────────────────────────────────────┘       │
│                                                                 │
│  4. Lock Group = Only admins can send                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### Member Muting System
- [ ] Mute member (can't send messages)
- [ ] Mute duration options:
  - 1 Hour
  - 1 Day  
  - 1 Week
  - Forever (until admin unmutes)
- [ ] Mute reason (optional)
- [ ] Unmute member
- [ ] View muted members list
- [ ] Mute notification to user

##### Individual Permission Control
- [ ] Block specific member from sending messages
- [ ] Block specific member from sending media only
- [ ] Allow text but block media
- [ ] Temporary restriction (auto-unmute after time)

##### Appeal System
- [ ] Muted user can send appeal request to admin
- [ ] Admin gets notification of appeal
- [ ] Admin can accept/reject appeal
- [ ] Appeal message with reason
- [ ] Appeal history log

##### Permission Audit Trail
- [ ] Log who muted whom and when
- [ ] Log permission changes
- [ ] View permission history

#### Group Features
- [ ] Add/remove members
- [ ] Make admin / Dismiss admin
- [ ] Leave group
- [ ] Delete group (creator only)
- [ ] Mute group notifications
- [ ] Pin group chat
- [ ] @mention members
- [ ] Reply to specific message
- [ ] Group message info (delivered/read by)
- [ ] Search in group
- [ ] Export group chat

#### Broadcast Channels
- [ ] One-way announcement channel
- [ ] Only admins can post
- [ ] Members can react only
- [ ] Subscriber count

### Phase 6: Desktop App
- [ ] Electron shell
- [ ] System tray icon
- [ ] Desktop notifications
- [ ] Auto-start on boot
- [ ] Minimize to tray
- [ ] Keyboard shortcuts
- [ ] Local SQLite cache

### Phase 7: Cloud & Mobile
- [ ] Cloud server (VPS/AWS)
- [ ] Email authentication
- [ ] Password reset
- [ ] Cloud message sync
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] QR code login

---

## 🛡️ Admin Panel Features

### Dashboard
- [ ] Total users count
- [ ] Online users count
- [ ] Messages today
- [ ] Files shared today
- [ ] Storage used
- [ ] Active sessions
- [ ] Server uptime
- [ ] Connection graph (real-time)

### User Management
- [ ] View all users
- [ ] Search/filter users
- [ ] User details (sessions, activity)
- [ ] Block/unblock user
- [ ] Kick user (disconnect)
- [ ] Delete user account
- [ ] Reset user password
- [ ] User role assignment

### Group Management
- [ ] View all groups
- [ ] Group members list
- [ ] Delete group
- [ ] Remove members
- [ ] Transfer ownership

### Message Control
- [ ] View recent messages
- [ ] Search messages
- [ ] Delete messages (moderation)
- [ ] Export chat history

### File Management
- [ ] View all files
- [ ] Storage usage per user
- [ ] Delete files
- [ ] Set file expiry
- [ ] File type restrictions

### Security
- [ ] IP whitelist
- [ ] IP blacklist
- [ ] Failed login attempts
- [ ] Session management
- [ ] Force logout all
- [ ] Encryption toggle
- [ ] Audit trail

### Settings
- [ ] Server name
- [ ] Max file size
- [ ] Allowed file types
- [ ] Message retention days
- [ ] Registration enable/disable
- [ ] Guest access enable/disable
- [ ] Maintenance mode

### Broadcast
- [ ] Send announcement to all
- [ ] Schedule broadcast
- [ ] Broadcast history

### Activity Logs
- [ ] User login/logout
- [ ] Message sent/deleted
- [ ] File upload/download
- [ ] Admin actions
- [ ] Export logs
- [ ] Log retention settings

### Monitoring
- [ ] Real-time active users
- [ ] Message rate
- [ ] Error logs
- [ ] Performance metrics
- [ ] API usage

---

## 📁 Project Structure

```
chit-chat/
├── PLAN.md
├── server/src/
│   ├── index.js
│   ├── db.js
│   ├── socket.js
│   └── discovery.js
│
├── client/src/
│   ├── App.jsx
│   ├── socket.js
│   ├── store.js
│   └── components/
│
├── admin-ui/src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Users.jsx
│   │   ├── Groups.jsx
│   │   ├── Messages.jsx
│   │   ├── Files.jsx
│   │   ├── Security.jsx
│   │   ├── Settings.jsx
│   │   ├── Broadcast.jsx
│   │   ├── Logs.jsx
│   │   └── Monitoring.jsx
│   └── components/
│
├── desktop/
└── shared/
```

---

## 🗄️ Database Schema (Complete & Consolidated)

> **Note:** This is the SINGLE source of truth for all database tables.

```sql
-- ============================================================
-- CORE TABLES
-- ============================================================

-- Users (IP-based, no password for normal users)
CREATE TABLE users (
  id TEXT PRIMARY KEY,                  -- IP address (e.g., "192.168.1.15")
  name TEXT,                            -- Display name (user can change)
  email TEXT UNIQUE,                    -- Linked email (optional, for remote access)
  email_verified INTEGER DEFAULT 0,     -- Is email verified via OTP?
  email_linked_by TEXT,                 -- 'admin' or 'user' or NULL
  email_linked_at DATETIME,             -- When email was linked
  avatar TEXT,                          -- Profile picture path
  status TEXT DEFAULT 'offline',        -- 'online', 'offline', 'away', 'busy'
  status_message TEXT,                  -- Custom status message
  device_info TEXT,                     -- Browser/OS info
  first_seen DATETIME,                  -- First connection time
  last_seen DATETIME,                   -- Last activity time
  is_blocked INTEGER DEFAULT 0,         -- Blocked by admin?
  blocked_reason TEXT,                  -- Why blocked
  blocked_by TEXT,                      -- Admin who blocked
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (Track active connections)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                  -- Unique session ID
  user_id TEXT NOT NULL,                -- IP address
  socket_id TEXT,                       -- Socket.io connection ID
  device_info TEXT,                     -- Browser, OS info
  user_agent TEXT,                      -- Full user agent string
  connected_at DATETIME,                -- Connection start time
  last_active DATETIME,                 -- Last activity in this session
  is_active INTEGER DEFAULT 1,          -- Currently connected?
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- MESSAGING TABLES
-- ============================================================

-- Messages (1-to-1 and Group)
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id TEXT NOT NULL,              -- User IP who sent
  receiver_id TEXT,                     -- User IP (for 1-to-1) or NULL (for group)
  group_id TEXT,                        -- Group ID (for group messages) or NULL
  content TEXT,                         -- Message text
  type TEXT DEFAULT 'text',             -- 'text', 'image', 'video', 'file', 'audio', 'sticker', 'gif'
  file_id TEXT,                         -- Reference to files table (if media)
  reply_to INTEGER,                     -- Message ID being replied to
  status TEXT DEFAULT 'sent',           -- 'sent', 'delivered', 'read'
  is_edited INTEGER DEFAULT 0,          -- Was message edited?
  edited_at DATETIME,                   -- When edited
  is_deleted INTEGER DEFAULT 0,         -- Deleted for everyone?
  deleted_for TEXT,                     -- JSON array of user IDs who deleted for themselves
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Message Read Status (Track who read which message)
CREATE TABLE message_status (
  message_id INTEGER,
  user_id TEXT,                         -- Who received/read
  status TEXT DEFAULT 'delivered',      -- 'delivered', 'read'
  delivered_at DATETIME,
  read_at DATETIME,
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Reactions (Emoji reactions to messages)
CREATE TABLE reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,                  -- '👍', '❤️', '😂', etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id, emoji),
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- GROUP TABLES
-- ============================================================

-- Groups
CREATE TABLE groups (
  id TEXT PRIMARY KEY,                  -- Unique group ID (UUID)
  name TEXT NOT NULL,                   -- Group name
  description TEXT,                     -- Group description
  avatar TEXT,                          -- Group picture path
  type TEXT DEFAULT 'group',            -- 'group' or 'broadcast'
  invite_link TEXT UNIQUE,              -- Shareable invite link code
  created_by TEXT NOT NULL,             -- Creator's IP (Super Admin)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Group Members
CREATE TABLE group_members (
  group_id TEXT,
  user_id TEXT,
  role TEXT DEFAULT 'member',           -- 'creator', 'admin', 'moderator', 'member'
  nickname TEXT,                        -- Optional nickname in group
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  added_by TEXT,                        -- Who added this member
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Group Settings (Admin controls)
CREATE TABLE group_settings (
  group_id TEXT PRIMARY KEY,
  who_can_send TEXT DEFAULT 'all',            -- 'all' or 'admins'
  who_can_send_media TEXT DEFAULT 'all',      -- 'all' or 'admins'
  who_can_add_members TEXT DEFAULT 'all',     -- 'all' or 'admins'
  who_can_edit_info TEXT DEFAULT 'admins',    -- 'all' or 'admins'
  is_locked INTEGER DEFAULT 0,                -- Group locked (only admins can send)?
  require_approval INTEGER DEFAULT 0,         -- New members need approval?
  message_timer INTEGER DEFAULT 0,            -- Disappearing messages (seconds, 0=off)
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Member Permissions (Individual member controls)
CREATE TABLE member_permissions (
  group_id TEXT,
  user_id TEXT,
  can_send_message INTEGER DEFAULT 1,         -- Can send text messages?
  can_send_media INTEGER DEFAULT 1,           -- Can send media/files?
  can_add_members INTEGER DEFAULT 1,          -- Can add new members?
  is_muted INTEGER DEFAULT 0,                 -- Is member muted?
  muted_until DATETIME,                       -- NULL = forever, else auto-unmute time
  muted_reason TEXT,                          -- Why muted
  muted_by TEXT,                              -- Admin who muted
  muted_at DATETIME,                          -- When muted
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Mute History (Audit trail)
CREATE TABLE mute_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT,
  user_id TEXT,
  action TEXT,                                -- 'muted', 'unmuted', 'extended'
  duration TEXT,                              -- '1h', '1d', '1w', 'forever'
  reason TEXT,
  performed_by TEXT,                          -- Admin who did this
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Appeal Requests (Muted users can appeal)
CREATE TABLE appeal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT,
  user_id TEXT,                               -- Who is appealing
  message TEXT,                               -- Appeal reason/message
  status TEXT DEFAULT 'pending',              -- 'pending', 'approved', 'rejected'
  reviewed_by TEXT,                           -- Admin who reviewed
  review_note TEXT,                           -- Admin's response
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME
);

-- Permission Change Log (Audit trail)
CREATE TABLE permission_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT,
  user_id TEXT,
  change_type TEXT,                           -- 'mute', 'unmute', 'block_media', etc.
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- FILE TABLES
-- ============================================================

-- Files (Uploaded files)
CREATE TABLE files (
  id TEXT PRIMARY KEY,                        -- Unique file ID (UUID)
  sender_id TEXT,                             -- Who uploaded
  original_name TEXT,                         -- Original filename
  stored_name TEXT,                           -- Stored filename on server
  path TEXT,                                  -- Full path on server
  size INTEGER,                               -- Size in bytes
  mime_type TEXT,                             -- MIME type
  message_id INTEGER,                         -- Associated message (if any)
  expires_at DATETIME,                        -- Auto-delete time (if set)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- ============================================================
-- ADMIN & AUTH TABLES
-- ============================================================

-- Admin Users (Password protected, separate from normal users)
CREATE TABLE admins (
  id TEXT PRIMARY KEY,                        -- Unique admin ID (UUID)
  username TEXT UNIQUE NOT NULL,              -- Admin username
  password_hash TEXT NOT NULL,                -- Bcrypt hashed password
  role TEXT DEFAULT 'admin',                  -- 'superadmin', 'admin', 'moderator'
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Setup Token (For first-time setup)
CREATE TABLE setup_tokens (
  id INTEGER PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,                 -- Random setup token
  expires_at DATETIME NOT NULL,               -- Token expiry time
  used INTEGER DEFAULT 0,                     -- Has token been used?
  used_at DATETIME,                           -- When used
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OTP Codes (For email verification)
CREATE TABLE otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,                        -- Email OTP was sent to
  code TEXT NOT NULL,                         -- 6-digit OTP code
  purpose TEXT NOT NULL,                      -- 'link' or 'login'
  user_ip TEXT,                               -- IP that requested OTP
  attempts INTEGER DEFAULT 0,                 -- Failed verification attempts
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,                     -- Has OTP been used?
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email Link History (Audit trail)
CREATE TABLE email_link_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,                               -- IP address
  email TEXT,
  action TEXT,                                -- 'linked', 'unlinked', 'changed'
  performed_by TEXT,                          -- 'admin' or 'user'
  admin_id TEXT,                              -- If admin did it
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- LAN & NETWORK TABLES
-- ============================================================

-- Allowed IP Ranges (LAN configuration)
CREATE TABLE allowed_ranges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cidr TEXT NOT NULL,                         -- "192.168.1.0/24"
  range_start TEXT,                           -- "192.168.1.0" (calculated)
  range_end TEXT,                             -- "192.168.1.255" (calculated)
  label TEXT,                                 -- "Office LAN"
  is_active INTEGER DEFAULT 1,                -- Is this range active?
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Blocked IPs
CREATE TABLE blocked_ips (
  ip TEXT PRIMARY KEY,
  reason TEXT,
  blocked_by TEXT,                            -- Admin who blocked
  blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SETTINGS & LOGS TABLES
-- ============================================================

-- Server Settings (Key-value store)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,                       -- Setting name
  value TEXT,                                 -- Setting value (JSON or string)
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs (Audit trail for everything)
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,                               -- User who performed action (IP or admin ID)
  user_type TEXT DEFAULT 'user',              -- 'user' or 'admin'
  action TEXT NOT NULL,                       -- Action type
  details TEXT,                               -- JSON with additional details
  ip TEXT,                                    -- IP address
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES (For performance)
-- ============================================================

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_group ON messages(group_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_otp_email ON otp_codes(email);
CREATE INDEX idx_logs_user ON logs(user_id);
CREATE INDEX idx_logs_created ON logs(created_at);
```

---

## 🎨 UI Design: Modern + Glassmorphism

### Color Palette
```css
--bg-dark: #0a0a0f;
--bg-glass: rgba(255, 255, 255, 0.05);
--border-glass: rgba(255, 255, 255, 0.1);
--accent: #6366f1;
--accent-glow: rgba(99, 102, 241, 0.3);
--success: #22c55e;
--warning: #f59e0b;
--danger: #ef4444;
--text-primary: #ffffff;
--text-muted: rgba(255, 255, 255, 0.4);
```

### Components
- Glassmorphism cards
- Glow effects on hover
- Gradient buttons
- Animated transitions
- Modern typography (Inter font)

---

## 🚀 Development Order

1. **Phase 1**: Core Chat (working messaging)
2. **Phase 2**: Chat enhancements
3. **Phase 3**: Files & media
4. **Phase 4**: Voice & video
5. **Phase 5**: Groups
6. **Phase 6**: Desktop app
7. **Phase 7**: Admin panel
8. **Phase 8**: Cloud & mobile

---

## ✅ Ready to Start!
