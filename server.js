/**
 * Backend Server
 * Servidor Express para API do app Locais Noturnos
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './lib/api/userRoutes.js';
import logger from './lib/utils/logger.js';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requisições
app.use((req, res, next) => {
  logger.info({ 
    method: req.method, 
    path: req.path,
    ip: req.ip 
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rotas
app.use('/api/users', userRoutes);

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado'
  });
});

// Error handler global
app.use((err, req, res, next) => {
  logger.error({ 
    error: err.message, 
    stack: err.stack,
    path: req.path 
  });
  
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor'
  });
});

// Inicia servidor
app.listen(PORT, () => {
  logger.info({ message: `Server running on port ${PORT}` });
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});

export default app;
