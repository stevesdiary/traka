# Chat Feature Implementation

## Overview
Real-time chat implementation using WebSocket (Socket.io) for rider-customer communication on package deliveries.

## Backend Components

### 1. WebSocket Service (`/src/websocket/websocket.service.ts`)
- Manages Socket.io server
- JWT authentication middleware
- Room-based messaging (package:id)
- Events: `join-package`, `leave-package`, `send-message`, `new-message`

### 2. Message Model (`/src/message/message.model.ts`)
- Stores chat messages
- Fields: package_id, sender_id, message, is_read, timestamps

### 3. Message Service (`/src/message/message.service.ts`)
- `sendMessage()` - Send a message
- `getMessages()` - Get all messages for a package
- `getUnreadCount()` - Get unread message count

### 4. Message Routes
- `POST /packages/:packageId/messages` - Send message (fallback)
- `GET /packages/:packageId/messages` - Get messages
- `GET /packages/:packageId/messages/unread` - Get unread count

## Frontend Components

### 1. useSocket Hook (`/src/hooks/useSocket.ts`)
- Manages WebSocket connection
- Auto-connects with JWT token
- Handles connect/disconnect events

### 2. ChatBox Component (`/src/components/chat/ChatBox.tsx`)
- Real-time chat UI
- Joins package room on mount
- Listens for `new-message` events
- Sends messages via `send-message` event
- Auto-scrolls to latest message

### 3. Integration
- Added to MyPackagesPage with "Chat" button
- Opens in modal overlay

## WebSocket Events

### Client → Server
- `join-package` - Join a package chat room
- `leave-package` - Leave a package chat room
- `send-message` - Send a message

### Server → Client
- `new-message` - Broadcast new message to room

## Database

### Migration: `create_messages_table.sql`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES packages(id),
  sender_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Migration: `add_rider_id_to_packages.sql`
```sql
ALTER TABLE packages ADD COLUMN rider_id UUID REFERENCES users(id);
```

## Authorization
- WebSocket: JWT token in handshake auth
- Only package sender and assigned rider can join room
- Messages validated before broadcast

## Usage

### Customer View
1. Go to "My Packages"
2. Click "Chat" button on any package
3. Real-time messaging with assigned rider

### Rider View
- Can be integrated into RiderDashboard
- Access chat for assigned deliveries

## Dependencies
- Backend: `socket.io`
- Frontend: `socket.io-client`

## Environment Variables
- `CLIENT_URL` - Frontend URL for CORS (default: http://localhost:5173)
- `VITE_API_URL` - Backend API URL for WebSocket connection
