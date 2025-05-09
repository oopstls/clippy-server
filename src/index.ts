import { generalLog } from './logger';
import { createServer } from 'http';
import { Server } from 'socket.io';
import config from './config';
import handleSocket from './socket';
import './db';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes';

generalLog(new Date(), `
  ####   ####      ####    ######   ######   ##  ##
 ##  ##   ##        ##      ##  ##   ##  ##  ##  ##
##        ##        ##      ##  ##   ##  ##  ##  ##
##        ##        ##      #####    #####    ####
##        ##   #    ##      ##       ##        ##
 ##  ##   ##  ##    ##      ##       ##        ##
  ####   #######   ####    ####     ####      ####
  `);

// 创建 Express 应用
const app = express();
app.use(cors());

// 使用API路由
app.use('/', apiRoutes);

// 创建 HTTP 服务器
const httpServer = createServer(app);

// 初始化 Socket.io 服务器
const io = new Server(httpServer, {
  cors: {
    origin: "*", // 允许所有来源（根据需求调整）
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8, // 设置最大 HTTP 缓冲区大小为 100max
  transports: ['websocket'], // 仅使用 WebSocket 传输
  pingTimeout: 60000, // 60s 无响应则断开连接
  pingInterval: 25000, // 25s 发送一次心跳包
});

// 处理 Socket 连接
handleSocket(io);

// 启动服务器监听
httpServer.listen(config.port, () => {
  generalLog(new Date(), `服务器正在端口 ${config.port} 上运行`);
}); 