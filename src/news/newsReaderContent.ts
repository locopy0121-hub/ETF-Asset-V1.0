/** Cosmetic ad filtering and a reversible reader surface run inside the article WebView.
 * This never receives private App data, fetches another article or bypasses restricted content.
 * Keep page code as a literal: Hermes function.toString() is not JavaScript source.
 */
const AD_HOSTS=['doubleclick.net','googlesyndication.com','googleadservices.com','adservice.google.com','adnxs.com','taboola.com','outbrain.com','criteo.com'];
export function isNewsAdUrl(value:string):boolean{
 try{const host=new URL(value).hostname.toLowerCase();return AD_HOSTS.some(domain=>host===domain||host.endsWith('.'+domain));}catch{return false;}
}
export type NewsReaderOptions=Readonly<{filter:boolean;mode:'web'|'reader'|'original';title:string}>;
export function buildNewsReaderScript(options:NewsReaderOptions):string{
 const config=JSON.stringify({...options,hosts:AD_HOSTS}).replace(/</g,'\\u003c');
 return '('+PAGE_SCRIPT+')('+config+'); true;';
}
const PAGE_SCRIPT=String.raw`function(config){
 'use strict';
 var KEY='__TF_NEWS_READER_V1__',ROOT='tf-news-reader-surface',STYLE='tf-news-ad-style';
 var old=window[KEY];if(old&&old.dispose)old.dispose();
 var scrollStyles=new Map(),hidden=new Map(),observer=null,queued=false,pending=[],surface=null,frame=null;
 var selectors='ins.adsbygoogle,[id^="google_ads_iframe"],[id^="div-gpt-ad"],[id^="google_ads_"],.ad-slot,.ad-container,.advertisement,.advertising,.ad-overlay,.ad-backdrop,.ad-modal-overlay,.sticky-ad,.adsbygoogle';
 function notify(status){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'tf-news-reader',status:status}));}catch(e){}}
 function isAdUrl(value){try{var host=new URL(value,location.href).hostname.toLowerCase();return config.hosts.some(function(domain){return host===domain||host.endsWith('.'+domain);});}catch(e){return false;}}
 function safeUrl(value){if(!value||!String(value).trim())return '';try{var url=new URL(value,location.href);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch(e){return '';}}
 function insideOwn(node){return !!(node&&node.nodeType===1&&(node.id===ROOT||node.id===STYLE||node.closest('#'+ROOT)));}
 function unlockAdModal(node){
  if(!node.matches('.ad-overlay,.ad-backdrop,.ad-modal-overlay'))return;
  var dialogs=document.querySelectorAll('[aria-modal="true"],dialog[open]');
  if(Array.prototype.some.call(dialogs,function(dialog){return !dialog.matches(selectors)&&!dialog.closest(selectors)&&window.getComputedStyle(dialog).display!=='none';}))return;
  [document.body,document.documentElement].forEach(function(target){
   if(!target)return;
   var css=window.getComputedStyle(target);
   if(css.overflow!=='hidden'&&css.overflowY!=='hidden')return;
   if(!scrollStyles.has(target))scrollStyles.set(target,['overflow','overflow-y'].map(function(name){return [name,target.style.getPropertyValue(name),target.style.getPropertyPriority(name)];}));
   target.style.setProperty('overflow','auto','important');target.style.setProperty('overflow-y','auto','important');
  });
 }
 function hide(node){
  if(!node||node.nodeType!==1||insideOwn(node)||node===document.body||node===document.documentElement||/^(ARTICLE|MAIN)$/.test(node.tagName))return;
  // A selector is admission evidence, not permission to erase an article-sized container.
  if(node.querySelector('article,[itemprop="articleBody"]')||Array.prototype.map.call(node.querySelectorAll('p'),function(p){return p.textContent||'';}).join('').trim().length>180)return;
  if(!hidden.has(node)){
   if(hidden.size>=2000)return;
   hidden.set(node,node.getAttribute('style'));
  }
  node.style.setProperty('display','none','important');unlockAdModal(node);
 }
 function scan(root){
  if(!root||insideOwn(root))return;
  if(root.matches&&root.matches(selectors))hide(root);
  if(root.querySelectorAll)Array.prototype.forEach.call(root.querySelectorAll(selectors),hide);
  var frames=[];if(root.matches&&root.matches('iframe'))frames.push(root);
  if(root.querySelectorAll)frames=frames.concat(Array.prototype.slice.call(root.querySelectorAll('iframe')));
  frames.forEach(function(iframe){
   if(!isAdUrl(iframe.getAttribute('src')||''))return;
   hide(iframe);
   var parent=iframe.parentElement;
   for(var i=0;parent&&i<3;i++,parent=parent.parentElement){
    if(parent===document.body||parent===document.documentElement||parent.matches('article,main,[itemprop="articleBody"]'))break;
    var css=window.getComputedStyle(parent);
    if((css.position==='fixed'||css.position==='sticky')&&(parent.textContent||'').trim().length<180)hide(parent);
   }
  });
 }
 function drain(){queued=false;frame=null;var roots=pending;pending=[];if(observer)observer.disconnect();roots.slice(0,200).forEach(scan);if(observer&&document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['id','class','src']});}
 function onMutation(records){
  records.forEach(function(record){
   if(record.type==='attributes'){if(!insideOwn(record.target))pending.push(record.target);}
   else Array.prototype.forEach.call(record.addedNodes,function(node){if(node.nodeType===1&&!insideOwn(node))pending.push(node);});
  });
  if(pending.length&&!queued){queued=true;frame=requestAnimationFrame(drain);}
 }
 function dispose(){
  if(observer){observer.disconnect();observer=null;}
  if(frame!==null)cancelAnimationFrame(frame);frame=null;pending=[];
  hidden.forEach(function(style,node){if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);});hidden.clear();
  scrollStyles.forEach(function(props,node){props.forEach(function(prop){if(prop[1])node.style.setProperty(prop[0],prop[1],prop[2]);else node.style.removeProperty(prop[0]);});});scrollStyles.clear();
  var el=document.getElementById(ROOT);if(el)el.remove();
  window.removeEventListener('pagehide',dispose);window[KEY]=null;
 }
 window[KEY]={dispose:dispose};window.addEventListener('pagehide',dispose,{once:true});
 if(config.mode==='original'){notify('original');return;}
 if(config.filter){scan(document.documentElement);observer=new MutationObserver(onMutation);observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['id','class','src']});}
 if(config.mode!=='reader'){notify('filtered');return;}
 var candidates=document.querySelectorAll('[itemprop="articleBody"],article,.article__content,.article_content,.article-content,.article-body,.content_body,.story__content,#news_detail_div,#news_content,.newsdetail_content,main');
 var selected=null,best=0;
 Array.prototype.forEach.call(candidates,function(node){
  var paragraphs=node.querySelectorAll('p');var text=Array.prototype.map.call(paragraphs,function(p){return (p.textContent||'').trim();}).join('\n');
  var links=Array.prototype.map.call(node.querySelectorAll('a'),function(a){return (a.textContent||'').length;}).reduce(function(a,b){return a+b;},0);
  if(text.length>=180&&links<text.length*.5&&text.length>best){best=text.length;selected=node;}
 });
 if(!selected){notify('unavailable');return;}
 var originalTitle=document.querySelector('h1');var title=originalTitle&&(originalTitle.textContent||'').trim()||config.title||document.title;
 function substantial(node){return Array.prototype.map.call(node.querySelectorAll('p'),function(p){return p.textContent||'';}).join('').trim().length>180;}
 var visited=0;
 function imageSource(node){
  var picture=node.closest('picture'),source=picture&&picture.querySelector('source[srcset]');
  var srcset=node.getAttribute('srcset')||node.getAttribute('data-srcset')||(source&&source.getAttribute('srcset'))||'';
  var choices=[node.getAttribute('data-src'),node.getAttribute('data-original'),node.currentSrc,srcset.split(',')[0].trim().split(/\s+/)[0],node.getAttribute('src')];
  for(var i=0;i<choices.length;i++){var url=safeUrl(choices[i]||'');if(url&&!isAdUrl(url))return url;}return '';
 }
 function copyContent(node){
  if(++visited>10000)return null;
  if(node.nodeType===3)return document.createTextNode(node.nodeValue||'');
  if(node.nodeType!==1)return null;
  if(/^(SCRIPT|STYLE|IFRAME|FORM|BUTTON|NAV|ASIDE|INPUT|NOSCRIPT|TEMPLATE|OBJECT|EMBED|SOURCE|H1)$/.test(node.tagName)||node.hidden||node.getAttribute('aria-hidden')==='true')return null;
  if(node.matches(selectors)&&!substantial(node))return null;
  var css=window.getComputedStyle(node);if(css.display==='none'||css.visibility==='hidden')return null;
  if(node.tagName==='IMG'){
   var src=imageSource(node);if(!src)return null;
   var img=document.createElement('img');img.src=src;img.alt=node.getAttribute('alt')||'';img.loading='lazy';return img;
  }
  var tag=/^(P|DIV|SECTION|H2|H3|H4|H5|H6|BLOCKQUOTE|UL|OL|LI|FIGURE|FIGCAPTION|TABLE|THEAD|TBODY|TR|TH|TD|STRONG|B|EM|I|SPAN|A|BR|HR|TIME)$/.test(node.tagName)?node.tagName.toLowerCase():'div';
  var out=document.createElement(tag);
  if(tag==='a'){var href=safeUrl(node.getAttribute('href')||'');if(href){out.href=href;out.rel='noopener noreferrer';}}
  Array.prototype.forEach.call(node.childNodes,function(child){var safe=copyContent(child);if(safe)out.appendChild(safe);});return out;
 }
 var copied=copyContent(selected);
 if(!copied||(copied.textContent||'').trim().length<180||visited>10000){notify('unavailable');return;}
 surface=document.createElement('div');surface.id=ROOT;
 surface.style.cssText='position:fixed!important;inset:0!important;z-index:2147483647!important;background:#ffffff!important;color:#16232b!important;overflow:auto!important;overscroll-behavior:contain!important;opacity:1!important;filter:none!important;display:block!important;';
 var shadow=surface.attachShadow?surface.attachShadow({mode:'open'}):surface;
 var style=document.createElement('style');style.textContent=':host{color-scheme:light!important;}*{box-sizing:border-box}main{max-width:760px;margin:0 auto;padding:24px 20px 64px;background:#fff;color:#16232b;font:18px/1.85 system-ui,sans-serif;overflow-wrap:anywhere}h1{font-size:27px;line-height:1.4;margin:0 0 16px}h2,h3,h4{line-height:1.5}p{margin:0 0 20px}img{display:block;max-width:100%;height:auto;margin:18px auto}a{color:#087c71}small,figcaption{font-size:14px;color:#596a72}table{border-collapse:collapse;max-width:100%;width:100%;font-size:15px}td,th{border:1px solid #dce5e4;padding:7px;overflow-wrap:anywhere}figure{margin:16px 0}blockquote{border-left:3px solid #5aa79a;padding-left:12px;margin-left:0}';shadow.appendChild(style);
 var main=document.createElement('main'),heading=document.createElement('h1'),source=document.createElement('small');
 heading.textContent=title;source.textContent=location.hostname+' · 純閱讀模式';main.appendChild(heading);main.appendChild(source);
 main.appendChild(copied);
 shadow.appendChild(main);document.documentElement.appendChild(surface);notify('reader');
}`;
