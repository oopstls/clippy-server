const config = {
  port: 8989, // 服务器监听端口
  log: {
    level: 'info',             // 日志级别（可根据需求扩展）
    path: 'logs',    // 日志文件路径
    file: 'server.log'    // 日志文件名
  },
  database: {
    path: 'data'   // 消息记录存储路径
  }
};

export default config;
