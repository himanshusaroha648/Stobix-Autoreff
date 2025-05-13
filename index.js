require('dotenv').config();
const axios = require('axios');
const ethers = require('ethers');
const fs = require('fs');
const { setTimeout: setTimeoutPromise } = require('timers/promises');
const { HttpsProxyAgent } = require('https-proxy-agent');
const crypto = require('crypto');
const chalk = require('chalk');
const readline = require('readline');

// Configure chalk to use colors
chalk.level = 3; // Enable all colors

// Color palette for UI
const COLORS = {
  GREEN: '#00ff00',
  YELLOW: '#ffff00',
  RED: '#ff0000',
  WHITE: '#ffffff',
  GRAY: '#808080',
  CYAN: '#00ffff',
  MAGENTA: '#ff00ff',
  BLUE: '#0000ff',
  PURPLE: '#800080',
  ORANGE: '#ffa500',
};

// HTTP headers for Stobix API
const headers = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'origin': 'https://app.stobix.com',
  'referer': 'https://app.stobix.com/',
  'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
};

// MetaMask SDK headers
const metamaskHeaders = {
  'accept': 'application/json',
  'content-type': 'application/json',
  'origin': 'https://app.stobix.com',
  'referer': 'https://app.stobix.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
};

// Utility functions
function colorText(text, color) {
  return `{${color}-fg}${text}{/}`;
}

function showSpinner(message, completionMessage = 'Done!', duration = 60) {
  const spinnerStyles = [
    ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    ['-', '=', '≡'],
    ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
    ['★', '☆', '✦', '✧'],
  ];
  const spinner = spinnerStyles[Math.floor(Math.random() * spinnerStyles.length)];
  let i = 0;
  process.stdout.write(chalk.yellow(`${message} ${spinner[0]}`));
  const interval = setInterval(() => {
    process.stdout.write(`\r${chalk.yellow(`${message} ${spinner[i++ % spinner.length]}`)}`);
  }, duration);
  return () => {
    clearInterval(interval);
    process.stdout.write(`\r${chalk.green(completionMessage)}\n`);
  };
}

async function getInput(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(chalk.magenta(promptText), (answer) => {
      rl.close();
      // Only take the first 2 digits
      const cleanInput = answer.trim().replace(/[^0-9]/g, '');
      resolve(cleanInput);
    });
  });
}

async function getInputWithConfirm(promptText) {
  while (true) {
    const input = await getInput(promptText);
    const confirm = await getInput(`You entered "${input}". Is this correct? (y/n): `);
    if (confirm.toLowerCase() === 'y') return input;
  }
}

function loadReferralCode() {
  try {
    const code = fs.readFileSync('code.txt', 'utf8').trim();
    if (!code) {
      console.log(chalk.red('Referral code in code.txt is empty.'));
      return null;
    }
    console.log(chalk.blue(`Loaded referral code: ${code}`));
    return code;
  } catch (error) {
    console.log(chalk.red(`Failed to load code.txt: ${error.message}`));
    return null;
  }
}

function showBanner() {
  console.log(chalk.cyan(`
 ________  _________  ________  ________  ___     ___    ___ 
|\\   ____\\|\\___   ___\\\\   __  \\|\\   __  \\|\\  \\   |\\  \\  /  /|
\\ \\  \\___|\\|___ \\  \\_\\ \\  \\|\\  \\ \\  \\|\\ /\\ \\  \\  \\ \\  \\/  / /
 \\ \\_____  \\   \\ \\  \\ \\ \\  \\\\\\  \\ \\   __  \\ \\  \\  \\ \\    / / 
  \\|____|\\  \\   \\ \\  \\ \\ \\  \\\\\\  \\ \\  \\|\\  \\ \\  \\  /     \\/  
    ____\\_\\  \\   \\ \\__\\ \\ \\_______\\ \\_______\\ \\__\\/  /\\   \\  
   |\\_________\\   \\|__|  \\|_______|\\|_______|\\|__/__/ /\\ __\\ 
   \\|_________|                                  |__|/ \\|__| 
                                                            
  `));
  console.log(chalk.yellow('STOBIX'));
  console.log(chalk.green('Developed by: HIMANSHU SAROHA\n'));
}

function showMenu() {
  console.log(chalk.cyan('=== MENU OPTIONS ==='));
  console.log(chalk.yellow('1. Auto Task (Mining Only)'));
  console.log(chalk.yellow('2. Auto Referral (Create Wallets)'));
  console.log(chalk.yellow('3. Referral Mining (Mine wallets from refwallet.txt)'));
  console.log(chalk.yellow('4. Exit'));
}

function updateInfoPanel(status, details = {}) {
  console.log(chalk.cyan('\n=== SYSTEM INFO ==='));
  console.log(chalk.green(`Status: ${status}`));
  if (details.currentAccount) {
    console.log(chalk.blue(`Account: ${details.currentAccount}/${details.totalAccounts}`));
  }
  if (details.wallet) {
    console.log(chalk.blue(`Wallet: ${details.wallet.slice(0, 6)}...${details.wallet.slice(-4)}`));
  }
  console.log(chalk.blue('Network: Stobix API (Base Chain, ID: 8453)'));
  console.log(chalk.cyan('==================\n'));
}

// Load proxies
function loadProxies() {
  try {
    const proxies = fs.readFileSync('proxies.txt', 'utf8').split('\n').filter(p => p.trim());
    if (proxies.length === 0) {
      console.log(chalk.yellow('No proxies found in proxies.txt. Proceeding without proxy.'));
      return [];
    }
    console.log(chalk.blue(`Loaded ${proxies.length} proxies`));
    return proxies.map(proxy => {
      proxy = proxy.trim();
      if (!proxy.startsWith('http')) {
        proxy = `http://${proxy}`;
      }
      return proxy;
    });
  } catch (error) {
    console.log(chalk.red(`Failed to load proxies: ${error.message}`));
    return [];
  }
}

// Stobix API functions
async function getNonce(address, proxyAgent, silent = false) {
  const stopSpinner = silent ? () => {} : showSpinner('Fetching nonce...', 'Nonce fetched!');
  try {
    // First request MetaMask SDK
    const metamaskPayload = {
      id: crypto.randomUUID(),
      event: "sdk_rpc_request",
      sdkVersion: "0.32.0",
      dappId: "app.stobix.com",
      from: "extension",
      method: "eth_requestAccounts",
      platform: "web-desktop",
      source: "wagmi",
      title: "wagmi",
      url: "https://app.stobix.com"
    };

    await axios.post('https://metamask-sdk.api.cx.metamask.io/evt', 
      metamaskPayload,
      { 
        headers: metamaskHeaders, 
        httpsAgent: proxyAgent,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      }
    );

    const response = await axios.post('https://api.stobix.com/v1/auth/nonce', 
      { address },
      { 
        headers, 
        httpsAgent: proxyAgent,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      }
    );
    if (!silent) stopSpinner();
    return response.data.nonce;
  } catch (error) {
    if (!silent) stopSpinner();
    console.log(chalk.red(`Failed to fetch nonce: ${error.message}`));
    throw error;
  }
}

async function verifySignature(nonce, signature, proxyAgent, silent = false) {
  const stopSpinner = silent ? () => {} : showSpinner('Verifying signature...', 'Signature verified!');
  try {
    const response = await axios.post('https://api.stobix.com/v1/auth/web3/verify',
      { nonce, signature, chain: 8453 },
      { 
        headers, 
        httpsAgent: proxyAgent,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Accept all status codes less than 500
        }
      }
    );
    if (!silent) {
      stopSpinner();
      console.log(chalk.green('Token retrieved'));
    }
    return response.data.token;
  } catch (error) {
    if (!silent) stopSpinner();
    console.log(chalk.red(`Failed to verify signature: ${error.message}`));
    throw error;
  }
}

async function claimTask(token, taskId, proxyAgent) {
  const stopSpinner = showSpinner(`Claiming task ${taskId}...`, `Task ${taskId} claimed!`);
  try {
    const response = await axios.post('https://api.stobix.com/v1/loyalty/tasks/claim',
      { taskId },
      { headers: { ...headers, authorization: `Bearer ${token}` }, httpsAgent: proxyAgent }
    );
    stopSpinner();
    console.log(chalk.green(`Claimed task ${taskId}: ${response.data.points} points`));
    return true;
  } catch (error) {
    stopSpinner();
    if (error.response && error.response.status === 400) {
      console.log(chalk.yellow(`Task ${taskId}: already claimed`));
      return false;
    }
    console.log(chalk.red(`Failed to claim task ${taskId}: ${error.message}`));
    return false;
  }
}

async function checkMiningStatus(token, walletAddress, proxyAgent, silent = false) {
  const stopSpinner = silent ? () => {} : showSpinner('Checking mining status...', 'Mining status checked!');
  try {
    const response = await axios.get('https://api.stobix.com/v1/loyalty',
      { headers: { ...headers, authorization: `Bearer ${token}` }, httpsAgent: proxyAgent }
    );
    const miningClaimAt = response.data.user.miningClaimAt;
    if (miningClaimAt) {
      if (!silent) {
        stopSpinner();
        console.log(chalk.blue(`Mining status for ${walletAddress}: claimAt ${miningClaimAt}`));
      }
      return miningClaimAt;
    }
    throw new Error('No miningClaimAt found in response');
  } catch (error) {
    if (!silent) stopSpinner();
    console.log(chalk.yellow(`Failed to check mining status for ${walletAddress}: ${error.message}`));
    const fallbackClaimAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    if (!silent) {
      console.log(chalk.blue(`Using fallback claimAt: ${fallbackClaimAt}`));
    }
    return fallbackClaimAt;
  }
}

async function startMining(token, walletAddress, proxyAgent, silent = false) {
  const stopSpinner = silent ? () => {} : showSpinner('Starting mining...', 'Mining started!');
  try {
    const response = await axios.post('https://api.stobix.com/v1/loyalty/points/mine',
      {},
      { headers: { ...headers, authorization: `Bearer ${token}` }, httpsAgent: proxyAgent }
    );
    const { amount, claimAt } = response.data;
    if (!silent) {
      stopSpinner();
      console.log(chalk.green(`Mining started for ${walletAddress}: ${amount} points`));
    }
    return claimAt;
  } catch (error) {
    if (!silent) stopSpinner();
    if (error.response && error.response.status === 400 && error.response.data.error === 'Already mining') {
      console.log(chalk.yellow(`Wallet ${walletAddress}: already mining`));
      const claimAt = await checkMiningStatus(token, walletAddress, proxyAgent, silent);
      return claimAt;
    }
    console.log(chalk.red(`Failed to start mining for ${walletAddress}: ${error.message}`));
    throw error;
  }
}

async function visitReferral(ref, proxyAgent) {
  const stopSpinner = showSpinner(`Visiting referral link ${ref}...`, `Referral link visited!`);
  try {
    await axios.get(`https://stobix.com/invite/${ref}`, { 
      headers, 
      httpsAgent: proxyAgent,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Accept all status codes less than 500
      }
    });
    stopSpinner();
    console.log(chalk.green(`Visited referral link: ${ref}`));
  } catch (error) {
    stopSpinner();
    console.log(chalk.red(`Failed to visit referral link: ${error.message}`));
  }
}

async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(chalk.orange(`Retrying (${i + 1}/${retries}) after ${delay}ms...`));
      await setTimeoutPromise(delay);
    }
  }
}

function displayTimeLeft(claimAt, address) {
  const claimTime = new Date(claimAt).getTime();
  const now = Date.now();
  const timeLeft = claimTime - now;
  if (timeLeft <= 0) {
    console.log(chalk.magenta(`Mining ready for wallet ${address}`));
    return;
  }
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  console.log(chalk.cyan(`Time left for wallet ${address}: ${hours}h ${minutes}m ${seconds}s`));
}

// Auto Task: Mining only
async function autoTask() {
  updateInfoPanel('Auto Task');
  const privateKeys = Object.keys(process.env)
    .filter(key => key.startsWith('PRIVATE_KEY_'))
    .map(key => process.env[key].trim())
    .filter(key => key);

  if (privateKeys.length === 0) {
    console.log(chalk.red('No private keys found in .env file. Please add PRIVATE_KEY_ entries.'));
    return [];
  }

  const proxies = loadProxies();
  const wallets = [];

  console.log(chalk.blue(`Found ${privateKeys.length} private keys. Starting mining only...`));
  for (let i = 0; i < privateKeys.length; i++) {
    const privateKey = privateKeys[i];
    const proxy = proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : null;
    try {
      const signer = new ethers.Wallet(privateKey);
      const walletAddress = signer.address;
      updateInfoPanel('Processing Wallet', { currentAccount: i + 1, totalAccounts: privateKeys.length, wallet: walletAddress });
      console.log(chalk.cyan(`[${i + 1}/${privateKeys.length}] Mining for wallet: ${walletAddress}`));
      let proxyAgent = null;
      if (proxy) {
        try {
          proxyAgent = new HttpsProxyAgent(proxy);
          console.log(chalk.gray(`Using proxy: ${proxy}`));
        } catch (error) {
          console.log(chalk.yellow(`Invalid proxy ${proxy}. Proceeding without proxy.`));
        }
      }
      const nonce = await retry(() => getNonce(walletAddress, proxyAgent));
      const message = `Sign this message to authenticate: ${nonce}`;
      const signature = await signer.signMessage(message);
      const token = await retry(() => verifySignature(nonce, signature, proxyAgent));
      const claimAt = await retry(() => startMining(token, walletAddress, proxyAgent));
      displayTimeLeft(claimAt, walletAddress);
      wallets.push({ privateKey, proxy, address: walletAddress, claimAt });
    } catch (error) {
      console.log(chalk.red(`Error mining for wallet at index ${i + 1}: ${error.message}`));
    }
    if (i < privateKeys.length - 1) {
      console.log(chalk.gray('Waiting 5 seconds before next wallet...'));
      const stopSpinner = showSpinner('Waiting...', 'Proceeding to next wallet!');
      await setTimeoutPromise(5000);
      stopSpinner();
    }
  }
  console.log(chalk.green(`Processed ${wallets.length} wallets for mining.`));
  return wallets;
}

// Auto Referral: Create wallets and process tasks, save to refwallet.txt
async function autoReferral() {
  updateInfoPanel('Auto Referral');
  const referralCode = loadReferralCode();
  if (!referralCode || !referralCode.trim()) {
    console.log(chalk.red('Referral code in code.txt is empty or missing.'));
    return [];
  }

  const accountCountInput = await getInput('Enter number of accounts to create: ');
  const accountCount = parseInt(accountCountInput);
  
  if (isNaN(accountCount) || accountCount <= 0) {
    console.log(chalk.red('Invalid number of accounts. Please enter a positive number.'));
    return [];
  }

  console.log(chalk.blue(`Creating ${accountCount} accounts...`));
  const proxies = loadProxies();
  const wallets = [];
  let refWalletIndex = 1;
  if (fs.existsSync('refwallet.txt')) {
    // Find the last index used
    const lines = fs.readFileSync('refwallet.txt', 'utf8').split('\n').filter(Boolean);
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/PRIVATE_KEY_(\d+)=/);
      if (match) refWalletIndex = parseInt(match[1]) + 1;
    }
  }

  for (let i = 0; i < accountCount; i++) {
    updateInfoPanel('Processing Referral', { currentAccount: i + 1, totalAccounts: accountCount });
    console.log(chalk.cyan(`[${i + 1}/${accountCount}] Creating new wallet...`));
    const stopSpinner = showSpinner('Generating wallet...', 'Wallet generated!');
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;
    stopSpinner();
    console.log(chalk.white(`Wallet created: ${address.slice(0, 6)}...${address.slice(-4)}`));
    // Save to refwallet.txt
    fs.appendFileSync('refwallet.txt', `PRIVATE_KEY_${refWalletIndex++}=${privateKey}\n`);
    try {
      const proxy = proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : null;
      let proxyAgent = null;
      if (proxy) {
        try {
          proxyAgent = new HttpsProxyAgent(proxy);
          console.log(chalk.gray(`Using proxy: ${proxy}`));
        } catch (error) {
          console.log(chalk.yellow(`Invalid proxy ${proxy}. Proceeding without proxy.`));
        }
      }
      await visitReferral(referralCode, proxyAgent);
      const nonce = await retry(() => getNonce(address, proxyAgent));
      const message = `Sign this message to authenticate: ${nonce}`;
      const signature = await wallet.signMessage(message);
      const token = await retry(() => verifySignature(nonce, signature, proxyAgent));
      const tasks = [
        'follow_x',
        'join_discord',
        'join_telegram_channel',
        'join_telegram_chat'
      ];
      let tasksCompleted = 0;
      for (const task of tasks) {
        const success = await claimTask(token, task, proxyAgent);
        if (success) tasksCompleted++;
        await setTimeoutPromise(2000);
      }
      console.log(chalk.magenta(`Completed ${tasksCompleted}/${tasks.length} tasks for ${address}`));
      const claimAt = await retry(() => startMining(token, address, proxyAgent));
      wallets.push({ privateKey, proxy, address, claimAt });
    } catch (error) {
      console.log(chalk.red(`Failed to process wallet: ${error.message}`));
    }
    if (i < accountCount - 1) {
      const delay = Math.floor(Math.random() * 5000) + 5000;
      console.log(chalk.gray(`Waiting ${(delay / 1000).toFixed(1)} seconds before next account...`));
      const stopDelaySpinner = showSpinner('Waiting...', 'Proceeding to next account!');
      await setTimeoutPromise(delay);
      stopDelaySpinner();
    }
  }
  updateInfoPanel('Referral Completed', { currentAccount: accountCount, totalAccounts: accountCount });
  console.log(chalk.green(`All accounts processed! ${wallets.length} wallets created and saved to refwallet.txt.`));
  return wallets;
}

// Referral Mining: Mine wallets from refwallet.txt
async function referralMining() {
  updateInfoPanel('Referral Mining');
  if (!fs.existsSync('refwallet.txt')) {
    console.log(chalk.red('refwallet.txt not found. Please run Auto Referral first.'));
    return [];
  }
  const lines = fs.readFileSync('refwallet.txt', 'utf8').split('\n').filter(Boolean);
  const privateKeys = lines.map(line => line.split('=')[1].trim()).filter(Boolean);
  if (privateKeys.length === 0) {
    console.log(chalk.red('No private keys found in refwallet.txt.'));
    return [];
  }
  const proxies = loadProxies();
  const wallets = [];
  console.log(chalk.blue(`Found ${privateKeys.length} referral wallets. Starting mining...`));
  for (let i = 0; i < privateKeys.length; i++) {
    const privateKey = privateKeys[i];
    const proxy = proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : null;
    try {
      const signer = new ethers.Wallet(privateKey);
      const walletAddress = signer.address;
      updateInfoPanel('Referral Mining', { currentAccount: i + 1, totalAccounts: privateKeys.length, wallet: walletAddress });
      console.log(chalk.cyan(`[${i + 1}/${privateKeys.length}] Mining for referral wallet: ${walletAddress}`));
      let proxyAgent = null;
      if (proxy) {
        try {
          proxyAgent = new HttpsProxyAgent(proxy);
          console.log(chalk.gray(`Using proxy: ${proxy}`));
        } catch (error) {
          console.log(chalk.yellow(`Invalid proxy ${proxy}. Proceeding without proxy.`));
        }
      }
      const nonce = await retry(() => getNonce(walletAddress, proxyAgent));
      const message = `Sign this message to authenticate: ${nonce}`;
      const signature = await signer.signMessage(message);
      const token = await retry(() => verifySignature(nonce, signature, proxyAgent));
      const claimAt = await retry(() => startMining(token, walletAddress, proxyAgent));
      displayTimeLeft(claimAt, walletAddress);
      wallets.push({ privateKey, proxy, address: walletAddress, claimAt });
    } catch (error) {
      console.log(chalk.red(`Error mining for referral wallet at index ${i + 1}: ${error.message}`));
    }
    if (i < privateKeys.length - 1) {
      console.log(chalk.gray('Waiting 5 seconds before next wallet...'));
      const stopSpinner = showSpinner('Waiting...', 'Proceeding to next wallet!');
      await setTimeoutPromise(5000);
      stopSpinner();
    }
  }
  console.log(chalk.green(`Processed ${wallets.length} referral wallets for mining.`));
  return wallets;
}

function mainMenu() {
  showBanner();
  showMenu();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(chalk.cyan('\n? Select an option: '), async (option) => {
    if (option === '1') {
      console.log(chalk.green('\n[Auto Task (Mining Only) selected]\n'));
      await autoTask();
      rl.close();
      setTimeout(mainMenu, 1000);
    } else if (option === '2') {
      console.log(chalk.green('\n[Auto Referral selected]\n'));
      await autoReferral();
      rl.close();
      setTimeout(mainMenu, 1000);
    } else if (option === '3') {
      console.log(chalk.green('\n[Referral Mining selected]\n'));
      await referralMining();
      rl.close();
      setTimeout(mainMenu, 1000);
    } else if (option === '4') {
      console.log(chalk.yellow('\nExiting...'));
      rl.close();
      process.exit(0);
    } else {
      console.log(chalk.red('\nInvalid option!'));
      rl.close();
      setTimeout(mainMenu, 1000);
    }
  });
}

mainMenu();
