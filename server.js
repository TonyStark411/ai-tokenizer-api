// server.js - AITK Marketplace Backend
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('âœ… MongoDB Connected:', conn.connection.host);
  } catch (error) {
    console.error('âŒ MongoDB Error:', error.message);
    setTimeout(connectDB, 5000);
  }
};

// Models
const userSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const serviceSchema = new mongoose.Schema({
  serviceId: String,
  name: String,
  provider: String,
  price: Number,
  priceInAITK: Number,
  active: { type: Boolean, default: true }
});

const transactionSchema = new mongoose.Schema({
  txId: String,
  walletAddress: String,
  serviceId: String,
  amount: Number,
  status: { type: String, default: 'pending' },
  txHash: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Service = mongoose.model('Service', serviceSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AITK Marketplace Backend',
    blockchain: {
      network: 'Polygon Mainnet',
      aitkToken: process.env.AITK_TOKEN_ADDRESS,
      router: process.env.ROUTER_ADDRESS,
      rpc: process.env.POLYGON_RPC_URL
    },
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Get all services
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find({ active: true });
    res.json({ success: true, total: services.length, services });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Connect wallet
app.post('/api/auth/connect', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'walletAddress required' });
    }

    let user = await User.findOne({ walletAddress });
    if (!user) {
      user = new User({ walletAddress });
      await user.save();
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user balance
app.get('/api/balance/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await User.findOne({ walletAddress });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ 
      success: true, 
      walletAddress,
      balance: user.balance 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create transaction
app.post('/api/transactions/create', async (req, res) => {
  try {
    const { walletAddress, serviceId, amount } = req.body;
    
    if (!walletAddress || !serviceId || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'walletAddress, serviceId, and amount required' 
      });
    }

    const service = await Service.findOne({ serviceId });
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const transaction = new Transaction({
      txId: 'tx_' + Date.now(),
      walletAddress,
      serviceId,
      amount: service.priceInAITK,
      status: 'pending'
    });

    await transaction.save();

    res.json({
      success: true,
      transaction: {
        txId: transaction.txId,
        amount: transaction.amount,
        service: service.name,
        aitkToken: process.env.AITK_TOKEN_ADDRESS,
        router: process.env.ROUTER_ADDRESS,
        rpcUrl: process.env.POLYGON_RPC_URL
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Confirm transaction
app.post('/api/transactions/confirm', async (req, res) => {
  try {
    const { txId, txHash } = req.body;
    
    if (!txId || !txHash) {
      return res.status(400).json({ success: false, error: 'txId and txHash required' });
    }

    const transaction = await Transaction.findOne({ txId });
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    transaction.status = 'confirmed';
    transaction.txHash = txHash;
    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction confirmed',
      transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user transactions
app.get('/api/transactions/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const transactions = await Transaction.find({ walletAddress }).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      total: transactions.length,
      transactions 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log('\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
    console.log('â•‘   ðŸš€ AITK Marketplace Backend           â•‘');
    console.log('â•‘   ðŸ“¡ Port:', PORT.toString().padEnd(30), 'â•‘');
    console.log('â•‘   ðŸ”— /api/health                        â•‘');
    console.log('â•‘   ðŸ›ï¸  /api/services                     â•‘');
    console.log('â•‘   ðŸ’° /api/transactions                  â•‘');
    console.log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
  });
};

startServer();

module.exports = app;