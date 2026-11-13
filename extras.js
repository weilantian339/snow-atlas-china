(()=>{
const lang=localStorage.getItem('snow-language')||'zh',txt=(z,e,j)=>lang==='en'?e:lang==='ja'?j:z;
if(!document.getElementById('map')){
 const button=document.createElement('button');button.id='tea-button';button.className='extra-button';button.textContent=txt('请地图君喝奶茶','Buy the map maker a tea','地図作者にミルクティーを');
 const dialog=document.createElement('dialog');dialog.id='tea-dialog';
 const title=document.createElement('strong');title.id='tea-title';dialog.setAttribute('aria-labelledby','tea-title');title.textContent=button.textContent;
 const img=document.createElement('img');img.src='./assets/milk-tea-qr.jpg';img.alt=txt('收款二维码','Payment QR code','支払いQRコード');
 const save=document.createElement('button');save.className='extra-button';save.textContent=txt('保存收款码','Save QR code','QRコードを保存');
 const note=document.createElement('p');note.style.fontSize='12px';
 save.onclick=async()=>{try{const blob=await(await fetch(img.src)).blob();const file=new File([blob],'snow-atlas-qr.jpg',{type:'image/jpeg'});
 if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:button.textContent});return;}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='snow-atlas-qr.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);note.textContent=txt('也可长按二维码，选择保存到照片。','You can also hold the image to save it.','画像を長押しして保存できます。');
 }catch(e){if(e.name!=='AbortError')note.textContent=txt('请长按二维码，选择保存到照片。','Hold the QR image to save it.','QR画像を長押しして保存してください。');}};
 const close=document.createElement('button');close.className='extra-button';close.textContent=txt('关闭','Close','閉じる');close.onclick=()=>dialog.close();const actions=document.createElement('div');actions.className='tea-actions';actions.append(save,close);dialog.append(title,img,actions,note);document.body.append(button,dialog);button.onclick=()=>dialog.showModal();dialog.addEventListener('close',()=>button.focus({preventScroll:true}));dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}
})();

