/* Conecta apenas as grades existentes na home ao conteúdo publicado do CMS.
   Segurança: cria elementos via DOM, sem injetar HTML vindo do banco. */
(() => {
  'use strict';
  const config=window.PACTO_CMS;
  if(!config?.enabled || !window.supabase?.createClient || !/^https:\/\/[^ ]+\.supabase\.co\/?$/.test(config.url||''))return;
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
  async function run(){
    const igGrid=$('.igs__grid'),newsGrid=$('.noticias__grid');
    try {
      // Não tocar nos cards existentes se a conexão ou uma consulta falhar.
      const [igs,news]=await Promise.all([
        client.from('pacto_igs').select('id,name,region,product,image_url,sort_order').eq('is_active',true).eq('is_featured',true).order('sort_order',{ascending:true}),
        client.from('pacto_news').select('id,title,summary,category,image_url,created_at,published_at').eq('is_published',true).order('published_at',{ascending:false}).limit(12)
      ]);
      if(igs.error||news.error)throw igs.error||news.error;
      if(igGrid){igGrid.replaceChildren(...(igs.data||[]).map(buildIG));if(!igs.data?.length)igGrid.append(el('p','cms-empty','Nenhuma indicação geográfica em destaque no momento.'));}
      if(newsGrid){newsGrid.replaceChildren(...(news.data||[]).map(buildNews));if(!news.data?.length)newsGrid.append(el('p','cms-empty','Novas notícias em breve.'));}
      // Tabs antigas eram decorativas. No CMS, filtre publicações de fato.
      document.querySelectorAll('.noticias__tabs button').forEach(button=>{
        button.addEventListener('click',()=>{
          const text=button.textContent.trim().toLocaleLowerCase('pt-BR');
          const category=text.includes('evento')?'evento':text.includes('novidade')?'novidade':text.includes('comunicado')?'comunicado':null;
          newsGrid?.querySelectorAll('.noticia-card').forEach((card,i)=>{
            const n=news.data[i];card.hidden=Boolean(category && n.category.toLocaleLowerCase('pt-BR')!==category);
          });
        });
      });
    }catch(error){console.error('Pacto CMS: conteúdo original preservado pois houve erro na consulta.',error);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
