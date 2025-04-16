import { Server, Socket } from 'socket.io';
import { messageLog, generalLog } from './logger';
import { Message, RegisterData, RequestHistoryData } from './types';
import { insertMessage, getMessagesFromId, closeRoomDB } from './db';

// 房间用户管理：Map<room, Map<userId, Socket>>
const roomUsers: Map<string, Map<string, Socket>> = new Map();

/**
 * 处理Socket连接
 * @param io Socket.io 服务器实例
 */
function handleSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    generalLog(new Date(), `新客户端连接: ${socket.id}`);

    socket.on('register', async (registerData: RegisterData) => {
      const { room, userId } = registerData;

      if (!room || !userId) {
        generalLog(new Date(), `Socket ${socket.id} 注册失败：房间号或用户ID为空`);
        socket.emit('registrationError', { message: 'Room ID and User ID cannot be empty.' });
        socket.disconnect();
        return;
      }

      generalLog(new Date(), `Socket ${socket.id} 尝试注册房间: ${room}, 用户ID: ${userId}`);

      if (!roomUsers.has(room)) {
        roomUsers.set(room, new Map());
        generalLog(new Date(), `已创建新的房间: ${room}`);
      }

      const usersInRoom = roomUsers.get(room)!;

      usersInRoom.set(userId, socket);
      socket.join(room);
      generalLog(new Date(), `Socket ${socket.id} 成功注册房间: ${room}, 用户ID: ${userId}`);

      socket.on('sendMessage', (data: Message) => {
        messageLog(new Date(), room, userId, data.type);

        let clipReg = data.clipReg;
        if (data.type === 'image') {
          clipReg = undefined;
        } else if (clipReg !== undefined && (clipReg < 0 || clipReg > 5 || !Number.isInteger(clipReg))) {
          generalLog(new Date(), `无效的clipReg值 | 房间: ${room} | 用户ID: ${userId} | clipReg: ${clipReg}`);
          socket.emit('messageError', { message: 'Invalid clipReg value. It must be an integer between 0 and 5.' });
          return;
        }

        let result: {id: number, timestamp: string};
        try {
          result = insertMessage(room, userId, data.type, data.content, clipReg);
        } catch (error) {
          generalLog(new Date(), `存储消息失败 | 房间: ${room} | 用户ID: ${userId} | 类型: ${data.type} | 错误: ${error}`);
          socket.emit('messageError', { message: 'Failed to store message.' });
          return;
        }

        const dataToBroadcast: Message = {
          id: result.id,
          type: data.type,
          content: data.content,
          userId: userId,
          timestamp: result.timestamp,
          clipReg: clipReg
        };
        io.in(room).emit('broadcast', dataToBroadcast);
      });

      socket.on('disconnect', () => {
        generalLog(new Date(), `Socket断开连接: ${userId}`);
        const users = roomUsers.get(room);
        if (users) {
          users.delete(userId);
          generalLog(new Date(), `用户ID ${userId} 从房间 ${room} 中移除`);

          if (users.size === 0) {
            roomUsers.delete(room);
            closeRoomDB(room);
            generalLog(new Date(), `房间 ${room} 中的所有用户已断开，数据库连接已关闭`);
          }
        }
      });
      
      socket.on('requestHistory', (data: RequestHistoryData) => {
        const { room: requestRoom, fromId } = data;
        
        if (requestRoom !== room) {
          generalLog(new Date(), `请求历史消息失败: 请求的房间 ${requestRoom} 与注册的房间 ${room} 不一致`);
          socket.emit('historyError', { message: 'Room mismatch' });
          return;
        }
        
        try {
          const historyMessages = getMessagesFromId(room, fromId);
          socket.emit('historyResponse', historyMessages);
          generalLog(new Date(), `发送历史消息给 Socket ${userId}，房间: ${room}，起始ID: ${fromId}，消息数量: ${historyMessages.length}`);
        } catch (error) {
          generalLog(new Date(), `获取历史消息失败 | 房间: ${room} | 起始ID: ${fromId} | 错误: ${error}`);
          socket.emit('historyError', { message: 'Failed to retrieve history messages.' });
        }
      });
    });
  });
}

export default handleSocket;

