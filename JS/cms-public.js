/* Notícias publicadas: quatro cards na home e arquivo paginado. IGs em destaque.
   Segurança: cria elementos via DOM, sem injetar HTML vindo do banco. */
(() => {
  'use strict';
  const config=window.PACTO_CMS;
  if(!config?.enabled || !window.supabase?.createClient || !/^https:\/\/[^ ]+\.supabase\.co\/?$/.test(config.url||'')){
    const status=document.querySelector('#noticias-status');
    if(status)status.textContent='As notícias estão temporariamente indisponíveis.';
    document.querySelector('#noticias-grid')?.setAttribute('aria-busy','false');
    const button=document.querySelector('#noticias-todas');
    if(button)button.hidden=true;
    return;
  }
  const client=window.supabase.createClient(config.url,config.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const $=(q)=>document.querySelector(q);
  const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
  const assetURL=(value)=>{
    if(!value)return '';
    try{const u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}
  };
  const makeImg=(src,alt)=>{const img=el('img');img.loading='lazy';img.src=src;img.alt=alt;return img;};

  function buildIG(ig){
    const card=el('article','ig-card'), media=el('div','ig-card__media');
    const image=assetURL(ig.image_url);
    if(image)media.append(makeImg(image,ig.name));
    else media.append(el('div','cms-no-photo','Imagem em breve'));
    const label=el('div','ig-card__label');
    label.append(el('div','ig-card__tag',ig.product||ig.region||'Indicação geográfica'));
    label.append(el('h4','',ig.name));
    if(ig.region)label.append(el('p','cms-ig-region',ig.region));
    card.append(media,label);
    return card;
  }
  function buildNews(news){
    const cat=(news.category||'Novidade').toLocaleLowerCase('pt-BR');
    const kind=cat==='evento'?'evento':'novidade';
    const card=el('article','noticia-card noticia-card--'+kind);
    const media=el('div','noticia-card__media');
    const image=assetURL(news.image_url);
    if(image)media.append(makeImg(image,news.title));
    const publication=new Date(news.published_at||news.created_at);
    if(!Number.isNaN(publication.getTime())){
      const date=el('div','noticia-card__date');
      const n=el('b','',publication.toLocaleDateString('pt-BR',{day:'2-digit'}));
      const m=el('span','',publication.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''));
      date.append(n,m);media.append(date);
    }
    const body=el('div','noticia-card__body');
    body.append(el('span','noticia-card__kind',news.category||'Novidade'));
    const heading=el('h3'),link=el('a');
    link.href='noticia.html?id='+encodeURIComponent(news.id);link.textContent=news.title;
    heading.append(link);body.append(heading);
    body.append(el('p','',news.summary||''));
    const footer=el('div','noticia-card__meta');
    const more=el('a','cms-readmore','Ler notícia ↗');more.href=link.href;footer.append(more);body.append(footer);
    card.append(media,body);return card;
  }
  const pageSize=12;
  let category='', page=0, total=0, homeRequest=0, archiveRequest=0, archiveLoading=false;

  function newsQuery(count=false){
    let query=client.from('pacto_news')
      .select('id,title,summary,category,image_url,created_at,published_at',count?{count:'exact'}:{})
      .eq('is_published',true);
    if(!count && category)query=query.eq('category',category);
    return query.order('published_at',{ascending:false,nullsFirst:false})
      .order('created_at',{ascending:false}).order('id',{ascending:false});
  }

  async function loadHome(){
    const grid=$('#noticias-grid'),status=$('#noticias-status');
    if(!grid)return;
    const request=++homeRequest;
    grid.setAttribute('aria-busy','true');
    status.textContent='Carregando notícias...';
    // Não deixar cards de uma categoria anterior sob o novo filtro.
    grid.replaceChildren();
    try{
      const {data,error}=await newsQuery().limit(4);
      if(error)throw error;
      if(request!==homeRequest)return;
      grid.replaceChildren(...(data||[]).map(buildNews));
      status.textContent=data?.length?'':'Nenhuma notícia publicada nesta categoria.';
    }catch(error){
      if(request!==homeRequest)return;
      status.textContent='Não foi possível carregar as notícias. Tente novamente em instantes.';
      console.error('Pacto CMS: falha ao carregar notícias.',error);
    }finally{
      if(request===homeRequest)grid.setAttribute('aria-busy','false');
    }
  }

  function updatePagination(){
    $('#noticias-pagina').textContent=total?'Página '+(page+1)+' de '+Math.ceil(total/pageSize):'';
    $('#noticias-anterior').disabled=archiveLoading || page===0;
    $('#noticias-proxima').disabled=archiveLoading || (page+1)*pageSize>=total;
  }

  async function loadArchive(){
    const grid=$('#noticias-arquivo-grid'),status=$('#noticias-arquivo-status');
    const request=++archiveRequest;
    archiveLoading=true;
    grid.replaceChildren();
    grid.setAttribute('aria-busy','true');
    status.textContent='Carregando notícias...';
    updatePagination();
    try{
      const {data,count,error}=await newsQuery(true).range(page*pageSize,(page+1)*pageSize-1);
      if(error)throw error;
      if(request!==archiveRequest)return;
      total=count||0;
      // Se uma publicação foi removida enquanto a janela estava aberta.
      if(page>0 && page*pageSize>=total){
        page=Math.max(0,Math.ceil(total/pageSize)-1);
        return loadArchive();
      }
      grid.replaceChildren(...(data||[]).map(buildNews));
      status.textContent=data?.length?'':'Nenhuma notícia publicada por enquanto.';
    }catch(error){
      if(request!==archiveRequest)return;
      total=0;
      status.textContent='Não foi possível carregar as notícias. Feche e abra a janela para tentar novamente.';
      console.error('Pacto CMS: falha ao carregar arquivo.',error);
    }finally{
      if(request===archiveRequest){
        archiveLoading=false;
        grid.setAttribute('aria-busy','false');
        updatePagination();
      }
    }
  }

  async function loadIGs(){
    const grid=$('.igs__grid');
    if(!grid)return;
    try{
      const {data,error}=await client.from('pacto_igs')
        .select('id,name,region,product,image_url,sort_order')
        .eq('is_active',true).eq('is_featured',true).order('sort_order',{ascending:true});
      if(error)throw error;
      grid.replaceChildren(...(data||[]).map(buildIG));
      if(!data?.length)grid.append(el('p','cms-empty','Nenhuma indicação geográfica em destaque no momento.'));
    }catch(error){
      console.error('Pacto CMS: indicações originais preservadas.',error);
    }
  }

  function run(){
    if(!$('#noticias-grid'))return;
    const dialog=$('#noticias-dialog');
    document.querySelectorAll('.noticias__tabs button').forEach(button=>{
      button.addEventListener('click',()=>{
        category=button.dataset.category||'';
        document.querySelectorAll('.noticias__tabs button').forEach(tab=>{
          const selected=tab===button;
          tab.classList.toggle('active',selected);
          tab.setAttribute('aria-pressed',String(selected));
        });
        loadHome();
      });
    });
    $('#noticias-todas').addEventListener('click',()=>{
      page=0;
      dialog.showModal();
      loadArchive();
    });
    $('#noticias-fechar').addEventListener('click',()=>dialog.close());
    $('#noticias-anterior').addEventListener('click',()=>{
      if(page>0 && !archiveLoading){page--;dialog.scrollTop=0;loadArchive();}
    });
    $('#noticias-proxima').addEventListener('click',()=>{
      if((page+1)*pageSize<total && !archiveLoading){page++;dialog.scrollTop=0;loadArchive();}
    });
    // Reconsulta ao voltar do painel, sem cadastro manual no HTML.
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){loadHome();if(dialog.open)loadArchive();}
    });
    loadHome();
    loadIGs();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
