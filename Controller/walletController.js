const Wallet = require("../DataBase/Models/Wallet");

// 🔹 Get user wallet
exports.getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.params.userId }).populate("transactions.order");
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// 🔹 Get user wallet
const getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.params.userId }).populate("transactions.order");
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Create transaction (handles both credit & debit and updates balance)

async function createTransaction(userId, orderId, amount, type) {
  const balance = amount / 2;

  if (type !== "100%") {
    throw new Error("Invalid transaction type");
  }

  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = new Wallet({ user: userId, balance: balance, transactions: [] });
  }

  // Record transaction (negative means debit from balance)
  wallet.transactions.push({
    order: orderId,
    amount: -balance,
    type,
  });



  await wallet.save();
  return true;
}

module.exports = { createTransaction ,getWallet };