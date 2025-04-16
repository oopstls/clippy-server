export type Message = {
  id?: number;            // 消息ID，数据库生成
  type: 'text' | 'image'; // 数据类型：文本或图片
  content: string;        // 文本内容或Base64编码的图片
  userId: string;         // 用户ID
  timestamp: string;      // 时间戳
  clipReg?: number;       // clipReg值，范围0-4，仅text类型可能有值
};

export type RegisterData = {
  room: string;    // 同步房间 ID
  userId: string;  // 用户 ID
};

export type RequestHistoryData = {
  room: string;    // 房间 ID
  fromId: number;  // 请求ID大于等于此值的消息
};

