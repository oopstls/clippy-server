const config = {
  port: 7000,           // 服务器监听端口
  log: {
    path: 'logs',       // 日志文件路径
    file: 'server.log'  // 日志文件名
  },
  database: {
    path: 'data'        // 消息记录存储路径
  }
};

export default config;
