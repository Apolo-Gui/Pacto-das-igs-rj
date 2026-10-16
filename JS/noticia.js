(() => {
  'use strict';
  const root=document.querySelector('#article-root');
  const cfg=window.PACTO_CMS;
  const id=new URLSearchParams(location.search).get('id');
  const invalid=()=>{root.textContent='Esta notícia não está disponível.';};
  if(!cfg?.enabled||!window.supabase?.createClient||!id||!/^[0-9a-f-]{36}$/i.test(id)){invalid();return;}
  const client=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
  client.from('pacto_news').select('title,summary,content,category,image_url,published_at,created_at').eq('id',id).eq('is_published',true).single()
    .then(({data,error})=>{
      if(error||!data){invalid();return;}
      document.title=data.title+' | Pacto das IGs';
      root.replaceChildren();
      const eyebrow=document.createElement('p');eyebrow.className='article-kicker';eyebrow.textContent=data.category+' • '+new Date(data.published_at||data.created_at).toLocaleDateString('pt-BR');
      const title=document.createElement('h1');title.textContent=data.title;
      const summary=document.createElement('p');summary.className='article-summary';summary.textContent=data.summary||'';
      root.append(eyebrow,title,summary);
      if(data.image_url){try{
        const u=new URL(data.image_url,location.href);
        if(['https:','http:'].includes(u.protocol)){
          const image=document.createElement('img');image.className='article-image';image.src=u.href;image.alt=data.title;root.append(image);
        }
      }catch{/* imagem opcional */}}
      const content=document.createElement('div');content.className='article-content';content.textContent=data.content||data.summary||'';root.append(content);
    }).catch(invalid);
})();
