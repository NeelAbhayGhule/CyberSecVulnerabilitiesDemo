const express = require('express');
const path = require('path');

const app = express();
const PORT = 4000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`☠️  Attacker Server (Malicious Origin) running on:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`   Payload: Auto-submitting POST form targeting Bank`);
  console.log(`=======================================================`);
});
