# 🤖 Stobix Auto Bot V1

An automated bot for Stobix platform that handles referrals, tasks, and mining operations.

## ✨ Features

- 🔄 **Auto Referral**: Automatically creates new wallets and completes referral process
- ✅ **Auto Tasks**: Completes all available tasks automatically
- ⛏️ **Auto Mining**: Starts mining for all wallets
- 💼 **Multi-Wallet Support**: Supports multiple wallets from both `.env` and `wallets.txt`
- 🔐 **Secure**: Private keys stored securely in `.env` file
- 🌐 **Proxy Support**: Optional proxy support for better reliability

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/himanshusaroha648/Stobix-Auto-BotV1.git
cd Stobix-Auto-BotV1
```

2. Install dependencies:
```bash
npm install
```

3. Set up your configuration files:

   - Create `code.txt` with your referral code:
     ```
     your_referral_code
     ```

   - Create `.env` file with your private keys:
     ```
     PRIVATE_KEY_1=your_private_key_1
     PRIVATE_KEY_2=your_private_key_2
     ```

   - (Optional) Create `proxies.txt` for proxy support:
     ```
     proxy1:port
     proxy2:port
     ```

## 🚀 Usage

Run the bot:
```bash
node index.js
```

### Menu Options:
1. Auto Task (Referral, Tasks & Mining Check)
2. Auto Referral (Create Wallets)
3. Start Mining (From wallets.txt and .env)
4. Exit

## 📁 File Structure

- `index.js` - Main bot code
- `code.txt` - Referral code
- `.env` - Private keys configuration
- `proxies.txt` - (Optional) Proxy list
- `wallets.txt` - Generated wallets storage
- `account.txt` - Detailed account information storage

## ⚠️ Important Notes

1. Never share your private keys
2. Always use `.env` file for storing sensitive data
3. Keep your referral code in `code.txt`
4. Use proxies for better reliability

## 🔒 Security

- Private keys are stored in `.env` file (not tracked by git)
- Sensitive data is never logged or exposed
- Proxy support for additional security

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
