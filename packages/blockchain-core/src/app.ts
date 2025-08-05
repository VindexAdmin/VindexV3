import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import walletRoutes from './routes/wallets';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/wallets', walletRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

export default app;
