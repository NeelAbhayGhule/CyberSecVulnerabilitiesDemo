/**
 * Master Runner for IT-30001 Cyber Security Assignment: CSRF Variant 2
 * This script concurrently launches both:
 * 1. Bank Web Server (Victim application) on http://localhost:3000
 * 2. Attacker Web Server (Malicious origin) on http://localhost:4000
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log('🛡️  IIIT ALLAHABAD - CYBER SECURITY (IT-30001) CSRF LAB');
console.log('📌 Variant 2: POST-based forged action (auto-submitting form)');
console.log('================================================================');

// Launch Bank Server (Port 3000)
const bankProcess = spawn('node', [path.join(__dirname, 'bank-server', 'index.js')], {
  stdio: 'inherit'
});

// Launch Attacker Server (Port 4000)
const attackerProcess = spawn('node', [path.join(__dirname, 'attacker-server', 'index.js')], {
  stdio: 'inherit'
});

function cleanup() {
  console.log('\nShutting down both servers...');
  bankProcess.kill();
  attackerProcess.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
