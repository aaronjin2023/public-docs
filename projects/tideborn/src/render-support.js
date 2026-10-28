export function openGraphicsContext(canvas, lightweight) {
  let reason='';
  const creationError=event=>{reason=event.statusMessage||'';};
  canvas.addEventListener('webglcontextcreationerror',creationError);
  try {
    const open=light=>canvas.getContext('webgl2',{
      alpha:false,antialias:!light,powerPreference:light?'default':'high-performance',
    });
    let context=open(lightweight);
    // A driver can reject the requested attributes while still providing WebGL 2.
    if(!context&&!lightweight){lightweight=true;context=open(true);}
    if(!context){
      const error=new Error(reason||'浏览器没有返回 WebGL 2 绘图上下文。');
      error.code='WEBGL_CONTEXT_UNAVAILABLE';throw error;
    }
    return {context,lightweight};
  } finally {
    canvas.removeEventListener('webglcontextcreationerror',creationError);
  }
}
