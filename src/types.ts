export type SyncData = {
  type: 'text' | 'image'; // 数据类型：文本或图片
  content: string;        // 文本内容或Base64编码的图片
  fromUserId?: string;    // 发送者的用户 ID（可选）
  timestamp: string;      // 服务器记录的时间戳
};

export type RegisterData = {
  room: string;    // 同步房间 ID
  userId: string;  // 用户 ID
};

// 历史消息类型保持不变
export type HistoryMessage = {
  id: number;
  room: string;
  userId: string;
  type: 'text' | 'image';
  content: string;
  timestamp: string;
};

