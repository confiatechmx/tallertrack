/**
 * Verificador automático de disponibilidad de dominios .com
 * Consulta el servicio oficial RDAP de Verisign (operador raíz oficial de todos los .com).
 * Sin necesidad de tokens privados ni límite estricto de cuotas.
 * 
 * Uso:
 *   node scripts/check-domains.mjs nombre1 nombre2 nombre3
 *   node scripts/check-domains.mjs --file lista.txt
 */

import https from 'node:https';
import fs from 'node:fs';

export async function checkDotCom(name) {
  const clean = name.trim().toLowerCase().replace(/\.com$/, '').replace(/[^a-z0-9-]/g, '');
  if (!clean) return null;

  return new Promise((resolve) => {
    const req = https.get(`https://rdap.verisign.com/com/v1/domain/${clean}.com`, (res) => {
      // 404 = No registrado (disponible para comprar en Hostinger, Namecheap, etc.)
      // 200 = Registrado (ocupado)
      resolve({
        domain: `${clean}.com`,
        name: clean,
        available: res.statusCode === 404,
        statusCode: res.statusCode,
      });
      res.resume();
    });

    req.on('error', () => {
      resolve({ domain: `${clean}.com`, name: clean, available: false, error: true });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ domain: `${clean}.com`, name: clean, available: false, timeout: true });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let names = [];

  if (args.length === 0) {
    console.log('💡 Uso: node scripts/check-domains.mjs <dominio1> <dominio2> ...');
    console.log('      node scripts/check-domains.mjs --file lista.txt');
    return;
  }

  if (args[0] === '--file' && args[1]) {
    const content = fs.readFileSync(args[1], 'utf-8');
    names = content.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
  } else {
    names = args;
  }

  console.log(`\n🔍 Verificando ${names.length} dominios contra Verisign RDAP (.com raíz)...\n`);

  const available = [];
  const taken = [];

  for (const name of names) {
    const res = await checkDotCom(name);
    if (!res) continue;

    if (res.available) {
      console.log(`  ✅ DISPONIBLE : ${res.domain}`);
      available.push(res.domain);
    } else {
      console.log(`  ❌ OCUPADO    : ${res.domain}`);
      taken.push(res.domain);
    }
    await new Promise(r => setTimeout(r, 60));
  }

  console.log('\n======================================');
  console.log(`🎉 Resumen: ${available.length} disponibles / ${taken.length} ocupados`);
  console.log('======================================');
  if (available.length > 0) {
    console.log('\nLista de dominios disponibles:');
    available.forEach(d => console.log(`  - ${d}`));
  }
}

if (process.argv[1] && process.argv[1].endsWith('check-domains.mjs')) {
  main();
}
