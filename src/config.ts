const config = {
  port: 7000, // 服务器监听端口
  log: {
    level: 'info',             // 日志级别（可根据需求扩展）
    file: 'logs/server.log'    // 日志文件路径
  },
  database: {
    path: 'data/messages.db'   // 数据库文件路径
  }
};

export default config;

