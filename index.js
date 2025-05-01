require('dotenv').config();
const axios = require('axios');
const ethers = require('ethers');
const blessed = require('neo-blessed');
const fs = require('fs');
const { setTimeout: setTimeoutPromise } = require('timers/promises');
const { HttpsProxyAgent } = require('https-proxy-agent');

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

// Create Blessed screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Stobix Auto Bot',
  cursor: { color: COLORS.GREEN },
});

// Main container
const container = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  style: { bg: 'black', fg: COLORS.GREEN },
});

// Status bar
const statusBar = blessed.box({
  parent: container,
  top: 0,
  left: 0,
  width: '100%',
  height: 1,
  content: ' [Stobix Auto Bot v2.3] - SYSTEM ONLINE ',
  style: { bg: COLORS.GREEN, fg: 'black', bold: true },
});

// Log window
const logWindow = blessed.log({
  parent: container,
  top: 1,
  left: 0,
  width: '70%',
  height: '90%',
  border: { type: 'line', fg: COLORS.GREEN },
  style: { fg: COLORS.GREEN, bg: 'black', scrollbar: { bg: COLORS.GREEN } },
  scrollable: true,
  scrollbar: true,
  tags: true,
  padding: { left: 1, right: 1 },
});

// Info panel
const infoPanel = blessed.box({
  parent: container,
  top: 1,
  right: 0,
  width: '30%',
  height: '90%',
  border: { type: 'line', fg: COLORS.GREEN },
  style: { fg: COLORS.GREEN, bg: 'black' },
  content: '{center}SYSTEM INFO{/center}\n\nInitializing...',
  tags: true,
});

// Input box
const inputBox = blessed.textbox({
  parent: container,
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  border: { type: 'line', fg: COLORS.GREEN },
  style: { fg: COLORS.GREEN, bg: 'black' },
  hidden: true,
  inputOnFocus: true,
});

// Key bindings
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

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
  logWindow.log(`${colorText(`${message} ${spinner[0]}`, COLORS.YELLOW)}`);
  const logIndex = logWindow.getLines().length - 1;
  const interval = setInterval(() => {
    logWindow.setLine(logIndex, `${colorText(`${message} ${spinner[i++ % spinner.length]}`, COLORS.YELLOW)}`);
    screen.render();
  }, duration);
  return () => {
    clearInterval(interval);
    logWindow.setLine(logIndex, `${colorText(completionMessage, COLORS.GREEN)}`);
    screen.render();
  };
}

function getInput(promptText) {
  return new Promise((resolve) => {
    logWindow.log(`${colorText(promptText, COLORS.MAGENTA)}`);
    inputBox.setValue('');
    inputBox.show();
    screen.render();
    inputBox.once('submit', (value) => {
      inputBox.hide();
      screen.render();
      resolve(value);
    });
    inputBox.focus();
    inputBox.readInput();
  });
}

function loadReferralCode() {
  try {
    const code = fs.readFileSync('code.txt', 'utf8').trim();
    if (!code) {
      logWindow.log(`${colorText('Referral code in code.txt is empty.', COLORS.RED)}`);
      return null;
    }
    logWindow.log(`${colorText(`Loaded referral code: ${code}`, COLORS.BLUE)}`);
    return code;
  } catch (error) {
    logWindow.log(`${colorText(`Failed to load code.txt: ${error.message}`, COLORS.RED)}`);
    return null;
  }
}

function loadProxies() {
  try {
    const proxies = fs.readFileSync('proxies.txt', 'utf8').split('\n').filter(p => p.trim());
    if (proxies.length === 0) {
      logWindow.log(`${colorText('No proxies found in proxies.txt. Proceeding without proxy.', COLORS.YELLOW)}`);
      return [];
    }
    logWindow.log(`${colorText(`Loaded ${proxies.length} proxies`, COLORS.BLUE)}`);
    return proxies.map(proxy => {
      proxy = proxy.trim();
      if (!proxy.startsWith('http')) {
        proxy = `http://${proxy}`;
      }
      return proxy;
    });
  } catch (error) {
    logWindow.log(`${colorText(`Failed to load proxies: ${error.message}`, COLORS.RED)}`);
    return [];
  }
}

function showBanner() {
  const banner = [
    '>>> SYSTEM BOOT INITIATED',
    '[ Stobix Auto Bot ] - BY KAZUHA',
    '----------------------------------',
    'CREATED BY KAZUHA787',
    'Enhanced with Referral Code from code.txt',
  ];
  banner.forEach((line, index) => {
    global.setTimeout(() => {
      logWindow.log(`${colorText(line, [COLORS.CYAN, COLORS.PURPLE, COLORS.GREEN, COLORS.ORANGE, COLORS.BLUE][index])}`);
      screen.render();
    }, index * 150);
  });
}

function updateInfoPanel(status, details = {}) {
  const content = `{center}{bold}SYSTEM INFO{/bold}{/center}\n\n` +
    `Status: ${colorText(status, COLORS.GREEN)}\n` +
    (details.currentAccount ? `Account: ${details.currentAccount}/${details.totalAccounts}\n` : '') +
    (details.wallet ? `Wallet: ${details.wallet.slice(0, 6)}...${details.wallet.slice(-4)}\n` : '') +
    `Network: Stobix API (Base Chain, ID: 8453)`;
  infoPanel.setContent(content);
  screen.render();
}

// API functions
async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      logWindow.log(`${colorText(`Retrying (${i + 1}/${retries}) after ${delay}ms...`, COLORS.ORANGE)}`);
      await setTimeoutPromise(delay);
    }
  }
}

async function getNonce(address, proxyAgent, silent = false) {
  const stopSpinner = silent ? () => {} : showSpinner('Fetching nonce...', 'Nonce fetched!');
  try {
    const response = await axios.post('https://api.stobix.com/v1/auth/nonce', 
      { address },
      { headers: { 'Content-Type': 'application/json' }, httpsAgent: proxyAgent }
    );
    if (!silent) stopSpinner();
    return response.data.nonce;
  } catch (error) {
    if (!silent) stopSpinner();
    logWindow.log(`${colorText(`Failed to fetch nonce: ${error.message}`, COLORS.RED)}`);
    throw error;
  }
}

async function verifySignature(nonce, signature, proxyAgent, silent = false) {
  const stopSpinner = silent ? () => {} : showSpinner('Verifying signature...', 'Signature verified!');
  try {
    const response = await axios.post('https://api.stobix.com/v1/auth/web3/verify',
      { nonce, signature, chain: 8453 },
      { headers: { 'Content-Type': 'application/json' }, httpsAgent: proxyAgent }
    );
    if (!silent) {
      stopSpinner();
      logWindow.log(`${colorText('Token retrieved', COLORS.GREEN)}`);
    }
    return response.data.token;
  } catch (error) {
    if (!silent) stopSpinner();
    logWindow.log(`${colorText(`Failed to verify signature: ${error.message}`, COLORS.RED)}`);
    throw error;
  }
}

async function claimTask(token, taskId, proxyAgent) {
  const stopSpinner = showSpinner(`Claiming task ${taskId}...`, `Task ${taskId} claimed!`);
  try {
    const response = await axios.post('https://api.stobix.com/v1/loyalty/tasks/claim',
      { taskId },
      { headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` }, httpsAgent: proxyAgent }
    );
    stopSpinner();
    logWindow.log(`${colorText(`Claimed task ${taskId}: ${response.data.points} points`, COLORS.GREEN)}`);
    return true;
  } catch (error) {
    stopSpinner();
    if (error.response && error.response.status === 400) {
      logWindow.log(`${colorText(`Task ${taskId}: already claimed`, COLORS.YELLOW)}`);
      return false;
    }
    logWindow.log(`${colorText(`Failed to claim task ${taskId}: ${error.message}`, COLORS.RED)}`);
    return false;
  }
}

async function startMining(token, walletAddress, proxyAgent, silent = false) {
  const stopSpinner = silent ? () => {} : showSpinner('Starting mining...', 'Mining started!');
  try {
    const response = await axios.post('https://api.stobix.com/v1/loyalty/points/mine',
      {},
      { headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` }, httpsAgent: proxyAgent }
    );
    const { amount, claimAt } = response.data;
    if (!silent) {
      stopSpinner();
      logWindow.log(`${colorText(`Mining started for ${walletAddress}: ${amount} points`, COLORS.GREEN)}`);
    }
    return claimAt;
  } catch (error) {
    if (!silent) stopSpinner();
    logWindow.log(`${colorText(`Failed to start mining for ${walletAddress}: ${error.message}`, COLORS.RED)}`);
    throw error;
  }
}

async function visitReferral(ref, proxyAgent) {
  const stopSpinner = showSpinner(`Visiting referral link ${ref}...`, `Referral link visited!`);
  try {
    await axios.get(`https://stobix.com/invite/${ref}`, { httpsAgent: proxyAgent });
    stopSpinner();
    logWindow.log(`${colorText(`Visited referral link: ${ref}`, COLORS.GREEN)}`);
  } catch (error) {
    stopSpinner();
    logWindow.log(`${colorText(`Failed to visit referral link: ${error.message}`, COLORS.RED)}`);
  }
}

// Auto Referral function
async function autoReferral() {
  updateInfoPanel('Auto Referral');
  const referralCode = loadReferralCode(); // Load referral code from code.txt
  if (!referralCode || !referralCode.trim()) {
    logWindow.log(`${colorText('Referral code in code.txt is empty or missing.', COLORS.RED)}`);
    return [];
  }

  const accountCountInput = await getInput('Enter number of accounts to create: ');
  const accountCount = parseInt(accountCountInput);
  if (isNaN(accountCount) || accountCount <= 0) {
    logWindow.log(`${colorText('Invalid number of accounts.', COLORS.RED)}`);
    return [];
  }

  const proxies = loadProxies();
  const wallets = [];

  // Create account.txt if it doesn't exist
  if (!fs.existsSync('account.txt')) {
    fs.writeFileSync('account.txt', '# Stobix Auto Bot Accounts\n# Format: Address,PrivateKey,ReferralUsed\n\n');
    logWindow.log(`${colorText('Created account.txt file', COLORS.GREEN)}`);
  }

  for (let i = 1; i <= accountCount; i++) {
    updateInfoPanel('Processing Referral', { currentAccount: i, totalAccounts: accountCount });
    logWindow.log(`${colorText(`[${i}/${accountCount}] Creating new wallet...`, COLORS.CYAN)}`);

    const stopSpinner = showSpinner('Generating wallet...', 'Wallet generated!');
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;
    stopSpinner();
    logWindow.log(`${colorText(`Wallet created: ${address.slice(0, 6)}...${address.slice(-4)}`, COLORS.WHITE)}`);

    try {
      const proxy = proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : null;
      let proxyAgent = null;
      if (proxy) {
        try {
          proxyAgent = new HttpsProxyAgent(proxy);
          logWindow.log(`${colorText(`Using proxy: ${proxy}`, COLORS.GRAY)}`);
        } catch (error) {
          logWindow.log(`${colorText(`Invalid proxy ${proxy}. Proceeding without proxy.`, COLORS.YELLOW)}`);
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
        'join_telegram_chat',
        'start_telegram_bot',
        'leave_trustpilot_review',
      ];
      let tasksCompleted = 0;

      for (const task of tasks) {
        const success = await claimTask(token, task, proxyAgent);
        if (success) tasksCompleted++;
        await setTimeoutPromise(2000);
      }
      logWindow.log(`${colorText(`Completed ${tasksCompleted}/${tasks.length} tasks for ${address}`, COLORS.PURPLE)}`);

      const claimAt = await retry(() => startMining(token, address, proxyAgent));
      wallets.push({ privateKey, proxy, address, claimAt });

      // Save account details to account.txt
      const accountDetails = `${address},${privateKey},${referralCode}\n`;
      fs.appendFileSync('account.txt', accountDetails);
      logWindow.log(`${colorText(`Saved account details to account.txt`, COLORS.GREEN)}`);

      // Also save to wallets.txt for compatibility
      fs.appendFileSync('wallets.txt', `PRIVATE_KEY_${i}=${privateKey}\n`);
      logWindow.log(`${colorText(`Saved private key to wallets.txt`, COLORS.GREEN)}`);
    } catch (error) {
      logWindow.log(`${colorText(`Failed to process wallet: ${error.message}`, COLORS.RED)}`);
    }

    if (i < accountCount) {
      const delay = Math.floor(Math.random() * 5000) + 5000;
      logWindow.log(`${colorText(`Waiting ${(delay / 1000).toFixed(1)} seconds before next account...`, COLORS.GRAY)}`);
      const stopDelaySpinner = showSpinner('Waiting...', 'Proceeding to next account!');
      await setTimeoutPromise(delay);
      stopDelaySpinner();
    }
  }

  updateInfoPanel('Referral Completed', { currentAccount: accountCount, totalAccounts: accountCount });
  logWindow.log(`${colorText(`All accounts processed! ${wallets.length} wallets created.`, COLORS.GREEN)}`);
  return wallets;
}

// Auto Mining function
async function autoMining() {
  updateInfoPanel('Auto Mining');
  logWindow.log(`${colorText('Starting Auto Mining...', COLORS.CYAN)}`);

  // Load private keys from both wallets.txt and .env
  let privateKeys = new Set(); // Using Set to avoid duplicates

  // Load from wallets.txt
  try {
    const content = fs.readFileSync('wallets.txt', 'utf8');
    const walletsKeys = content.split('\n')
      .filter(line => line.trim() && line.includes('PRIVATE_KEY_'))
      .map(line => line.split('=')[1].trim());
    
    walletsKeys.forEach(key => privateKeys.add(key));
    logWindow.log(`${colorText(`Found ${walletsKeys.length} wallets in wallets.txt`, COLORS.GREEN)}`);
  } catch (error) {
    logWindow.log(`${colorText(`Note: wallets.txt not found or empty`, COLORS.YELLOW)}`);
  }

  // Load from .env
  try {
    const envKeys = Object.keys(process.env)
      .filter(key => key.startsWith('PRIVATE_KEY_'))
      .map(key => process.env[key].trim());
    
    envKeys.forEach(key => privateKeys.add(key));
    logWindow.log(`${colorText(`Found ${envKeys.length} wallets in .env`, COLORS.GREEN)}`);
  } catch (error) {
    logWindow.log(`${colorText(`Note: No private keys found in .env`, COLORS.YELLOW)}`);
  }

  // Convert Set back to array
  privateKeys = Array.from(privateKeys).filter(key => key); // Remove any empty keys

  if (privateKeys.length === 0) {
    logWindow.log(`${colorText('No private keys found in either wallets.txt or .env', COLORS.RED)}`);
    return;
  }
  logWindow.log(`${colorText(`Total unique wallets to process: ${privateKeys.length}`, COLORS.BLUE)}`);

  const proxies = loadProxies();
  let successCount = 0;

  for (let i = 0; i < privateKeys.length; i++) {
    const privateKey = privateKeys[i];
    updateInfoPanel('Processing Mining', { currentAccount: i + 1, totalAccounts: privateKeys.length });
    
    try {
      const wallet = new ethers.Wallet(privateKey);
      const address = wallet.address;
      logWindow.log(`${colorText(`[${i + 1}/${privateKeys.length}] Processing wallet: ${address.slice(0, 6)}...${address.slice(-4)}`, COLORS.CYAN)}`);

      const proxy = proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : null;
      let proxyAgent = null;
      if (proxy) {
        try {
          proxyAgent = new HttpsProxyAgent(proxy);
          logWindow.log(`${colorText(`Using proxy: ${proxy}`, COLORS.GRAY)}`);
        } catch (error) {
          logWindow.log(`${colorText(`Invalid proxy ${proxy}. Proceeding without proxy.`, COLORS.YELLOW)}`);
        }
      }

      const nonce = await retry(() => getNonce(address, proxyAgent));
      const message = `Sign this message to authenticate: ${nonce}`;
      const signature = await wallet.signMessage(message);
      const token = await retry(() => verifySignature(nonce, signature, proxyAgent));

      const claimAt = await retry(() => startMining(token, address, proxyAgent));
      successCount++;
      
      logWindow.log(`${colorText(`Mining started successfully for ${address}`, COLORS.GREEN)}`);
      logWindow.log(`${colorText(`Next claim time: ${new Date(claimAt).toLocaleString()}`, COLORS.BLUE)}`);

    } catch (error) {
      logWindow.log(`${colorText(`Failed to process wallet ${i + 1}: ${error.message}`, COLORS.RED)}`);
    }

    if (i < privateKeys.length - 1) {
      const delay = Math.floor(Math.random() * 3000) + 2000;
      logWindow.log(`${colorText(`Waiting ${(delay / 1000).toFixed(1)} seconds before next wallet...`, COLORS.GRAY)}`);
      const stopDelaySpinner = showSpinner('Waiting...', 'Proceeding to next wallet!');
      await setTimeoutPromise(delay);
      stopDelaySpinner();
    }
  }

  updateInfoPanel('Mining Completed');
  logWindow.log(`${colorText(`Mining started for ${successCount} out of ${privateKeys.length} wallets`, COLORS.GREEN)}`);
  await setTimeoutPromise(2000);
}

// Menu system
async function showMenu() {
  updateInfoPanel('Menu');
  logWindow.log(`${colorText('========== Stobix Auto Bot Menu ==========', COLORS.WHITE)}`);
  const menuItems = [
    '1. Auto Task (Referral, Tasks & Mining Check)',
    '2. Auto Referral (Create Wallets)',
    '3. Start Mining (From wallets.txt)',
    '4. Exit',
  ];
  for (const item of menuItems) {
    logWindow.log(`${colorText(item, COLORS.ORANGE)}`);
    await setTimeoutPromise(100);
    screen.render();
  }
  logWindow.log(`${colorText('=====================================', COLORS.WHITE)}`);

  const option = await getInput('Select an option (1-4): ');
  switch (option) {
    case '2':
      await autoReferral();
      await setTimeoutPromise(2000);
      showMenu();
      break;
    case '3':
      await autoMining();
      await setTimeoutPromise(2000);
      showMenu();
      break;
    case '4':
      logWindow.log(`${colorText('Exiting application...', COLORS.GRAY)}`);
      process.exit(0);
    default:
      logWindow.log(`${colorText('Invalid option. Please select 1-4.', COLORS.YELLOW)}`);
      await setTimeoutPromise(2000);
      showMenu();
      break;
  }
}

// Main function
async function main() {
  await new Promise(resolve => {
    showBanner();
    global.setTimeout(resolve, 750);
  });

  updateInfoPanel('Initializing');
  await showMenu();
}

main().catch(error => {
  logWindow.log(`${colorText(`Fatal error: ${error.message}`, COLORS.RED)}`);
  process.exit(1);
});
