# 🤖 Stobix Auto Bot

An automated bot for the Stobix platform that handles referrals, tasks, and mining operations.

## ✨ Features

- 🔄 **Auto Referral**: Automatically creates new wallets and completes the referral process.
- ✅ **Auto Tasks**: (Mining Only) Starts mining for all wallets in your `.env` file.
- ⛏️ **Referral Mining**: Starts mining for all wallets created via referral (from `refwallet.txt`).
- 💼 **Multi-Wallet Support**: Supports multiple wallets from both `.env` and `refwallet.txt`.
- 🌐 **Proxy Support**: Optional proxy support for better reliability.

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/himanshusaroha648/Stobix-Autoreff.git
   cd Stobix-Autoreff
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up your configuration files:**
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
npm start
```

### Menu Options

1. **Auto Task (Mining Only):**  
   Starts mining for all wallets in your `.env` file.

2. **Auto Referral (Create Wallets):**  
   Creates new wallets, completes referral tasks, and saves them to `refwallet.txt`.

3. **Referral Mining:**  
   Starts mining for all wallets saved in `refwallet.txt`.

4. **Exit:**  
   Exits the bot.

## 📁 File Structure

- `index.js` – Main bot code
- `code.txt` – Referral code
- `.env` – Private keys configuration
- `proxies.txt` – (Optional) Proxy list
- `refwallet.txt` – Generated referral wallets storage

## ⚠️ Important Notes

- **Never share your private keys.**
- Always use the `.env` file for storing sensitive data.
- Keep your referral code in `code.txt`.
- Use proxies for better reliability.

## 🔒 Security

- Private keys are stored in `.env` (not tracked by git).
- Sensitive data is never logged or exposed.
- Proxy support for additional security.

## 📝 License

This project is licensed under the MIT License.

---

**GitHub:** [himanshusaroha648/Stobix-Autoreff](https://github.com/himanshusaroha648/Stobix-Autoreff)
