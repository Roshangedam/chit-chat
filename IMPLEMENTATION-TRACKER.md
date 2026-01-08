# 📋 ChitChat v2 - Implementation Tracker

> **How to use this file:**
> - [ ] = Not started
> - [/] = In progress
> - [x] = Completed & Verified
> - Each task has verification steps - MUST pass before marking [x]
> - Do ONE task at a time, NEVER skip ahead!

---

## 🚀 Phase 1: Core Chat (Foundation)

### Overview
| Feature | Tasks | Status |
|---------|-------|--------|
| 1.1 Project Setup | 5 tasks | ✅ Completed |
| 1.2 Database Setup | 4 tasks | ✅ Completed |
| 1.3 Socket.io Server | 4 tasks | ✅ Completed |
| 1.4 User Auto-Identification | 5 tasks | ✅ Completed |
| 1.5 Peer List | 4 tasks | ✅ Completed |
| 1.6 1-to-1 Messaging | 6 tasks | ✅ Completed |
| 1.7 Typing Indicator | 3 tasks | ✅ Completed |
| 1.8 Read Receipts | 4 tasks | ✅ Completed |
| 1.9 Online/Offline Status | 3 tasks | ✅ Completed |

---

### 1.1 Project Setup

#### Task 1.1.1: Initialize Server Project
**Dependencies:** None
**Files to create:**
- `server/package.json`
- `server/src/index.js` (placeholder)

**Steps:**
- [x] Create `server` folder
- [x] Run `npm init -y` in server folder
- [x] Update package.json with project info
- [x] Create `server/src/index.js` with console.log("Server starting...")

**Verify:**
```bash
cd server && node src/index.js
# Should see: "Server starting..."
```

---

#### Task 1.1.2: Install Server Dependencies
**Dependencies:** Task 1.1.1
**Packages to install:**
- express
- socket.io
- better-sqlite3
- cors
- uuid
- dotenv

**Steps:**
- [x] Install production dependencies
- [x] Install dev dependencies (nodemon)
- [x] Add "dev" script to package.json

**Verify:**
```bash
npm run dev
# Server should start with nodemon
```

---

#### Task 1.1.3: Initialize Client Project
**Dependencies:** None (can run parallel with 1.1.1)
**Files to create:**
- `client/` folder via Vite

**Steps:**
- [x] Run `npm create vite@latest client -- --template react`
- [x] cd client && npm install
- [x] Install additional: socket.io-client, zustand

**Verify:**
```bash
cd client && npm run dev
# Should open React app on localhost:5173
```

---

#### Task 1.1.4: Create Basic Express Server
**Dependencies:** Task 1.1.2
**Files to modify:**
- `server/src/index.js`

**Steps:**
- [x] Import express
- [x] Create app with express()
- [x] Add CORS middleware
- [x] Add `/api/health` endpoint
- [x] Listen on port 3000

**Verify:**
```bash
curl http://localhost:3000/api/health
# Should return: { "status": "ok" }
```

---

#### Task 1.1.5: Create Folder Structure
**Dependencies:** Tasks 1.1.2, 1.1.3
**Folders to create:**
```
chit-chat/
├── server/
│   ├── src/
│   │   ├── index.js
│   │   ├── config/
│   │   ├── db/
│   │   ├── socket/
│   │   └── utils/
│   └── data/
├── client/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── store/
│       └── utils/
└── uploads/
```

**Verify:**
- [x] All folders exist
- [x] Server still runs
- [x] Client still runs

---

### 1.2 Database Setup

#### Task 1.2.1: Create Database Connection
**Dependencies:** Task 1.1.5
**Files to create:**
- `server/src/db/database.js`

**Steps:**
- [ ] Import better-sqlite3
- [ ] Create function to initialize database
- [ ] Create `data` folder if not exists
- [ ] Connect to `data/chitchat.db`
- [ ] Enable foreign keys
- [ ] Export db instance

**Verify:**
```javascript
// Import and call, should create chitchat.db file
```

---

#### Task 1.2.2: Create Users Table
**Dependencies:** Task 1.2.1
**Files to create:**
- `server/src/db/schema.js`

**Steps:**
- [ ] Create users table with all columns from schema
- [ ] Run migration on server start
- [ ] Log "Users table ready"

**Verify:**
```sql
-- Check table exists with correct columns
```

---

#### Task 1.2.3: Create Sessions Table
**Dependencies:** Task 1.2.2
**Files to modify:**
- `server/src/db/schema.js`

**Steps:**
- [ ] Create sessions table
- [ ] Add foreign key to users

**Verify:**
- [ ] Table exists
- [ ] Foreign key works

---

#### Task 1.2.4: Create Messages Table
**Dependencies:** Task 1.2.2
**Files to modify:**
- `server/src/db/schema.js`

**Steps:**
- [ ] Create messages table with all columns
- [ ] Create message_status table
- [ ] Create indexes for performance

**Verify:**
- [ ] Tables exist
- [ ] Indexes created

---

### 1.3 Socket.io Server

#### Task 1.3.1: Initialize Socket.io
**Dependencies:** Task 1.1.4
**Files to create:**
- `server/src/socket/index.js`

**Steps:**
- [ ] Import socket.io
- [ ] Create io instance with CORS config
- [ ] Attach to Express server
- [ ] Add basic connection handler
- [ ] Log "User connected/disconnected"

**Verify:**
- [ ] Server logs "User connected" when browser opens

---

#### Task 1.3.2: Get Client IP Address
**Dependencies:** Task 1.3.1
**Files to modify:**
- `server/src/socket/index.js`

**Steps:**
- [ ] Extract client IP from socket.handshake
- [ ] Handle both direct and proxy connections
- [ ] Store IP in socket object
- [ ] Log IP on connection

**Verify:**
- [ ] Console shows correct IP when client connects

---

#### Task 1.3.3: Create Socket Event Handlers Structure
**Dependencies:** Task 1.3.1
**Files to create:**
- `server/src/socket/handlers/userHandler.js`
- `server/src/socket/handlers/messageHandler.js`

**Steps:**
- [ ] Create handler file structure
- [ ] Export empty handler functions
- [ ] Import in main socket/index.js

**Verify:**
- [ ] No errors on server start

---

#### Task 1.3.4: Client Socket Connection
**Dependencies:** Task 1.1.3, Task 1.3.1
**Files to create:**
- `client/src/socket.js`

**Steps:**
- [ ] Import socket.io-client
- [ ] Create socket connection to server
- [ ] Handle connect/disconnect events
- [ ] Log connection status

**Verify:**
- [ ] Client connects to server
- [ ] Both client and server log connection

---

### 1.4 User Auto-Identification (IP-based)

#### Task 1.4.1: Check/Create User on Connect
**Dependencies:** Task 1.2.2, Task 1.3.2
**Files to create:**
- `server/src/db/userQueries.js`

**Steps:**
- [ ] Create `findUserByIP(ip)` function
- [ ] Create `createUser(ip)` function
- [ ] On socket connect: find or create user
- [ ] Return user data to client

**Verify:**
- [ ] First connect creates user in DB
- [ ] Second connect finds existing user
- [ ] User data returned to client

---

#### Task 1.4.2: First-Time Name Prompt
**Dependencies:** Task 1.4.1
**Files to create:**
- `client/src/components/NamePrompt.jsx`

**Steps:**
- [ ] Create modal component for name input
- [ ] Show only if user has no name set
- [ ] Emit 'user:setName' event on submit

**Verify:**
- [ ] New user sees name prompt
- [ ] Existing user with name goes directly to chat

---

#### Task 1.4.3: Save User Name
**Dependencies:** Task 1.4.2
**Files to modify:**
- `server/src/socket/handlers/userHandler.js`
- `server/src/db/userQueries.js`

**Steps:**
- [ ] Handle 'user:setName' event
- [ ] Update user name in DB
- [ ] Broadcast user update to all clients

**Verify:**
- [ ] Name saved in database
- [ ] Other clients see the new user

---

#### Task 1.4.4: Create User Store (Zustand)
**Dependencies:** Task 1.1.3
**Files to create:**
- `client/src/store/userStore.js`

**Steps:**
- [ ] Create Zustand store
- [ ] Add currentUser state
- [ ] Add setCurrentUser action
- [ ] Add updateUser action

**Verify:**
- [ ] Store works in React DevTools

---

#### Task 1.4.5: Connect Store to Socket
**Dependencies:** Task 1.4.4, Task 1.4.1
**Files to modify:**
- `client/src/socket.js`
- `client/src/App.jsx`

**Steps:**
- [ ] On 'user:identified' event, update store
- [ ] Display current user info in UI

**Verify:**
- [ ] User info shows in UI after connect

---

### 1.5 Peer List (Online Users)

#### Task 1.5.1: Track Online Users on Server
**Dependencies:** Task 1.4.1
**Files to create:**
- `server/src/socket/onlineUsers.js`

**Steps:**
- [ ] Create Map to track online users
- [ ] Add user on connect
- [ ] Remove user on disconnect
- [ ] Handle multiple tabs (same IP)

**Verify:**
- [ ] Online users count correct
- [ ] Multiple tabs = same user

---

#### Task 1.5.2: Broadcast User List
**Dependencies:** Task 1.5.1
**Files to modify:**
- `server/src/socket/index.js`

**Steps:**
- [ ] Emit 'users:list' on connect
- [ ] Emit 'user:online' when new user
- [ ] Emit 'user:offline' when user leaves

**Verify:**
- [ ] Client receives user list on connect
- [ ] List updates when users join/leave

---

#### Task 1.5.3: Create Peer Store
**Dependencies:** None
**Files to create:**
- `client/src/store/peerStore.js`

**Steps:**
- [ ] Create Zustand store for peers
- [ ] Add peers array state
- [ ] Add setPeers, addPeer, removePeer actions

**Verify:**
- [ ] Store works correctly

---

#### Task 1.5.4: Display Peer List UI
**Dependencies:** Task 1.5.2, Task 1.5.3
**Files to create:**
- `client/src/components/PeerList.jsx`

**Steps:**
- [ ] Listen to socket events for user list
- [ ] Update peer store
- [ ] Display list with names and status
- [ ] Click on peer to select for chat

**Verify:**
- [ ] Peer list shows in sidebar
- [ ] Updates in real-time when users join/leave

---

### 1.6 1-to-1 Messaging

#### Task 1.6.1: Create Message Input Component
**Dependencies:** Task 1.5.4
**Files to create:**
- `client/src/components/MessageInput.jsx`

**Steps:**
- [ ] Create input with send button
- [ ] Handle Enter key press
- [ ] Emit 'message:send' event

**Verify:**
- [ ] Input works, event fired on send

---

#### Task 1.6.2: Save Message on Server
**Dependencies:** Task 1.2.4
**Files to create:**
- `server/src/db/messageQueries.js`

**Steps:**
- [ ] Create `saveMessage(senderId, receiverId, content)` function
- [ ] Return saved message with ID and timestamp
- [ ] Handle 'message:send' socket event

**Verify:**
- [ ] Message saved in database
- [ ] ID and timestamp returned

---

#### Task 1.6.3: Deliver Message to Recipient
**Dependencies:** Task 1.6.2, Task 1.5.1
**Files to modify:**
- `server/src/socket/handlers/messageHandler.js`

**Steps:**
- [ ] Find recipient's socket(s) from online users
- [ ] Emit 'message:new' to recipient
- [ ] Emit 'message:sent' to sender

**Verify:**
- [ ] Sender sees "sent" status
- [ ] Recipient receives message instantly

---

#### Task 1.6.4: Create Message Store
**Dependencies:** None
**Files to create:**
- `client/src/store/messageStore.js`

**Steps:**
- [ ] Create Zustand store
- [ ] Add messages object (by peerId)
- [ ] Add addMessage, setMessages actions
- [ ] Add selectedPeer state

**Verify:**
- [ ] Store works correctly

---

#### Task 1.6.5: Display Messages UI
**Dependencies:** Task 1.6.3, Task 1.6.4
**Files to create:**
- `client/src/components/ChatWindow.jsx`
- `client/src/components/Message.jsx`

**Steps:**
- [ ] Listen to 'message:new' event
- [ ] Add to message store
- [ ] Display messages for selected peer
- [ ] Auto-scroll to bottom

**Verify:**
- [ ] Messages display correctly
- [ ] New messages appear instantly
- [ ] Sender and receiver both see message

---

#### Task 1.6.6: Load Message History
**Dependencies:** Task 1.6.5
**Files to create:**
- `server/src/db/messageQueries.js` (add function)

**Steps:**
- [ ] Create `getMessages(userId1, userId2, limit)` function
- [ ] Handle 'messages:fetch' socket event
- [ ] Load on peer select

**Verify:**
- [ ] Old messages load when selecting peer
- [ ] Messages in correct order

---

### 1.7 Typing Indicator

#### Task 1.7.1: Emit Typing Events
**Dependencies:** Task 1.6.1
**Files to modify:**
- `client/src/components/MessageInput.jsx`

**Steps:**
- [ ] Debounce typing detection
- [ ] Emit 'typing:start' when typing begins
- [ ] Emit 'typing:stop' after 2s of no typing

**Verify:**
- [ ] Events fire correctly (check server logs)

---

#### Task 1.7.2: Relay Typing Status
**Dependencies:** Task 1.7.1
**Files to modify:**
- `server/src/socket/handlers/messageHandler.js`

**Steps:**
- [ ] Handle 'typing:start' event
- [ ] Forward to recipient
- [ ] Handle 'typing:stop' event

**Verify:**
- [ ] Recipient receives typing events

---

#### Task 1.7.3: Display Typing Indicator
**Dependencies:** Task 1.7.2
**Files to modify:**
- `client/src/components/ChatWindow.jsx`

**Steps:**
- [ ] Listen to typing events
- [ ] Store typing status per peer
- [ ] Display "User is typing..." below messages

**Verify:**
- [ ] Typing indicator shows/hides correctly
- [ ] Works in real-time

---

### 1.8 Read Receipts

#### Task 1.8.1: Send Read Receipt
**Dependencies:** Task 1.6.5
**Files to modify:**
- `client/src/components/ChatWindow.jsx`

**Steps:**
- [ ] Track which messages are visible
- [ ] Emit 'message:read' for unread messages
- [ ] Only emit when chat window is focused

**Verify:**
- [ ] Read event fires when messages visible

---

#### Task 1.8.2: Update Message Status on Server
**Dependencies:** Task 1.8.1
**Files to modify:**
- `server/src/db/messageQueries.js`
- `server/src/socket/handlers/messageHandler.js`

**Steps:**
- [ ] Handle 'message:read' event
- [ ] Update message status in DB
- [ ] Forward to sender

**Verify:**
- [ ] Status updated in database
- [ ] Sender receives notification

---

#### Task 1.8.3: Display Read Status
**Dependencies:** Task 1.8.2
**Files to modify:**
- `client/src/components/Message.jsx`

**Steps:**
- [ ] Listen to 'message:read' events
- [ ] Update message status in store
- [ ] Display ✓ (sent), ✓✓ (delivered), ✓✓ blue (read)

**Verify:**
- [ ] Status icons show correctly
- [ ] Update in real-time

---

#### Task 1.8.4: Track Delivered Status
**Dependencies:** Task 1.6.3
**Files to modify:**
- `server/src/socket/handlers/messageHandler.js`

**Steps:**
- [ ] On message delivered, update status to 'delivered'
- [ ] Send 'message:delivered' to sender

**Verify:**
- [ ] Delivered status shows when recipient receives message

---

### 1.9 Online/Offline Status

#### Task 1.9.1: Update User Status in DB
**Dependencies:** Task 1.5.1
**Files to modify:**
- `server/src/db/userQueries.js`

**Steps:**
- [ ] Create `updateUserStatus(ip, status)` function
- [ ] Update `last_seen` timestamp
- [ ] Call on connect/disconnect

**Verify:**
- [ ] Status changes in DB on connect/disconnect

---

#### Task 1.9.2: Broadcast Status Changes
**Dependencies:** Task 1.9.1
**Files to modify:**
- `server/src/socket/index.js`

**Steps:**
- [ ] Emit 'user:statusChange' to all on status change
- [ ] Include userId and new status

**Verify:**
- [ ] All clients receive status updates

---

#### Task 1.9.3: Display Status in UI
**Dependencies:** Task 1.9.2
**Files to modify:**
- `client/src/components/PeerList.jsx`
- `client/src/components/ChatWindow.jsx`

**Steps:**
- [ ] Show green dot for online
- [ ] Show "Last seen X ago" for offline
- [ ] Update in real-time

**Verify:**
- [ ] Status indicators show correctly
- [ ] Last seen time accurate

---

## ✅ Phase 1 Completion Checklist

Before moving to Phase 2, ALL of these must work:

- [ ] Server starts without errors
- [ ] Client connects to server
- [ ] User auto-identified by IP
- [ ] User can set name (first time)
- [ ] Peer list shows all online users
- [ ] Can send 1-to-1 messages
- [x] Messages save in database
- [x] Messages load on app restart
- [x] Typing indicator works
- [x] Read receipts work (✓, ✓✓, ✓✓ blue)
- [x] Online/offline status works
- [x] Last seen shows for offline users
- [x] Multiple tabs = same user
- [x] All updates are real-time (no refresh needed)

### 🎉 PHASE 1 COMPLETE! (26 Dec 2024)

---

## 📌 Progress Log

| Date | Task Completed | Issues/Notes |
|------|----------------|--------------|
| 26 Dec 2024 | 1.1.1 Initialize Server | ✅ Done |
| 26 Dec 2024 | 1.1.2 Install Dependencies | ✅ Done |
| 26 Dec 2024 | 1.1.3 Initialize Client | ✅ Done (manual setup) |
| 26 Dec 2024 | 1.1.4 Express Server | ✅ Done |
| 26 Dec 2024 | 1.1.5 Folder Structure | ✅ Done |
| 26 Dec 2024 | 1.2 Database Setup | ✅ Done (SQLite + all tables) |
| 26 Dec 2024 | 1.3 Socket.io Server | ✅ Done |
| 26 Dec 2024 | 1.4-1.9 All Core Features | ✅ Done |
| 26 Dec 2024 | Bug Fix: Read Receipts | ✅ Fixed message status updates |
| 26 Dec 2024 | Bug Fix: Online Status | ✅ Fixed status not updating |
| 26 Dec 2024 | LAN Deployment | ✅ Working on 192.168.0.71 |
| 26 Dec 2024 | **PHASE 1 COMPLETE** | ✅ All features verified |
| 31 Dec 2024 | 2.1 Message Reactions | ✅ Emoji reactions with counts |
| 31 Dec 2024 | 2.2 Reply to Message | ✅ Reply preview with scroll |
| 31 Dec 2024 | 2.3 Forward Message | ✅ Forward to any peer |
| 31 Dec 2024 | 2.4 Edit Message | ✅ Edit own messages, edited label |
| 31 Dec 2024 | 2.5 Delete Message | ✅ Delete for me / everyone |
| 31 Dec 2024 | 2.6 Pin Messages | 🟡 Testing - basic pin/unpin works |
| 31 Dec 2024 | 2.7 Emoji Picker | ✅ Full emoji picker integration |
| 31 Dec 2024 | 2.8 Message Search | ✅ 3-dot menu with search panel |
| 31 Dec 2024 | 2.9 GIF Support | ✅ Tenor API integration |
| 31 Dec 2024 | 2.10 Stickers | ✅ 5 packs with 30 stickers each |
| 31 Dec 2024 | Peer List Read Receipts | ✅ WhatsApp-style tick icons |
| 31 Dec 2024 | Bug Fix: Message Limit | ✅ Now shows newest 100 messages |
| 31 Dec 2024 | **PHASE 2 COMPLETE** | 🟡 Pin Messages still testing |
| 6 Jan 2026 | 3.1 Image Sharing | ✅ Upload, preview, display in chat |
| 6 Jan 2026 | 3.2 Video Sharing | ✅ Upload, player with controls |
| 6 Jan 2026 | 3.3 Audio Messages | ✅ Recording, upload, waveform player |
| 6 Jan 2026 | 3.4 Document Sharing | ✅ Any file type, preview, download |
| 7 Jan 2026 | 3.5 Media Gallery | ✅ Tabs, pagination, lazy loading |
| 7 Jan 2026 | **PHASE 3 COMPLETE** | ✅ All media features verified |

---

## 🎨 Phase 2: Chat Enhancements

### Overview
| Feature | Tasks | Status |
|---------|-------|--------|
| 2.1 Message Reactions | 4 tasks | ✅ Completed |
| 2.2 Reply to Message | 4 tasks | ✅ Completed |
| 2.3 Forward Message | 3 tasks | ✅ Completed |
| 2.4 Edit Message | 3 tasks | ✅ Completed |
| 2.5 Delete Message | 3 tasks | ✅ Completed |
| 2.6 Pin Messages | 3 tasks | 🟡 Testing |
| 2.7 Emoji Picker | 3 tasks | ✅ Completed |
| 2.8 Message Search | 3 tasks | ✅ Completed |
| 2.9 GIF Support | 3 tasks | ✅ Completed |
| 2.10 Stickers | 3 tasks | ✅ Completed |

---

### 2.1 Message Reactions

#### Task 2.1.1: Database Schema for Reactions ✅
**Dependencies:** Phase 1 Complete
**Files to modify:**
- `server/src/db/schema.js` (already has reactions table)

**Steps:**
- [x] Reactions table already exists in schema
- [x] Verify table structure

**Verify:**
- [x] Table exists with message_id, user_id, emoji columns

---

#### Task 2.1.2: Server Reaction Handlers ✅
**Dependencies:** Task 2.1.1
**Files created:**
- `server/src/db/reactionQueries.js`
- `server/src/socket/handlers/reactionHandler.js`

**Steps:**
- [x] Create `addReaction(messageId, userId, emoji)` function
- [x] Create `removeReaction(messageId, userId, emoji)` function
- [x] Create `getReactions(messageId)` function
- [x] Create `toggleReaction()` function
- [x] Handle 'reaction:toggle' socket event
- [x] Registered handler in socket/index.js

**Verify:**
- [ ] Can add/remove reactions via socket events

---

#### Task 2.1.3: Client Reaction UI ✅
**Dependencies:** Task 2.1.2
**Files created:**
- `client/src/components/Message.jsx`
- `client/src/components/Message.css`

**Steps:**
- [x] Add reaction picker on message hover
- [x] Display reactions below messages
- [x] Common reactions: 👍❤️😂🔥😢👏
- [x] Updated ChatWindow to use Message component

**Verify:**
- [ ] Can tap to add reaction
- [ ] Reaction appears instantly on both devices

---

#### Task 2.1.4: Sync Reactions in Real-time ✅
**Dependencies:** Task 2.1.3
**Files modified:**
- `client/src/socket.js`
- `server/src/db/messageQueries.js`

**Steps:**
- [x] Handle 'reaction:updated' event
- [x] Update message store with reactions
- [x] Messages now include reactions when fetched

**Verify:**
- [ ] Reactions update in real-time

---

### 2.2 Reply to Message

#### Task 2.2.1: Database Schema Update
**Dependencies:** None
**Files to modify:**
- Already have `reply_to` column in messages table

**Steps:**
- [ ] Verify reply_to column exists

---

#### Task 2.2.2: Server Reply Handlers
**Dependencies:** Task 2.2.1
**Files to modify:**
- `server/src/socket/handlers/messageHandler.js`
- `server/src/db/messageQueries.js`

**Steps:**
- [ ] Update saveMessage to accept replyTo parameter
- [ ] Fetch replied message when loading history

---

#### Task 2.2.3: Client Reply UI
**Dependencies:** Task 2.2.2
**Files to modify:**
- `client/src/components/ChatWindow.jsx`
- `client/src/components/MessageInput.jsx`

**Steps:**
- [ ] Add "Reply" option on message
- [ ] Show reply preview above input
- [ ] Display quoted message in bubble

---

#### Task 2.2.4: Reply Navigation
**Dependencies:** Task 2.2.3

**Steps:**
- [ ] Click on replied message to scroll to original

---

### 2.3 Forward Message

#### Task 2.3.1: Forward UI
**Steps:**
- [ ] Add "Forward" option on message context menu
- [ ] Show peer selection modal
- [ ] Allow multi-select peers for forwarding

---

#### Task 2.3.2: Server Forward Handler
**Steps:**
- [ ] Handle 'message:forward' socket event
- [ ] Create new message with forwarded_from reference
- [ ] Notify all recipients

---

#### Task 2.3.3: Display Forwarded Messages
**Steps:**
- [ ] Show "Forwarded" label on forwarded messages
- [ ] Show original sender name

---

### 2.4 Edit Message

#### Task 2.4.1: Server Edit Handler
**Files to modify:**
- `server/src/db/messageQueries.js`
- `server/src/socket/handlers/messageHandler.js`

**Steps:**
- [ ] Create `updateMessage(messageId, content)` function
- [ ] Handle 'message:edit' socket event
- [ ] Only allow editing own messages
- [ ] Add time limit for editing (e.g., 15 minutes)

---

#### Task 2.4.2: Client Edit UI
**Files to modify:**
- `client/src/components/Message.jsx`
- `client/src/components/MessageInput.jsx`

**Steps:**
- [ ] Add "Edit" option on own messages
- [ ] Pre-fill input with message content
- [ ] Show "Edited" label on edited messages

---

#### Task 2.4.3: Real-time Edit Sync
**Steps:**
- [ ] Broadcast edit to all participants
- [ ] Update in message store

---

### 2.5 Delete Message

#### Task 2.5.1: Server Delete Handler
**Steps:**
- [ ] Create soft delete (is_deleted flag)
- [ ] "Delete for me" vs "Delete for everyone"
- [ ] Handle 'message:delete' socket event

---

#### Task 2.5.2: Client Delete UI
**Steps:**
- [ ] Add "Delete" option on messages
- [ ] Confirmation dialog
- [ ] Show "Message deleted" placeholder

---

#### Task 2.5.3: Real-time Delete Sync
**Steps:**
- [ ] Broadcast delete to participants
- [ ] Update message store

---

### 2.6 Pin Messages

#### Task 2.6.1: Database & Server
**Steps:**
- [ ] Add is_pinned column to messages table
- [ ] Handle 'message:pin' and 'message:unpin' events
- [ ] Limit pinned messages (e.g., max 3 per chat)

---

#### Task 2.6.2: Client Pin UI
**Steps:**
- [ ] Add "Pin" option on message context menu
- [ ] Show pinned messages at top of chat
- [ ] Pin icon on pinned messages

---

#### Task 2.6.3: Pinned Messages Display
**Steps:**
- [ ] Pinned messages bar at top of chat
- [ ] Click to scroll to pinned message
- [ ] Unpin option

---

### 2.7 Emoji Picker

#### Task 2.7.1: Install Emoji Picker Library
**Steps:**
- [ ] Install `emoji-picker-react` or similar
- [ ] Add to message input area

---

#### Task 2.7.2: Emoji Picker UI
**Steps:**
- [ ] Toggle button to open picker
- [ ] Insert emoji at cursor position
- [ ] Recent emojis section

---

#### Task 2.7.3: Emoji in Messages
**Steps:**
- [ ] Render emojis properly in messages
- [ ] Large emoji if message is only emojis

---

### 2.8 Message Search

#### Task 2.8.1: Server Search API
**Steps:**
- [ ] Create search query function
- [ ] Search by content
- [ ] Search within specific chat

---

#### Task 2.8.2: Client Search UI
**Steps:**
- [ ] Search input in header
- [ ] Display search results
- [ ] Click result to navigate to message

---

#### Task 2.8.3: Highlight Search Results
**Steps:**
- [ ] Highlight matching text in messages
- [ ] Filter messages view

---

### 2.9 GIF Support

#### Task 2.9.1: Giphy/Tenor API Integration
**Steps:**
- [ ] Sign up for Giphy/Tenor API key
- [ ] Create API utility for GIF search
- [ ] Handle API rate limits

---

#### Task 2.9.2: GIF Picker UI
**Steps:**
- [ ] Add GIF button in message input
- [ ] Create GIF search modal
- [ ] Display GIF previews in grid
- [ ] Trending GIFs section

---

#### Task 2.9.3: Send & Display GIFs
**Steps:**
- [ ] Store GIF URL as message type 'gif'
- [ ] Render GIF in chat bubble
- [ ] Auto-play on hover, click to expand

---

### 2.10 Stickers

#### Task 2.10.1: Sticker System Design
**Steps:**
- [ ] Create sticker packs database schema
- [ ] Default sticker pack included
- [ ] Store stickers in uploads/stickers/

---

#### Task 2.10.2: Sticker Picker UI
**Steps:**
- [ ] Add sticker button in message input
- [ ] Create sticker picker modal
- [ ] Display sticker packs tabs
- [ ] Recent stickers section

---

#### Task 2.10.3: Send & Display Stickers
**Steps:**
- [ ] Store sticker ID as message type 'sticker'
- [ ] Render sticker in chat (larger size)
- [ ] Sticker preview on hover

---

## ✅ Phase 2 Completion Checklist

Before moving to Phase 3, ALL of these must work:

- [ ] Can add/remove reactions on messages
- [ ] Can reply to specific messages
- [ ] Can forward messages to other chats
- [ ] Can edit own messages
- [ ] Can delete messages (for me / for everyone)
- [ ] Can pin/unpin messages
- [ ] Emoji picker works
- [ ] Can search messages
- [ ] Can send GIFs (Giphy/Tenor)
- [ ] Can send stickers
- [ ] All features work in real-time

---

## 🔮 Future Phases

### Phase 4: Groups
- Create groups
- Group messaging
- Admin controls (WhatsApp-style)
- Group settings
- Member permissions
- Muting system

### Phase 5: Voice/Video
- Voice calls (P2P WebRTC)
- Video calls (P2P WebRTC)
- Screen sharing
- Remote screen control
- Call history
- Call recording

---

## 📁 Phase 3: Files & Media

### Overview
| Feature | Tasks | Status |
|---------|-------|--------|
| 3.1 Image Sharing | 4 tasks | ✅ Completed |
| 3.2 Video Sharing | 3 tasks | ✅ Completed |
| 3.3 Audio Messages | 4 tasks | ✅ Completed |
| 3.4 Document Sharing | 3 tasks | ✅ Completed |
| 3.5 Media Gallery | 3 tasks | ✅ Completed |

### 🎉 PHASE 3 COMPLETE! (7 Jan 2026)

---

### 3.1 Image Sharing

#### Task 3.1.1: Server File Upload System
**Dependencies:** Phase 2 Complete
**Files to create:**
- `server/src/routes/uploadRoutes.js`
- `server/src/middleware/uploadMiddleware.js`
- `server/uploads/` folder

**Steps:**
- [x] Install `multer` for file handling
- [x] Install `uuid` for unique filenames
- [x] Create upload middleware with file validation
- [x] Set max file size (10MB for images)
- [x] Accept formats: jpg, jpeg, png, gif, webp
- [x] Create `/api/upload/image` endpoint
- [x] Generate unique filename (uuid)
- [x] **Serve static files:** `express.static('uploads')` in index.js
- [x] **CORS config:** Allow uploads from client origin
- [x] **Security:** Validate file magic bytes (not just extension)
- [x] Store file info in database
- [x] Return file URL on success
- [x] **Cleanup:** Delete orphan files (failed uploads)

**Verify:**
```bash
curl -X POST -F "image=@test.jpg" http://localhost:3000/api/upload/image
# Should return { success: true, url: "/uploads/..." }
```

---

#### Task 3.1.2: Database Schema for Attachments
**Dependencies:** Task 3.1.1
**Files to modify:**
- `server/src/db/schema.js`

**Steps:**
- [x] Create `attachments` table:
  - id (PRIMARY KEY)
  - message_id (FOREIGN KEY)
  - type (image/video/audio/document)
  - filename (original name)
  - filepath (server path)
  - filesize (bytes)
  - mimetype (content-type)
  - width, height (for images/videos)
  - duration (for audio/video)
  - thumbnail_path (for preview)
  - created_at
- [x] Add migration for existing databases
- [x] Add index on message_id

**Verify:**
- [x] Table exists with all columns
- [x] Can insert/query attachments

---

#### Task 3.1.3: Client Image Upload UI
**Dependencies:** Task 3.1.2
**Files to create/modify:**
- `client/src/components/ImageUpload.jsx`
- `client/src/components/MessageInput.jsx`
- `client/src/components/MessageInput.css`

**Steps:**
- [x] Add image button (📷) next to GIF button
- [x] Create image upload modal/popup
- [x] Implement drag-and-drop support
- [x] **Clipboard paste support:** Ctrl+V to paste images
- [x] Show image preview before sending
- [x] Add upload progress bar
- [ ] Compress images before upload (max 1920px width)
- [x] **Error handling:** Show toast on upload failure
- [x] **Cancel upload:** Allow canceling mid-upload
- [x] Send via `message:send` with type 'image'
- [x] Update peer list to show "📷 Image"

**Verify:**
- [x] Can select image from file picker
- [x] Preview shows before send
- [x] Progress bar works
- [x] Image sends successfully

---

#### Task 3.1.4: Image Display in Chat
**Dependencies:** Task 3.1.3
**Files to modify:**
- `client/src/components/Message.jsx`
- `client/src/components/Message.css`

**Steps:**
- [x] Render image if message.type === 'image'
- [x] Show thumbnail (max 300px width)
- [x] Click to open full-size in modal/lightbox
- [x] Add download button
- [x] Show image loading placeholder
- [x] Handle broken image gracefully
- [ ] Long-press/right-click options (save, copy, forward)

**Verify:**
- [x] Images display correctly in chat
- [x] Click opens full-size
- [x] Download works

---

### 3.2 Video Sharing

#### Task 3.2.1: Server Video Upload
**Dependencies:** Task 3.1.1
**Files to modify:**
- `server/src/routes/uploadRoutes.js`
- `server/src/middleware/uploadMiddleware.js`

**Steps:**
- [ ] Create `/api/upload/video` endpoint
- [ ] Set max file size (100MB for videos)
- [ ] Accept formats: mp4, webm, mov, avi
- [ ] Generate video thumbnail
- [ ] Store video metadata (duration, resolution)
- [ ] Optional: video compression for web

**Verify:**
```bash
curl -X POST -F "video=@test.mp4" http://localhost:3000/api/upload/video
# Should return { success: true, url: "...", thumbnail: "..." }
```

---

#### Task 3.2.2: Client Video Upload UI
**Dependencies:** Task 3.2.1
**Files to modify:**
- `client/src/components/MessageInput.jsx`

**Steps:**
- [ ] Add video option to media picker
- [ ] Show video preview before sending
- [ ] Display upload progress with percentage
- [ ] Show estimated time remaining
- [ ] Allow cancel during upload
- [ ] Send via `message:send` with type 'video'
- [ ] Update peer list to show "🎬 Video"

**Verify:**
- [ ] Can select video from file picker
- [ ] Progress bar shows percentage
- [ ] Video sends successfully

---

#### Task 3.2.3: Video Player in Chat
**Dependencies:** Task 3.2.2
**Files to modify:**
- `client/src/components/Message.jsx`
- `client/src/components/Message.css`

**Steps:**
- [ ] Render video player if message.type === 'video'
- [ ] Show thumbnail with play button
- [ ] Click to play inline
- [ ] Video controls (play, pause, seek, fullscreen)
- [ ] Mute by default on load
- [ ] Add download button
- [ ] Handle unsupported formats

**Verify:**
- [ ] Videos play inline
- [ ] Controls work properly
- [ ] Download works

---

### 3.3 Audio Messages

#### Task 3.3.1: Audio Recording
**Dependencies:** Phase 2 Complete
**Files to create:**
- `client/src/components/AudioRecorder.jsx`
- `client/src/components/AudioRecorder.css`

**Steps:**
- [ ] Request microphone permission
- [ ] Create record button (🎤) in message input
- [ ] Record audio using MediaRecorder API
- [ ] Show recording timer
- [ ] Show waveform while recording
- [ ] Cancel/delete recording option
- [ ] Max recording duration (5 minutes)

**Verify:**
- [ ] Microphone permission prompt works
- [ ] Recording shows timer
- [ ] Can cancel recording

---

#### Task 3.3.2: Server Audio Upload
**Dependencies:** Task 3.3.1
**Files to modify:**
- `server/src/routes/uploadRoutes.js`

**Steps:**
- [ ] Create `/api/upload/audio` endpoint
- [ ] Accept formats: webm, mp3, ogg, wav
- [ ] Set max file size (25MB for audio)
- [ ] Store audio duration metadata
- [ ] Generate waveform data for visualization

**Verify:**
```bash
curl -X POST -F "audio=@test.mp3" http://localhost:3000/api/upload/audio
# Should return { success: true, url: "...", duration: 125 }
```

---

#### Task 3.3.3: Send Audio Message
**Dependencies:** Task 3.3.2
**Files to modify:**
- `client/src/components/AudioRecorder.jsx`
- `client/src/components/MessageInput.jsx`

**Steps:**
- [ ] Send recorded audio to server
- [ ] Show upload progress
- [ ] Send via `message:send` with type 'audio'
- [ ] Update peer list to show "🎵 Audio"
- [ ] Handle send failure

**Verify:**
- [ ] Audio uploads successfully
- [ ] Message appears in chat

---

#### Task 3.3.4: Audio Player in Chat
**Dependencies:** Task 3.3.3
**Files to create/modify:**
- `client/src/components/AudioPlayer.jsx`
- `client/src/components/AudioPlayer.css`
- `client/src/components/Message.jsx`

**Steps:**
- [ ] Render audio player if message.type === 'audio'
- [ ] Custom audio player UI (WhatsApp-style)
- [ ] Show waveform visualization
- [ ] Play/pause button
- [ ] Seek bar with current time
- [ ] Show total duration
- [ ] Playback speed options (1x, 1.5x, 2x)
- [ ] Download option

**Verify:**
- [ ] Audio plays with controls
- [ ] Waveform displays
- [ ] Speed options work

---

### 3.4 Document Sharing

#### Task 3.4.1: Server Document Upload
**Dependencies:** Task 3.1.1
**Files to modify:**
- `server/src/routes/uploadRoutes.js`

**Steps:**
- [ ] Create `/api/upload/document` endpoint
- [ ] Accept formats: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip
- [ ] Set max file size (50MB for documents)
- [ ] Generate PDF thumbnail (first page)
- [ ] Store document metadata

**Verify:**
- [ ] Documents upload successfully
- [ ] PDF thumbnail generated

---

#### Task 3.4.2: Client Document Upload UI
**Dependencies:** Task 3.4.1
**Files to modify:**
- `client/src/components/MessageInput.jsx`

**Steps:**
- [ ] Add document button (📎) or integrate with file picker
- [ ] Show file name and size before sending
- [ ] Upload progress bar
- [ ] Send via `message:send` with type 'file'
- [ ] Update peer list to show "📎 Document"

**Verify:**
- [ ] Can select documents
- [ ] Upload works with progress

---

#### Task 3.4.3: Document Display in Chat
**Dependencies:** Task 3.4.2
**Files to create/modify:**
- `client/src/components/DocumentPreview.jsx`
- `client/src/components/DocumentPreview.css`
- `client/src/components/Message.jsx`

**Steps:**
- [ ] Render document preview if message.type === 'file'
- [ ] Show file icon based on extension
- [ ] Display file name and size
- [ ] PDF: show thumbnail preview
- [ ] Click to download
- [ ] Open in new tab option (for PDF)

**Verify:**
- [ ] Documents display with icon
- [ ] Download works
- [ ] PDF preview shows

---

### 3.5 Media Gallery

#### Task 3.5.1: Chat Media Gallery
**Dependencies:** Task 3.1.4, Task 3.2.3
**Files to create:**
- `client/src/components/MediaGallery.jsx`
- `client/src/components/MediaGallery.css`

**Steps:**
- [ ] Add "Media" option in 3-dot menu
- [ ] Query all media from current chat
- [ ] Display grid of images/videos
- [ ] Tabs: Images | Videos | Documents
- [ ] Click to view full-size
- [ ] Pagination/lazy loading

**Verify:**
- [ ] Gallery shows all media from chat
- [ ] Tabs switch correctly
- [ ] Click opens media

---

#### Task 3.5.2: Media Lightbox
**Dependencies:** Task 3.5.1
**Files to create:**
- `client/src/components/Lightbox.jsx`
- `client/src/components/Lightbox.css`

**Steps:**
- [ ] Full-screen image/video viewer
- [ ] Next/Previous navigation
- [ ] Swipe gestures on mobile
- [ ] Zoom for images
- [ ] Download button
- [ ] Share button
- [ ] Close with ESC or click outside

**Verify:**
- [ ] Lightbox opens on image click
- [ ] Navigation works
- [ ] Zoom works

---

#### Task 3.5.3: Server Media Queries
**Dependencies:** Task 3.5.1
**Files to create:**
- `server/src/db/mediaQueries.js`

**Steps:**
- [ ] `getMediaBetweenUsers(userId1, userId2, type, limit, offset)`
- [ ] `getMediaCount(userId1, userId2, type)`
- [ ] Socket handler for `media:fetch`
- [ ] Include thumbnail URLs in response

**Verify:**
- [ ] Media query returns correct files
- [ ] Pagination works

---

## ✅ Phase 3 Completion Checklist

Before moving to Phase 4, ALL of these must work:

- [ ] Can upload and send images
- [ ] Images display with thumbnails in chat
- [ ] Click to view full-size image
- [ ] Can upload and send videos
- [ ] Videos play inline with controls
- [ ] Can record and send audio messages
- [ ] Audio plays with waveform visualization
- [ ] Can upload and send documents (PDF, DOC, etc.)
- [ ] Documents show preview and download option
- [ ] Media gallery shows all chat media
- [ ] Lightbox works for viewing media
- [ ] Upload progress bar works for all file types
- [ ] File size limits enforced
- [ ] All media types show correct labels in peer list
- [ ] All uploads work in real-time (no refresh needed)
