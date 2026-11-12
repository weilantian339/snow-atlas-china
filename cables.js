// A screen-readable suspended cable, projected from actual terrain heights.
// Route geometry is OSM; span height and sag are illustrative.
window.snowAtlasCables=function(map,lines,center){
 const origin=maplibregl.MercatorCoordinate.fromLngLat(center),scale=origin.meterInMercatorCoordinateUnits();
 const paths=lines.map(f=>{const cs=f.geometry.coordinates,out=[];
  for(let i=1;i<cs.length;i++){const a=cs[i-1],b=cs[i],len=Math.hypot((b[0]-a[0])*111200*Math.cos(center[1]*Math.PI/180),(b[1]-a[1])*111200),n=Math.max(1,Math.ceil(len/24));
   for(let j=0;j<n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}
  out.push(cs[cs.length-1]);return out;});
 let dirty=true,last=0,buf,prog,vao,verts=0,uni;
 function changed(e){if(e.sourceId==='dem')dirty=true;}
 map.on('sourcedata',changed);map.on('zoomend',()=>dirty=true);
 function rebuild(gl){
  const v=[];
  for(const path of paths){let travel=0,prev;
   for(const pt of path){const ground=map.queryTerrainElevation(pt)||0,c=maplibregl.MercatorCoordinate.fromLngLat(pt,ground);
    const p=[(c.x-origin.x)/scale,(c.y-origin.y)/scale,c.z/scale];
    if(prev)travel+=Math.hypot(p[0]-prev[0],p[1]-prev[1]);
    p[2]+=16.8-1.3*Math.sin(Math.PI*(travel%125)/125);
    if(prev){for(const [end,side] of [[0,-1],[0,1],[1,-1],[1,-1],[0,1],[1,1]])v.push(...prev,...p,end,side);}
    prev=p;
   }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.DYNAMIC_DRAW);verts=v.length/8;dirty=false;last=performance.now();
 }
 return {id:'continuous-suspended-cables',type:'custom',renderingMode:'3d',
 onAdd(m,gl){
  prog=gl.createProgram();
  for(const [kind,source] of [[gl.VERTEX_SHADER,`#version 300 es
 precision highp float;layout(location=0) in vec3 a;layout(location=1) in vec3 b;layout(location=2) in vec2 corner;
 uniform mat4 matrix;uniform vec2 viewport;uniform float width;
 void main(){vec4 A=matrix*vec4(a,1.),B=matrix*vec4(b,1.);vec2 d=(B.xy/max(.00001,B.w)-A.xy/max(.00001,A.w))*viewport;d/=max(.001,length(d));vec4 P=mix(A,B,corner.x);P.xy+=(vec2(-d.y,d.x)*corner.y*width+d*(corner.x-.5)*1.2)*P.w/viewport;gl_Position=P;}`],[gl.FRAGMENT_SHADER,`#version 300 es
 precision mediump float;out vec4 color;void main(){color=vec4(.40,.22,.105,1.);}`]]){
   const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));gl.attachShader(prog,shader);gl.deleteShader(shader);}
  gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
  uni=['matrix','viewport','width'].map(k=>gl.getUniformLocation(prog,k));vao=gl.createVertexArray();gl.bindVertexArray(vao);buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  for(const [i,n,off] of [[0,3,0],[1,3,12],[2,2,24]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,32,off);}gl.bindVertexArray(null);
 },
 render(gl,args){if(dirty && (!verts||performance.now()-last>140))rebuild(gl);
  const M=args.defaultProjectionData.mainMatrix,local=new Float32Array(16);
  for(let i=0;i<12;i++)local[i]=M[i]*scale;
  for(let i=0;i<4;i++)local[12+i]=M[i]*origin.x+M[4+i]*origin.y+M[12+i];
  gl.useProgram(prog);gl.bindVertexArray(vao);gl.uniformMatrix4fv(uni[0],false,local);gl.uniform2f(uni[1],gl.drawingBufferWidth,gl.drawingBufferHeight);gl.uniform1f(uni[2],Math.max(2.3,Math.min(4.8,map.getZoom()-10))*gl.drawingBufferWidth/map.getCanvas().clientWidth);
  gl.disable(gl.CULL_FACE);gl.drawArrays(gl.TRIANGLES,0,verts);gl.bindVertexArray(null);
 },onRemove(m,gl){map.off('sourcedata',changed);gl.deleteBuffer(buf);gl.deleteVertexArray(vao);gl.deleteProgram(prog);}};
};
