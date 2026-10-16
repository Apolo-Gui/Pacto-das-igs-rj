# Pacto das IGs • Painel administrativo (v1)

**Base conferida:** https://github.com/Apolo-Gui/Pacto-das-igs-rj (branch `main`)

Este pacote **não modifica o repositório automaticamente**. É uma camada de administração para o site HTML/CSS/JS que você já tem. Inclui CRUD de notícias, cadastro e edição de IGs, ativação/desativação de destaques, ordenação, datas programadas, imagens e importação assistida dos cards atuais.

## 1. Criar o banco

1. Crie um projeto em https://supabase.com.
2. Em **SQL Editor**, execute o conteúdo completo de `supabase/schema.sql`.
3. Em **Authentication > Users**, crie manualmente seu usuário (e-mail + senha). Não habilite auto-cadastro público de administradores.
4. Copie o **User UID** (UUID) do usuário que acabou de criar.
5. No **SQL Editor**, rode, trocando apenas o UUID:

```sql
insert into public.pacto_admins (user_id)
values ('c1f041ae-05e3-45e1-a696-da5114f50c73');
```

6. Em **Project Settings > API** ou **Connect** (o nome pode variar), copie a Project URL e a chave **publishable** ou **anon** (pública).
7. No arquivo `cms-config.js`, preencha `url` e `anonKey`.

**SEGURANÇA:** Nunca coloque a chave `service_role`, a chave `secret` ou uma senha em `cms-config.js`, no GitHub ou em qualquer script do navegador. A chave publishable/anon pode ficar no navegador porque as políticas RLS estão habilitadas no banco. Não adicione usuários diretamente à tabela `pacto_admins` sem conferir quem eles são.

## 2. Adicionar arquivos ao projeto existente

Copie os arquivos nas seguintes posições, a partir da raiz do repositório:

```
Pacto-das-igs-rj/
├── cms-config.js                ← novo
├── noticia.html                 ← novo
├── admin/                       ← pasta nova
│   ├── index.html
│   ├── admin.css
│   └── admin.js
├── JS/
│   ├── script.js                ← existente, NÃO substitua
│   ├── projetos.js              ← existente, NÃO substitua
│   ├── cms-public.js            ← novo
│   └── noticia.js               ← novo
├── CSS/                         ← existente, NÃO substitua
├── home.html                    ← existente, adicionar scripts (passo 3)
└── imgs/                        ← existente, NÃO substitua
```

`supabase/schema.sql` e este guia ficam como documentação: não precisam ficar publicados no site.

## 3. Conectar o site público

Abra **`home.html`** e adicione, **imediatamente antes de `</body>`**, nesta ordem:

```html
<!-- Painel Pacto das IGs: mostra notícias/IGs publicadas no Supabase -->
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script defer src="cms-config.js"></script>
<script defer src="JS/cms-public.js"></script>
```

Esse script procura as classes **`.noticias__grid`** e **`.igs__grid`**, que já aparecem no CSS do site original, e usa os cards originais como referência visual. Nenhuma outra seção da home é alterada. **Não precisa substituir CSS/style.css ou JS/script.js.**

**Importante:** Mantenha `enabled: false` em `cms-config.js` até terminar de importar ou cadastrar e publicar o conteúdo. Enquanto `enabled` está falso, a home continua usando os cards HTML atuais.

## 4. Acessar o painel

Depois de publicar (ou abrir em um servidor local HTTP):

- Painel: `https://SEU-DOMINIO/admin/`
- Site: `https://SEU-DOMINIO/home.html`
- Página de uma notícia: `https://SEU-DOMINIO/noticia.html?id=UUID`

Acesse o painel com o e-mail e senha do usuário criado em Supabase Authentication.

**Em `file://` algumas operações, como importar a home, não funcionarão.** Use um servidor local como o Live Server (VS Code), `python -m http.server 8000` ou a hospedagem já existente.

## 5. Migrar os conteúdos existentes

1. Entre no painel e, na **Visão geral**, clique em **Importar cards da home**.
2. O importador lê `home.html`, procura `.noticias__grid .noticia-card` e `.igs__grid .ig-card`, e ignora títulos/nomes já cadastrados.
3. **Notícias entram como rascunho**. Revise a data, a descrição e o texto integral, pois o card original pode ter apenas um resumo. Depois publique.
4. **IGs entram como ativas e em destaque**, numeradas na ordem em que aparecem no HTML. Confira imagem, região e produto. Remova as que não quiser na home e ajuste a ordem.
5. Depois de conferir pelo menos uma notícia publicada e os destaques, altere **`enabled: true`** em `cms-config.js` e publique esse arquivo. A home passará a ler o banco.

### E depois?

- **Notícia:** selecione Notícias > Nova notícia. Escreva título, resumo, texto e escolha entre rascunho e publicada. Para ocultar, edite como rascunho. Excluir apaga o registro do banco.
- **IG:** selecione Indicações geográficas > Nova IG. Ative "Exibir na vitrine da home". Determine a ordem com números 1, 2, 3 etc. Se quiser agendar, preencha início e/ou fim do destaque. Clique em Salvar.
- **Imagens:** informe URL HTTP(S) ou faça upload de PNG, JPG ou WEBP com até 5 MB. Imagens enviadas ficam no bucket `pacto-media` do Supabase. Excluir um registro não apaga automaticamente sua imagem do bucket.

## 6. Como funciona a proteção

- Apenas usuários na tabela `pacto_admins` podem criar, editar e excluir informações e enviar imagens. O login sozinho **não** dá acesso administrativo.
- Visitantes podem consultar **somente notícias publicadas** e **IGs com destaque ativo dentro do período**.
- O controle de acesso é aplicado **no banco por RLS** e não depende de esconder botões na interface.
- A pasta `/admin/` pode ser aberta por qualquer visitante no navegador, mas suas operações e dados de edição exigem conta autorizada.

## 7. Limitações da v1

- No painel não há editor visual rico; o conteúdo da notícia é texto com parágrafos. A página pública de notícia respeita quebras de linha.
- A importação é baseada na estrutura atual de classes, sem garantia para HTML futuro modificado. Confira os registros depois da importação.
- O conteúdo exibido na home é carregado quando a página abre ou recarrega; para refletir agendamentos sem recarregar a aba aberta, poderemos adicionar atualização automática.
- Não há exclusão automática de arquivos de mídia, lixeira de registros, gestão avançada de permissões ou paginação. Essas melhorias podem vir na v2.
- Notícia publicada usa a data da primeira publicação; rascunhos não ficam visíveis ao público.

## 8. Caso a lista pública não apareça

Abra as ferramentas de desenvolvedor do navegador (F12 > Console): confira se `cms-config.js` está correto, se o SQL foi executado, se o arquivo `JS/cms-public.js` foi carregado e se há registros publicados/destacados. Em caso de erro de consulta, o script preserva o HTML original em vez de apagar os cards.

---

**Versão:** 1.0.0 • **Integração:** Supabase JavaScript v2 + HTML/CSS/JS puro • **Repositório original:** sem alterações automáticas.
