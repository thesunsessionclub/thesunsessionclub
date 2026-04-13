import { Server } from 'socket.io';
import { config } from './config/env.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('[WS] Client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('[WS] Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

// Emit helpers — call these from controllers after DB mutations
export function broadcast(event, data) {
  if (io) io.emit(event, data);
}
