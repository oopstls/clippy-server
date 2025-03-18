import { Server, Socket } from 'socket.io';
import log from './logger';
import { SyncData, RegisterData, HistoryMessage } from './types';
import { insertMessage, getMessages, deleteMessages } from './db';

// 房间用户管理：Map<room, Map<userId, Socket>>
const roomUsers: Map<string, Map<string, Socket>> = new Map();

/**
 * 获取当前日期的字符串格式 YYYY-MM-DD
 * @returns 当前日期字符串
 */
function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 处理Socket连接
 * @param io Socket.io 服务器实例
 */
function handleSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`新客户端连接: ${socket.id}`);

    // 监听注册事件，携带房间 ID 和用户 ID
    socket.on('register', async (registerData: RegisterData) => {
      const { room, userId } = registerData;

      // 添加非空检查
      if (!room || !userId) {
        console.log(`Socket ${socket.id} 注册失败：房间号或用户ID为空`);
        socket.emit('registrationError', { message: 'Room ID and User ID cannot be empty.' });
        socket.disconnect();
        return;
      }

      console.log(`Socket ${socket.id} 尝试注册房间: ${room}, 用户ID: ${userId}`);

      // 检查是否房间已存在
      if (!roomUsers.has(room)) {
        roomUsers.set(room, new Map());
        console.log(`已创建新的房间映射: ${room}`);
      }

      const usersInRoom = roomUsers.get(room)!;

      // 检查用户ID是否已存在
      if (usersInRoom.has(userId)) {
        console.log(`用户ID ${userId} 在房间 ${room} 已存在，断开连接`);
        socket.emit('registrationError', { message: 'User ID already exists in this room.' });
        socket.disconnect();
        return;
      }

      // 注册用户
      usersInRoom.set(userId, socket);
      socket.join(room);
      console.log(`Socket ${socket.id} 成功注册房间: ${room}, 用户ID: ${userId}`);

      // 获取历史消息并发送给该用户
      try {
        const historyMessages: HistoryMessage[] = getMessages(room);
        // 将 HistoryMessage 转换为 SyncData，包含 timestamp
        const syncHistory: SyncData[] = historyMessages.map(msg => ({
          type: msg.type,
          content: msg.content,
          fromUserId: msg.userId,
          timestamp: msg.timestamp
        }));
        // 在发送历史消息前清空消息区域
        socket.emit('history', syncHistory);
        console.log(`发送历史消息给 Socket ${socket.id}，房间: ${room}`);
      } catch (error) {
        console.error(`获取历史消息失败 | 房间: ${room} | 错误: ${error}`);
        socket.emit('historyError', { message: 'Failed to retrieve history messages.' });
      }

      // 监听同步数据事件
      socket.on('syncData', (data: SyncData) => {
        const logContent = data.type === 'image' ? '[Image]' : data.content;

        log('Received', new Date(), room, userId, data.type, logContent);

        // 存储消息到数据库，获取服务器记录的时间戳
        let timestamp: string;
        try {
          timestamp = insertMessage(room, userId, data.type, data.content);
        } catch (error) {
          console.error(`存储消息失败 | 房间: ${room} | 用户ID: ${userId} | 类型: ${data.type} | 错误: ${error}`);
          socket.emit('error', { message: 'Failed to store message.' }); // 发送错误给客户端
          return; // 如果存储失败，不广播消息
        }

        // 广播消息到房间内的所有用户，包括发送者，附带发送者的 userId 和 timestamp
        const dataToSend: SyncData = {
          type: data.type,
          content: data.content,
          fromUserId: userId,
          timestamp: timestamp
        };
        io.in(room).emit('syncData', dataToSend);

        // 记录发送的消息
        const sentLogContent = data.type === 'image' ? '[Image]' : data.content;
        log('Sent', new Date(), room, userId, data.type, sentLogContent);
      });

      // 处理客户端断开连接
      socket.on('disconnect', () => {
        console.log(`Socket断开连接: ${socket.id}`);
        const users = roomUsers.get(room);
        if (users) {
          users.delete(userId);
          console.log(`用户ID ${userId} 从房间 ${room} 中移除`);

          if (users.size === 0) {
            roomUsers.delete(room);
            console.log(`房间 ${room} 中的所有用户已断开`);
          }
        }
      });
    });
  });
}

export default handleSocket;

