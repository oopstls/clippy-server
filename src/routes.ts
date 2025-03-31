import express, { Request, Response } from 'express';
import { getMessage } from './db';
import { generalLog } from './logger';

const router = express.Router();

router.get('/:roomId/:id', function(req: any, res: any) {
  generalLog(new Date(), `获取消息请求: ${req.params.roomId}/${req.params.id}`);
  try {
    const roomId = req.params.roomId;
    const messageId = parseInt(req.params.id);
    
    if (isNaN(messageId)) {
      generalLog(new Date(), `无效的消息ID: ${req.params.id}`);
      return res.status(400).json({ error: '无效的消息ID' });
    }
    
    const message = getMessage(roomId, messageId);
    
    if (!message) {
      generalLog(new Date(), `消息未找到: ${req.params.roomId}/${req.params.id}`);
      return res.status(404).json({ error: '消息未找到' });
    }
    
    generalLog(new Date(), `获取消息成功: ${req.params.roomId}/${req.params.id}`);
    return res.send(message.content);
  } catch (error) {
    generalLog(new Date(), `获取消息失败: ${error}`);
    return res.status(500).json({ error: '服务器错误' });
  }
});

export default router; 