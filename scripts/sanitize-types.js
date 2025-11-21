import 'dotenv/config';
import { query } from '../lib/database/client.js';

function normalizeTypes(value) {
  if (value == null) return null; // nada a fazer

  // Se já é array JS
  if (Array.isArray(value)) {
    return JSON.stringify(value.map(v => String(v).trim()).filter(Boolean));
  }

  // Buffer ou outro objeto
  if (Buffer.isBuffer(value)) {
    value = value.toString('utf8');
  } else if (typeof value === 'object') {
    // Tenta serializar objeto que não seja array; não sabemos estrutura -> retorna []
    try {
      const asString = JSON.stringify(value);
      // Se objeto possui propriedade length mas não é array, ignora
      value = asString;
    } catch (_) {
      return JSON.stringify([]);
    }
  }

  if (typeof value !== 'string') {
    return JSON.stringify([]);
  }

  const raw = value.trim();
  if (!raw) return JSON.stringify([]);

  // Parece JSON
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed.map(v => String(v).trim()).filter(Boolean));
      }
      // Se é objeto simples, não utilizamos suas chaves -> []
      return JSON.stringify([]);
    } catch (_) {
      return JSON.stringify([]);
    }
  }

  // Lista separada por vírgula
  const arr = raw.split(',').map(s => s.trim()).filter(Boolean);
  return JSON.stringify(arr);
}

async function run() {
  console.log('🔧 Iniciando saneamento da coluna types em venues...');
  const rows = await query('SELECT id, types FROM venues');
  let updated = 0;
  for (const row of rows) {
    const normalized = normalizeTypes(row.types);
    // Se normalized é null não atualiza; se diferente do original (como string) atualiza
    if (normalized && normalized !== row.types) {
      await query('UPDATE venues SET types = ? WHERE id = ?', [normalized, row.id]);
      updated++;
    }
  }
  console.log(`✅ Saneamento concluído. Registros atualizados: ${updated}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Erro no saneamento:', err);
  process.exit(1);
});
