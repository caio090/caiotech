# RecOS — Central Audiovisual da Lokat Rec

## O que é a RecOS

A RecOS é o módulo audiovisual da Lokat OS, voltado para a produção cinematográfica e narrativa de vídeo. Ela organiza todo o processo de pré-produção audiovisual: roteiro, storytelling, storyboard, shot list e plano de gravação.

**Frase guia:**
> A ContentOS organiza o marketing. A RecOS organiza a produção audiovisual.

---

## Diferença entre ContentOS e RecOS

| ContentOS | RecOS |
|---|---|
| Estratégia de marketing | Roteiro cinematográfico |
| Social media e calendário | Storytelling e narrativa |
| Briefings de arte | Storyboard e quadros visuais |
| Roteiros comerciais simples | Direção de câmera e planos |
| Copies e legendas | Shot list técnica |
| Campanhas orgânicas | Plano de gravação |
| Envia para design/social/tráfego | Envia para videomaker/editor |

### Tipos de projeto da RecOS
- Comercial
- Institucional
- Aftermovie
- Casamento
- Evento
- Documentário curto
- Vídeo de marca
- Campanha audiovisual
- Clipe
- Depoimento
- Reels cinematográfico

---

## Rotas

### Admin
- `/admin/recos` — dashboard com lista de projetos
- `/admin/recos/criar` — criar novo projeto audiovisual
- `/admin/recos/[id]` — detalhe do projeto (tabs)

### Operacional (Videomaker/Editor)
- `/operacional/recos` — lista de projetos do videomaker
- `/operacional/recos/[id]` — visualização do projeto (storyboard + shot list + plano)

---

## Permissões

| Role | Acesso |
|---|---|
| admin | Completo — cria, edita, exporta |
| videomaker | RecOS admin + operacional |
| editor | RecOS operacional (leitura + edição de frames) |
| operacional | RecOS operacional |
| social_media | Sem acesso por padrão |
| designer | Sem acesso por padrão |
| cliente | Sem acesso na fase atual |

---

## Fluxo: Roteiro → Storyboard

### Caminho A: Roteiro anexado
1. Admin cria projeto RecOS
2. Cola ou sobe roteiro existente (texto, PDF, link)
3. Cria frames do storyboard manualmente com base no roteiro
4. Define câmera, lente, movimento por cena
5. Exporta para videomaker

### Caminho B: Roteiro do zero
1. Admin cria projeto RecOS
2. Preenche estrutura narrativa (início, desenvolvimento, clímax, encerramento)
3. Cria frames do storyboard com descrições visuais
4. Adiciona referências de cena
5. Exporta plano de gravação

---

## Seções do Projeto (tabs)

### Visão Geral
Resumo do projeto: tipo, estilo, duração, local, data de gravação, equipe, status.

### Roteiro
- Anexar roteiro: colar texto, adicionar URL, upload de arquivo
- Criar do zero: estrutura narrativa com campos título, ideia, objetivo, início, desenvolvimento, clímax, encerramento, CTA
- Placeholder para análise automática via IA (futuro)

### Storytelling
Organizar a narrativa:
- Tema central, mensagem, emoção desejada
- Abertura / Contexto / Desenvolvimento / Momento principal / Fechamento
- Templates por tipo (casamento, aftermovie, institucional)

### Storyboard
Grid de quadros. Cada frame contém:
- Número de cena e quadro
- Descrição visual
- Fala ou narração
- Tipo de plano (aberto, médio, close, detalhe, POV...)
- Movimento de câmera (fixo, pan, tilt, travelling, gimbal...)
- Lente sugerida (24mm, 35mm, 50mm, 85mm...)
- **Imagem do frame** — upload via `AttachmentUploader` (link externo ou upload local)
- **Direção visual** (salvo em `metadata` jsonb):
  - Emoção: Alegria, Nostalgia, Tensão, Calma, Empolgação...
  - Temperatura visual: Quente / Frio / Neutro / Alto contraste
  - Iluminação: Natural, Estúdio, Ambiente, Low key, High key...
  - Clima visual: Minimalista, Cinematográfico, Documental...
  - Paleta de cor: Tons terrosos, Pastéis, Neón, Monocromático...
- Prompt para geração futura com IA

Status da imagem: `pendente` → `descrição pronta` → `referência anexada` → `aguardando_ia` → `gerada` → `aprovada`

### Shot List
Tabela técnica de planos por cena:
- Cena / Shot / Descrição / Plano / Ângulo / Movimento / Lente / Áudio / Duração / Status

Status: `planejado` → `gravar` → `gravado` → `refazer` → `aprovado`

### Plano de Gravação
- Data, horário, local, equipe, responsável
- Câmeras, lentes, áudio, iluminação
- Checklist de equipamentos

### Referências
Cards visuais com:
- Tipo de referência (cena, cor, enquadramento, movimento, iluminação, edição, áudio, locação)
- URL ou imagem
- Observação

### Arquivos (Biblioteca de Mídia)
Centraliza todo material de arquivo do projeto, usando `operational_attachments` com `rec_project_id`.
- Categorias: Material bruto, Referência visual, Arquivo do cliente, Edição / corte, Entregável final, Link de pasta (Drive), Outros
- Upload via `AttachmentUploader` (link ou arquivo local → bucket `operational-attachments`)
- Listagem agrupada por categoria
- Suporte a links de pasta (Google Drive, Dropbox) sem integração de API
- SQL: `docs/supabase/26-client-files-and-recos-media-library.sql`

### Plano de Edição
Planejamento da pós-produção, salvo em `rec_projects.metadata.plano_edicao`:
- Software (Premiere, DaVinci, Final Cut...)
- Editor / Colorista, Deadline
- Estilo de edição, Transições, Trilha / Música
- Observações
- Checklist de edição (13 etapas: selecionar takes → entrega final)

### Exportar
- PDF completo (roteiro + storyboard + shot list + plano)
- Word editável
- PNG A4 horizontal (storyboard visual)
- PDF apenas storyboard
- Shot list PDF

> Exportação será ativada nas próximas fases.

---

## Banco de Dados

### SQL 25 — `docs/supabase/25-recos-audiovisual-storyboard.sql`
Tabelas base da RecOS:
- `rec_projects` — projeto audiovisual
- `rec_scripts` — roteiro (texto ou link)
- `rec_storytelling` — estrutura narrativa
- `rec_storyboard_frames` — quadros do storyboard (campo `metadata jsonb` para direção visual)
- `rec_references` — referências visuais
- `rec_shot_list` — lista técnica de planos
- `rec_exports` — registro de exportações

### SQL 26 — `docs/supabase/26-client-files-and-recos-media-library.sql`
Extensão da tabela `operational_attachments`:
- `rec_project_id uuid` — liga arquivo ao projeto RecOS
- `rec_frame_id uuid` — liga arquivo a um frame específico
- `category text` — bruto / referencia / cliente / edicao / entregavel / drive / outros
- `tags text[]` — tags livres
- Índices e políticas RLS para videomaker/editor

---

## Integração com IA (futuro)

A RecOS está preparada para uma futura integração de IA que:
- Lê o roteiro e identifica cenas, personagens, cenários e emoções
- Sugere quadros de storyboard com base no roteiro
- Gera imagens para os frames do storyboard
- Sugere ordem de filmagem otimizada

Campos preparados: `image_prompt`, `image_status`, botão "Sugerir cenas com IA" (desativado até integração).

---

## Integração com ContentOS (futuro)

Um roteiro criado na ContentOS poderá ser enviado para a RecOS via botão "Enviar para RecOS", criando um projeto RecOS com cliente, roteiro, objetivo e formato pré-preenchidos.

---

## Integração com OperacionalOS

Quando um projeto RecOS estiver pronto, o admin pode enviar para o videomaker/editor via `operational_task`, com:
- Projeto RecOS linkado
- Storyboard e shot list no brief
- Data de gravação como `due_date`

---

## Como testar

1. Login como admin → ver "RecOS" no menu lateral
2. Clicar em RecOS → ver dashboard com empty state
3. Clicar "Criar projeto" → preencher form → salvar
4. Projeto aparece na lista
5. Clicar no projeto → ver tabs (9 no total)
6. Aba Roteiro → colar roteiro por texto
7. Aba Storyboard → clicar "Adicionar frame" → preencher → salvar
   - Verificar campos de direção visual (emoção, temperatura, iluminação, clima, paleta)
   - Verificar AttachmentUploader da imagem do frame (link ou upload)
8. Frame aparece no grid (com imagem se houver)
9. Aba Shot List → adicionar shot
10. Aba Plano → preencher data e checklist
11. Aba Referências → adicionar link de referência
12. Aba Arquivos → adicionar link de Drive, selecionar categoria, ver listagem agrupada
13. Aba Plano de Edição → preencher software, deadline, marcar checklist
14. Aba Exportar → botões presentes mas mostram "em breve"
15. Login como videomaker → ver "RecOS" no menu
16. Login como designer → NOT ver RecOS no menu
17. Login como cliente → NOT ver RecOS

> **SQL necessário antes de testar:**
> 1. Rodar `25-recos-audiovisual-storyboard.sql` no Supabase SQL Editor
> 2. Rodar `26-client-files-and-recos-media-library.sql` no Supabase SQL Editor
