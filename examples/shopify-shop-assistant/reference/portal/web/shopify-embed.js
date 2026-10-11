// Same-origin host for the published player; the merchant receives sizing only.
const child=document.createElement('iframe'),target=new URL(location.href);
target.searchParams.set('view','true');child.src=target.href;
child.title='Kasamila Shopify';child.allow='microphone; autoplay';child.referrerPolicy='no-referrer';
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==child.contentWindow||event.data?.type!=='kasamila-shop-panel'||typeof event.data.expanded!=='boolean')return;
 parent.postMessage({type:'kasamila-shop-panel',expanded:event.data.expanded},'*');
});
document.body.append(child);
