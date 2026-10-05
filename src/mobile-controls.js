// Keep the model visible on small screens; full controls remain one tap away.
export function createMobileControls({tr,toggleTour,onLanguage}){
 const panel=document.getElementById('walkPanel'),toggle=document.getElementById('walkCollapse');
 const mobile=()=>matchMedia('(max-width:700px)').matches;
 let timer,menuTimer;
 const menuPanel=document.getElementById('panel');
 function hideMenu(){clearTimeout(menuTimer);menuPanel.classList.add('hidden');}
 function deferMenu(){clearTimeout(menuTimer);if(mobile())menuTimer=setTimeout(hideMenu,5000);}
 function collapse(){clearTimeout(timer);document.body.classList.add('mobile-controls-collapsed');refresh();}
 function defer(){clearTimeout(timer);if(mobile())timer=setTimeout(collapse,5000);}
 function refresh(){const collapsed=document.body.classList.contains('mobile-controls-collapsed');toggle.textContent=collapsed?'＋':'−';toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',tr(collapsed?'Show walking controls':'Hide walking controls'));}
 toggle.onclick=()=>{if(document.body.classList.contains('mobile-controls-collapsed')){document.body.classList.remove('mobile-controls-collapsed');refresh();defer();}else collapse();};
 panel.addEventListener('pointerdown',()=>clearTimeout(timer));panel.addEventListener('pointerup',defer);panel.addEventListener('input',defer);panel.addEventListener('change',defer);
 document.getElementById('menu').addEventListener('click',deferMenu);
 menuPanel.addEventListener('pointerdown',()=>clearTimeout(menuTimer));menuPanel.addEventListener('pointerup',deferMenu);menuPanel.addEventListener('change',deferMenu);
 menuPanel.addEventListener('click',e=>{if(mobile()&&e.target.closest('[data-view],#tourLaunch'))hideMenu();});
 document.getElementById('viewport').addEventListener('pointerdown',()=>{if(mobile()){collapse();document.getElementById('panel').classList.add('hidden');}});
 document.getElementById('compactPause').onclick=toggleTour;
 onLanguage(refresh);
 return {collapse,refresh};
}
