#!/usr/bin/env node
// Minimal Prisma generator (stdio JSON-RPC) that writes the full DMMF to DMMF_OUT.
// Used only by scripts/build-migration.js; not part of the runtime app.
const fs = require('node:fs');
const readline = require('node:readline');
const rl = readline.createInterface({ input: process.stdin });
const reply = (id, result) => process.stderr.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
rl.on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.method === 'getManifest') reply(msg.id, { manifest: { prettyName: 'DMMF dump', defaultOutput: '.' } });
  else if (msg.method === 'generate') {
    fs.writeFileSync(process.env.DMMF_OUT, JSON.stringify(msg.params.dmmf.datamodel, null, 1));
    reply(msg.id, null);
  }
});
