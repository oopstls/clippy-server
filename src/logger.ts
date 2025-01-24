import fs from 'fs';
import path from 'path';
import config from './config';

/**
 * 日志函数
 * @param direction 消息方向: 'Sent' | 'Received'
 * @param timestamp 消息时间
 * @param room 同步房间 ID
 * @param userId 用户 ID
 * @param messageType 消息类型
 * @param messageContent 消息内容（已经根据类型处理）
 */
function log(
  direction: 'Sent' | 'Received',
  timestamp: Date,
  room: string,
  userId: string,
  messageType: string,
  messageContent: string
): void {
  const isoTimestamp = timestamp.toISOString();

  // 构建日志字符串
  let logContent = `${direction} | Time: ${isoTimestamp} | Room: ${room} | UserID: ${userId} | Type: ${messageType}\nContent: ${messageContent}\n`;

  // 输出到控制台
  console.log(logContent);

  // 记录到日志文件
  const logFilePath = path.join(__dirname, '../', config.log.file);

  fs.appendFile(logFilePath, logContent, (err) => {
    if (err) {
      console.error(`无法写入日志文件: ${err}`);
    }
  });
}

export default log;

