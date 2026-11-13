(()=>{
const lang=localStorage.getItem('snow-language')||'zh',txt=(z,e,j)=>lang==='en'?e:lang==='ja'?j:z;
const style=document.createElement('style');style.textContent=`
.extra-button,.extra-select{background:#f6f5ee;color:#294653;border:1px solid #b8c9cd;border-radius:7px;padding:9px 12px;font:12px system-ui;cursor:pointer}
#tea-button{position:fixed;right:18px;bottom:24px;z-index:10;background:#d2ac7c;color:#182f3c}
#tea-dialog{border:0;border-radius:16px;padding:20px;max-width:min(360px,90vw);color:#294653;background:#fffdf8}#tea-dialog::backdrop{background:#0a202ab8}#tea-dialog img{display:block;max-height:55vh;width:100%;object-fit:contain;margin:12px 0}#tea-dialog button{margin:4px}
.scene-extras{position:fixed;right:18px;bottom:120px;z-index:12;display:flex;gap:6px}.share-status{position:fixed;right:18px;bottom:165px;background:#fffdf3;color:#294653;padding:8px;border-radius:7px;z-index:20}
@media(max-width:600px){.scene-extras{bottom:115px;right:10px}.extra-select,.extra-button{padding:8px;font-size:11px}}`;document.head.append(style);
if(!document.getElementById('map')){
 const button=document.createElement('button');button.id='tea-button';button.className='extra-button';button.textContent=txt('请地图君喝奶茶','Buy the map maker a tea','地図作者にミルクティーを');
 const dialog=document.createElement('dialog');dialog.id='tea-dialog';
 const title=document.createElement('strong');title.textContent=button.textContent;
 const img=document.createElement('img');img.src='./assets/milk-tea-qr.jpg';img.alt=txt('收款二维码','Payment QR code','支払いQRコード');
 const save=document.createElement('button');save.className='extra-button';save.textContent=txt('保存收款码','Save QR code','QRコードを保存');
 const note=document.createElement('p');note.style.fontSize='12px';
 save.onclick=async()=>{try{const blob=await(await fetch(img.src)).blob();const file=new File([blob],'snow-atlas-qr.jpg',{type:'image/jpeg'});
 if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:button.textContent});return;}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='snow-atlas-qr.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);note.textContent=txt('也可长按二维码，选择保存到照片。','You can also hold the image to save it.','画像を長押しして保存できます。');
 }catch(e){if(e.name!=='AbortError')note.textContent=txt('请长按二维码，选择保存到照片。','Hold the QR image to save it.','QR画像を長押しして保存してください。');}};
 const close=document.createElement('button');close.className='extra-button';close.textContent=txt('关闭','Close','閉じる');close.onclick=()=>dialog.close();dialog.append(title,img,save,close,note);document.body.append(button,dialog);button.onclick=()=>dialog.showModal();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}
})();

