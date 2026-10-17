import {initI18n,localizedPortalUrl} from './i18n.js?v=20261017';
initI18n();
const style=document.createElement('link');style.rel='stylesheet';style.href='/web/portal/site-v2.css?v=2';document.head.append(style);
document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(link)link.href=localizedPortalUrl(link.getAttribute('href'),location.href);},true);
