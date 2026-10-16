/* Pacto das IGs • CMS Admin — Supabase v2. Não contém privilégios secretos. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const state = { client: null, view: 'overview', news: [], igs: [], editing: null, search: '' };
  const locale = 'pt-BR';

  function showOnly(id) {
    for (const x of ['setup','access','workspace']) document.getElementById(x).hidden = x !== id;
  }
  function toast(message) {
    const box = $('#toast'); box.textContent = message; box.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => box.hidden = true, 5500);
  }
  function safeImage(url) {
    if (!url || typeof url !== 'string') return '';
    try { const u = new URL(url, new URL('../home.html', location.href)); return ['http:','https:'].includes(u.protocol) ? u.href : ''; }
    catch { return ''; }
  }
  function localDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  }
  function toISO(value) { return value ? new Date(value).toISOString() : null; }
  function dateText(value) { return value ? new Date(value).toLocaleDateString(locale) : 'Sem data'; }
  function escapeAttr(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'); }
  function make(tag, cls, text) {
    const x = document.createElement(tag); if(cls) x.className = cls;
    if(text !== undefined) x.textContent = text; return x;
  }
  function submitLoading(yes, selector, text) {
    const b = $(selector); b.disabled = yes; b.textContent = yes ? 'Salvando...' : text;
  }
  async function verifyAdmin() {
    const { data, error } = await state.client.rpc('is_pacto_admin');
    if (error) throw error;
    return data === true;
  }
  async function showWorkspace() {
    if (!(await verifyAdmin())) {
      await state.client.auth.signOut();
      showOnly('access');
      $('#login-error').textContent = 'Conta sem permissão de administrador. Verifique a tabela pacto_admins.';
      return;
    }
    const {data:{user}} = await state.client.auth.getUser();
    $('#user-email').textContent = user?.email || 'Administrador';
    showOnly('workspace');
    await refresh();
    changeView(state.view);
  }
  async function refresh() {
    const [n,i] = await Promise.all([
      state.client.from('pacto_news').select('*').order('created_at', {ascending:false}),
      state.client.from('pacto_igs').select('*').order('sort_order', {ascending:true}).order('created_at', {ascending:true})
    ]);
    if(n.error) throw n.error; if(i.error) throw i.error;
    state.news = n.data ?? []; state.igs = i.data ?? [];
    renderStats(); renderRecords();
  }
  function eligible(ig) {
    const now = Date.now();
    return ig.is_active && ig.is_featured && (!ig.show_from || new Date(ig.show_from).getTime() <= now)
      && (!ig.show_until || new Date(ig.show_until).getTime() > now);
  }
  function renderStats() {
    const cards = [
      ['Total de notícias', state.news.length, `${state.news.filter(n=>n.is_published).length} publicadas`, '▤'],
      ['IGs cadastradas', state.igs.length, `${state.igs.filter(x=>x.is_active).length} ativas`, '◇'],
      ['IGs em exposição', state.igs.filter(eligible).length, 'Visíveis na página inicial', '◉']
    ];
    const parent = $('#stats'); parent.replaceChildren();
    cards.forEach(([label,count,description,icon]) => {
      const c=make('article','stat'),top=make('div','stat-top');
      top.append(make('span','',label),make('span','stat-mark',icon));
      c.append(top,make('strong','',String(count)),make('small','',description)); parent.append(c);
    });
  }
  function changeView(view) {
    state.view = view; state.search = ''; $('#search').value = '';
    const meta = {
      overview: ['Visão geral','Painel de controle','Uma visão clara do que está acontecendo no seu site.','+ Nova notícia'],
      news: ['Notícias','Gerenciar notícias','Crie publicações, salve rascunhos e atualize informações.','+ Nova notícia'],
      igs: ['Indicações geográficas','Gerenciar IGs','Escolha quais territórios aparecem em destaque e em qual ordem.','+ Nova IG']
    }[view];
    $('#breadcrumb').textContent=meta[0]; $('#page-title').textContent=meta[1];
    $('#page-subtitle').textContent=meta[2]; $('#new-item').textContent=meta[3];
    $('#overview-panel').hidden=view!=='overview'; $('#data-panel').hidden=view==='overview';
    $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
    $('#table-heading').textContent=view==='igs'?'Indicações cadastradas':'Notícias cadastradas';
    $('#table-kicker').textContent=view==='igs'?'VITRINE DE TERRITÓRIOS':'CENTRAL DE PUBLICAÇÕES';
    $('#workspace').classList.remove('menu-open');
    renderRecords();
  }
  function actionButton(label, action, id, danger=false) {
    const b=make('button','icon-btn'+(danger?' danger':''),label);
    b.type='button'; b.dataset.action=action; b.dataset.id=id; return b;
  }
  function renderRecords() {
    const parent=$('#records'); parent.replaceChildren();
    if(state.view==='overview') return;
    const isNews=state.view==='news';
    const records=(isNews?state.news:state.igs).filter(r=>
      [r.title,r.name,r.region,r.product,r.summary].some(v=>String(v||'').toLocaleLowerCase(locale).includes(state.search))
    );
    if(!records.length){parent.append(make('p','empty',state.search?'Nenhum resultado para essa busca.':'Nenhum conteúdo cadastrado. Use o botão de criação para começar.'));return;}
    for(const r of records) {
      const row=make('article','record'),thumb=make('div','thumb');
      const src=safeImage(r.image_url);
      if(src){const img=make('img');img.src=src;img.alt='';img.loading='lazy';thumb.append(img);}else{thumb.textContent=isNews?'▤':'◇';}
      const details=make('div');
      details.append(make('div','record-title',isNews?r.title:r.name),make('p','record-sub',isNews?`${r.category} • ${r.is_published?'Publicada':'Rascunho'} • ${dateText(r.published_at||r.created_at)}`:`${r.region||'Região não informada'} • Ordem ${r.sort_order}`));
      const buttons=make('div','record-controls');
      const status = isNews ? (r.is_published?'Publicado':'Rascunho') : (eligible(r)?'Em destaque':r.is_featured?'Agendado/oculto':'Fora da vitrine');
      buttons.append(make('span','chip '+(isNews?r.is_published?'live':'off':eligible(r)?'live':'off'),status));
      if(!isNews) buttons.append(actionButton(r.is_featured?'Retirar destaque':'Destacar','feature',r.id));
      buttons.append(actionButton('Editar','edit',r.id),actionButton('Excluir','delete',r.id,true));
      row.append(thumb,details,buttons);parent.append(row);
    }
  }
  const newsForm = `
    <label>Título da notícia *<input name="title" required minlength="4" maxlength="180" placeholder="Ex.: Novidades das IGs fluminenses"></label>
    <label>Resumo para o card<textarea name="summary" class="small-area" maxlength="500" placeholder="Um breve resumo da notícia..."></textarea></label>
    <div class="two"><label>Categoria<select name="category"><option>Novidade</option><option>Evento</option><option>Comunicado</option></select></label><label>Estado<select name="status"><option value="draft">Rascunho</option><option value="published">Publicada</option></select></label></div>
    <label>Conteúdo completo<textarea name="content" rows="8" placeholder="Escreva aqui o texto integral da notícia."></textarea></label>
    <label>Endereço da imagem<input name="image_url" type="text" placeholder="https://... ou imgs/minha-imagem.jpg"></label>
    <label>Ou envie uma imagem (até 5 MB)<input name="image_file" type="file" accept="image/png,image/jpeg,image/webp"></label>
    <span class="field-hint">O upload substitui o endereço da imagem, caso ambos sejam preenchidos.</span>`;
  const igForm = `
    <label>Nome da indicação geográfica *<input name="name" required minlength="2" maxlength="180" placeholder="Ex.: Cachaça de Paraty"></label>
    <div class="two"><label>Região<input name="region" placeholder="Ex.: Costa Verde"></label><label>Produto / categoria<input name="product" placeholder="Ex.: Cachaça"></label></div>
    <label>Descrição<textarea name="description" class="small-area" placeholder="Sobre essa indicação geográfica..."></textarea></label>
    <label>Endereço da imagem<input name="image_url" placeholder="https://... ou imgs/ig-exemplo.png"></label>
    <label>Ou envie uma imagem (até 5 MB)<input type="file" name="image_file" accept="image/png,image/jpeg,image/webp"></label>
    <div class="two"><label class="check-row"><input type="checkbox" name="is_active" checked> Cadastro ativo</label><label class="check-row"><input type="checkbox" name="is_featured"> Exibir na vitrine da home</label></div>
    <div class="two"><label>Ordem de exibição (menor primeiro)<input type="number" name="sort_order" min="0" max="9999" value="100"></label><span class="field-hint">Ex.: 1, 2, 3 e 4. O site seguirá essa ordem.</span></div>
    <div class="two"><label>Início do destaque (opcional)<input type="datetime-local" name="show_from"></label><label>Fim do destaque (opcional)<input type="datetime-local" name="show_until"></label></div>
    <span class="field-hint">Datas seguem o fuso horário de quem preenche o formulário. Sem datas, a exibição é imediata e contínua.</span>`;
  function openEditor(kind, record=null) {
    state.editing={kind,id:record?.id??null};
    $('#dialog-title').textContent=`${record?'Editar':'Cadastrar'} ${kind==='news'?'notícia':'IG'}`;
    $('#editor-fields').innerHTML=kind==='news'?newsForm:igForm; // somente templates locais fixos
    const form=$('#editor-form');
    if(record) {
      for(const [key,value] of Object.entries(record)) {
        const field=form.elements.namedItem(key);
        if(!field || field.type==='file')continue;
        if(field.type==='checkbox')field.checked=Boolean(value);
        else if(field.type==='datetime-local')field.value=localDate(value);
        else field.value=value??'';
      }
      if(kind==='news') form.elements.namedItem('status').value=record.is_published?'published':'draft';
    }
    $('#editor-dialog').showModal();
  }
  async function uploadIfAny(form, kind) {
    const file=form.elements.namedItem('image_file').files[0];
    const existing=form.elements.namedItem('image_url').value.trim();
    if(!file) {
      if(existing && !safeImage(existing)) throw new Error('Use um endereço de imagem HTTP(S) ou caminho relativo válido.');
      return existing||null;
    }
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Formato não aceito. Use PNG, JPG ou WEBP.');
    if(file.size>5*1024*1024) throw new Error('Imagem acima de 5 MB.');
    const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type];
    const random=crypto.randomUUID?.()??String(Date.now());
    const path=`${kind}/${random}.${ext}`;
    const {error}=await state.client.storage.from('pacto-media').upload(path,file,{contentType:file.type,upsert:false});
    if(error) throw error;
    return state.client.storage.from('pacto-media').getPublicUrl(path).data.publicUrl;
  }
  async function saveEditor(event) {
    event.preventDefault();
    const editing=state.editing;
    if(!editing)return;
    const form=$('#editor-form');
    const f=k=>form.elements.namedItem(k);
    const dateValue=k=>toISO(f(k).value);
    submitLoading(true,'#save-edit','Salvar alterações');
    try {
      let record,table;
      const image_url=await uploadIfAny(form,editing.kind);
      if(editing.kind==='news') {
        table='pacto_news';
        const current=state.news.find(x=>x.id===editing.id);
        const is_published=f('status').value==='published';
        record={title:f('title').value.trim(),summary:f('summary').value.trim(),content:f('content').value.trim(),category:f('category').value,image_url,is_published,published_at:is_published?(current?.published_at??new Date().toISOString()):null};
      } else {
        table='pacto_igs';
        const from=dateValue('show_from'),until=dateValue('show_until');
        if(from && until && new Date(until)<=new Date(from)) throw new Error('A data final precisa ser posterior à inicial.');
        record={name:f('name').value.trim(),region:f('region').value.trim(),product:f('product').value.trim(),description:f('description').value.trim(),image_url,is_active:f('is_active').checked,is_featured:f('is_featured').checked,sort_order:Number(f('sort_order').value||100),show_from:from,show_until:until};
      }
      const query=editing.id?state.client.from(table).update(record).eq('id',editing.id):state.client.from(table).insert(record);
      const {error}=await query;
      if(error) throw error;
      $('#editor-dialog').close();toast('Conteúdo salvo com sucesso.');await refresh();
    }catch(e){toast('Não foi possível salvar: '+(e.message||String(e)));}
    finally{submitLoading(false,'#save-edit','Salvar alterações');}
  }
  async function toggleFeature(id) {
    const ig=state.igs.find(x=>x.id===id);if(!ig)return;
    const {error}=await state.client.from('pacto_igs').update({is_featured:!ig.is_featured}).eq('id',id);
    if(error)throw error;await refresh();toast('Exibição atualizada.');
  }
  async function deleteEntry(id) {
    const isNews=state.view==='news';
    const row=(isNews?state.news:state.igs).find(x=>x.id===id);if(!row)return;
    if(!confirm(`Excluir definitivamente "${row.title||row.name}"? Esta operação não pode ser desfeita.`))return;
    const {error}=await state.client.from(isNews?'pacto_news':'pacto_igs').delete().eq('id',id);
    if(error)throw error;await refresh();toast('Registro excluído.');
  }
  async function importHome() {
    if(!confirm('Importar os cards encontrados na home.html como registros editáveis? Notícias serão importadas como RASCUNHOS para revisão. Registros com o mesmo título/nome serão ignorados.'))return;
    const button=$('#import-home');button.disabled=true;button.textContent='Importando...';
    try {
      const response=await fetch(new URL('../home.html',location.href),{cache:'no-store'});
      if(!response.ok)throw new Error('Não foi possível ler home.html. Use um servidor web, não file://.');
      const doc=new DOMParser().parseFromString(await response.text(),'text/html');
      const homeUrl=new URL('../home.html',location.href);
      const parseImage=(card)=>{
        const src=card.querySelector('img')?.getAttribute('src');
        if(!src || src.startsWith('data:'))return null;
        try{return safeImage(new URL(src,homeUrl).href)||null;}catch{return null;}
      };
      const norm=s=>String(s||'').trim().toLocaleLowerCase(locale);
      const currentNews=new Set(state.news.map(n=>norm(n.title))),currentIgs=new Set(state.igs.map(n=>norm(n.name)));
      const news=[];
      for(const card of doc.querySelectorAll('.noticias__grid .noticia-card')) {
        const title=card.querySelector('.noticia-card__body h3')?.textContent?.trim();
        if(!title||currentNews.has(norm(title)))continue;
        currentNews.add(norm(title));
        const summary=card.querySelector('.noticia-card__body p')?.textContent?.trim()||'';
        const label=card.querySelector('.noticia-card__kind')?.textContent?.trim().toLocaleLowerCase(locale)||'';
        const category=label.includes('evento')?'Evento':label.includes('comunicado')?'Comunicado':'Novidade';
        news.push({title:title.slice(0,180),summary:summary.slice(0,500),content:summary,category,image_url:parseImage(card),is_published:false,published_at:null});
      }
      const igs=[];
      for(const [i,card] of [...doc.querySelectorAll('.igs__grid .ig-card')].entries()) {
        const name=card.querySelector('.ig-card__label h4')?.textContent?.trim();
        if(!name||currentIgs.has(norm(name)))continue;
        currentIgs.add(norm(name));
        const product=card.querySelector('.ig-card__tag')?.textContent?.trim()||'';
        igs.push({name:name.slice(0,180),region:'',product,description:'',image_url:parseImage(card),is_active:true,is_featured:true,sort_order:i+1});
      }
      if(!news.length && !igs.length){toast('Nenhum card novo encontrado para importar.');return;}
      if(news.length) {const {error}=await state.client.from('pacto_news').insert(news);if(error)throw error;}
      if(igs.length){const {error}=await state.client.from('pacto_igs').insert(igs);if(error)throw error;}
      await refresh();toast(`Importados ${news.length} notícias em rascunho e ${igs.length} IGs. Revise os dados antes de ativar a integração.`);
    }catch(e){toast('Falha na importação: '+(e.message||String(e)));}
    finally{button.disabled=false;button.textContent='Importar cards da home';}
  }
  function bindEvents() {
    $('#login-form').addEventListener('submit',async e=>{
      e.preventDefault();$('#login-error').textContent='';
      const b=$('#login-submit');b.disabled=true;b.textContent='Entrando...';
      try {
        const {error}=await state.client.auth.signInWithPassword({email:e.target.elements.namedItem('email').value,password:e.target.elements.namedItem('password').value});
        if(error)throw error;await showWorkspace();
      }catch(err){$('#login-error').textContent=err.message||'Não foi possível entrar.';}
      finally{b.disabled=false;b.innerHTML='Entrar no painel <span>↗</span>';}
    });
    $('#logout').addEventListener('click',async()=>{await state.client.auth.signOut();showOnly('access');});
    $$('.nav-item').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.view)));
    $$('[data-quick]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.quick)));
    $('#mobile-menu').addEventListener('click',()=>$('#workspace').classList.toggle('menu-open'));
    $('#new-item').addEventListener('click',()=>openEditor(state.view==='igs'?'igs':'news'));
    $('#search').addEventListener('input',e=>{state.search=e.target.value.toLocaleLowerCase(locale);renderRecords();});
    $('#records').addEventListener('click',async e=>{
      const b=e.target.closest('[data-action]');if(!b)return;
      const {id,action}=b.dataset;
      try {
        if(action==='edit')openEditor(state.view, (state.view==='news'?state.news:state.igs).find(x=>x.id===id));
        if(action==='delete')await deleteEntry(id);
        if(action==='feature')await toggleFeature(id);
      }catch(err){toast(err.message||'Erro ao alterar registro.');}
    });
    $('#close-dialog').addEventListener('click',()=>$('#editor-dialog').close());
    $('#cancel-edit').addEventListener('click',()=>$('#editor-dialog').close());
    $('#editor-form').addEventListener('submit',saveEditor);
    $('#import-home').addEventListener('click',importHome);
  }
  async function init() {
    bindEvents();
    const c=window.PACTO_CMS;
    if(!c||!/^https:\/\/[^ ]+\.supabase\.co\/?$/.test(c.url||'')||!/^[\w.-]{15,}$/.test(c.anonKey||'')||!window.supabase?.createClient) {
      showOnly('setup');return;
    }
    state.client=window.supabase.createClient(c.url,c.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    try {
      const {data:{session},error}=await state.client.auth.getSession();
      if(error)throw error;
      if(session)await showWorkspace();else showOnly('access');
    }catch(err){showOnly('access');$('#login-error').textContent='Falha na conexão: '+(err.message||'Confira as configurações.');}
  }
  init();
})();
