# 🔧 Scripts - Utilit ários e Manutenção

Esta pasta contém scripts auxiliares para manutenção do banco de dados e normalização de dados.

## Scripts Disponíveis

### `run-migrations.js` - Executar Migrations do Banco

Executa o arquivo `lib/database/migrations.sql` no MySQL, criando todas as tabelas necessárias.

#### Uso
```powershell
node scripts/run-migrations.js
```

#### O que faz
1. Carrega variáveis de ambiente do `.env`
2. Conecta ao MySQL usando credenciais configuradas
3. Lê o arquivo `migrations.sql`
4. Executa cada statement SQL sequencialmente
5. Exibe sucesso ou erro para cada operação

#### Variáveis de Ambiente Necessárias
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=locais_noturnos_dev
DB_USER=root
DB_PASSWORD=sua_senha
```

#### Saída Esperada
```
✅ Migrations executadas com sucesso!
Tabelas criadas:
- users
- venues
- favorites
- reviews
- check_ins
```

#### Troubleshooting

**Erro: `ER_ACCESS_DENIED_ERROR`**
- Verifique usuário/senha no `.env`
- Confirme permissões: `GRANT ALL ON locais_noturnos_dev.* TO 'root'@'localhost';`

**Erro: `ER_BAD_DB_ERROR`**
- Crie o banco manualmente:
```sql
CREATE DATABASE locais_noturnos_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Erro: `ER_TABLE_EXISTS_ERROR`**
- Normal se rodar múltiplas vezes (usa `IF NOT EXISTS`)
- Para recriar: `DROP DATABASE locais_noturnos_dev;` e execute novamente

---

### `sanitize-types.js` - Normalizar Coluna `types`

Normaliza a coluna `types` da tabela `venues` para formato JSON consistente.

#### Problema que Resolve
A coluna `types` pode estar em diferentes formatos:
- String separada por vírgulas: `"bar,restaurant"`
- JSON array: `["bar", "restaurant"]`
- JSON string: `"[\"bar\",\"restaurant\"]"`

Isso causa erros de parsing no frontend.

#### Uso
```powershell
node scripts/sanitize-types.js
```

#### O que faz
1. Busca todos os registros na tabela `venues`
2. Para cada registro com `types` inconsistente:
   - Detecta o formato atual
   - Converte para JSON array válido
   - Atualiza o registro
3. Exibe estatísticas de registros atualizados

#### Saída Esperada
```
Processando 10 registros...
✅ Registros atualizados: 4
- Venue ID: abc-123 (tipos: bar,restaurant → ["bar","restaurant"])
- Venue ID: def-456 (tipos: [object Object] → ["night_club"])
...
```

#### Quando Usar
- Após importar dados de fontes externas
- Quando frontend reporta erros de JSON parse
- Após migração de schema antigo
- Periodicamente para manutenção

---

## Criando Novos Scripts

### Template Base
```javascript
/**
 * Script: Descrição
 * Uso: node scripts/nome-do-script.js
 */
import dotenv from 'dotenv';
import { query } from '../lib/database/client.js';
import logger from '../lib/utils/logger.js';

dotenv.config();

async function main() {
  try {
    // Lógica do script aqui
    console.log('✅ Script executado com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    logger.error({ script: 'nome-do-script', error: error.message });
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
```

### Boas Práticas
1. **Sempre use dotenv**: Carregue `.env` no início
2. **Logging**: Use `logger` para erros, `console.log` para progresso
3. **Exit codes**: `0` para sucesso, `1` para erro
4. **Try/catch**: Capture e trate erros apropriadamente
5. **Documentação**: Inclua comentário JSDoc no topo
6. **Confirmação**: Para operações destrutivas, peça confirmação

### Exemplo: Script de Seed Data
```javascript
/**
 * Seed Data - Popula banco com dados de teste
 * Uso: node scripts/seed-data.js
 */
import dotenv from 'dotenv';
import { query } from '../lib/database/client.js';
import { hashPassword } from '../lib/services/authService.js';

dotenv.config();

async function main() {
  console.log('Populando banco de dados...');
  
  // Criar usuário de teste
  const password_hash = await hashPassword('senha123');
  await query(
    'INSERT IGNORE INTO users (email, name, password_hash) VALUES (?, ?, ?)',
    ['teste@example.com', 'Usuário Teste', password_hash]
  );
  
  // Criar venues de exemplo
  await query(
    `INSERT IGNORE INTO venues (google_place_id, name, address, latitude, longitude, types, rating)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['place_test_1', 'Bar Teste', 'Rua Teste, 123', -23.5505, -46.6333, JSON.stringify(['bar']), 4.5]
  );
  
  console.log('✅ Dados inseridos com sucesso!');
  process.exit(0);
}

main();
```

---

## Scripts Úteis para Criação Futura

### `backup-database.js`
Cria backup do banco de dados:
```powershell
node scripts/backup-database.js
# Cria arquivo: backups/backup-2025-01-20.sql
```

### `clean-expired-tokens.js`
Remove tokens JWT expirados (se armazenados):
```powershell
node scripts/clean-expired-tokens.js
```

### `populate-venue-photos.js`
Busca e salva fotos de venues usando Google Places:
```powershell
node scripts/populate-venue-photos.js
```

### `calculate-user-stats.js`
Calcula estatísticas agregadas de usuários:
```powershell
node scripts/calculate-user-stats.js
# Total check-ins, reviews, favoritos por usuário
```

### `verify-data-integrity.js`
Verifica integridade referencial:
```powershell
node scripts/verify-data-integrity.js
# Checa foreign keys órfãs, duplicatas, etc.
```

---

## Executando Scripts com npm

Adicione ao `package.json`:
```json
{
  "scripts": {
    "migrate": "node scripts/run-migrations.js",
    "sanitize": "node scripts/sanitize-types.js",
    "seed": "node scripts/seed-data.js",
    "backup": "node scripts/backup-database.js"
  }
}
```

Uso:
```powershell
npm run migrate
npm run sanitize
npm run seed
```

---

## Segurança

### Nunca Versione
- ❌ Backups de banco (.sql com dados reais)
- ❌ Logs com informações sensíveis
- ❌ Credenciais hardcoded

### Sempre Inclua
- ✅ `.env` configurado corretamente
- ✅ Tratamento de erros
- ✅ Logging de operações
- ✅ Mensagens claras de sucesso/erro

---

## Agendamento (Cron Jobs)

### Linux/macOS (crontab)
```bash
# Editar crontab
crontab -e

# Executar sanitize diariamente às 3h
0 3 * * * cd /path/to/project && node scripts/sanitize-types.js >> /var/log/sanitize.log 2>&1

# Backup semanal (domingo 2h)
0 2 * * 0 cd /path/to/project && node scripts/backup-database.js >> /var/log/backup.log 2>&1
```

### Windows (Task Scheduler)
```powershell
# Criar task via PowerShell
$action = New-ScheduledTaskAction -Execute "node" -Argument "C:\path\to\project\scripts\sanitize-types.js"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "SanitizeTypes" -Action $action -Trigger $trigger
```

---

## Próximos Passos

- [ ] Adicionar script de seed data
- [ ] Implementar backups automáticos
- [ ] Script de verificação de saúde do sistema
- [ ] Testes automatizados de migrations
- [ ] Script de rollback de migrations
