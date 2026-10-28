export default `
三维画质|3D quality|Calidad 3D|Qualité 3D|جودة العرض ثلاثي الأبعاد|3D画質
跟随设备|Automatic|Automática|Automatique|تلقائية|端末に合わせる
轻量三维|Light 3D|3D ligero|3D allégée|عرض ثلاثي الأبعاد خفيف|軽量3D
标准三维|Standard 3D|3D estándar|3D standard|عرض ثلاثي الأبعاد قياسي|標準3D
两种画质使用同一个立体世界。轻量版关闭动态阴影，降低绘图负担；画风、城镇与模拟保留。切换前保存并重新载入。|Both modes use the same 3D world. Light mode disables dynamic shadows and reduces rendering work; art styles, towns and simulation remain. Switching saves and reloads.|Ambos modos usan el mismo mundo 3D. El modo ligero desactiva sombras dinámicas y reduce la carga; conserva estilos, ciudades y simulación. Al cambiar se guarda y recarga.|Les deux modes utilisent le même monde 3D. Le mode allégé désactive les ombres dynamiques et réduit le rendu ; styles, villes et simulation sont conservés. Le changement sauvegarde et recharge.|يستخدم الوضعان العالم الثلاثي الأبعاد نفسه. يعطل الوضع الخفيف الظلال الديناميكية ويقلل عبء الرسم، مع الحفاظ على الأنماط والمدن والمحاكاة. يحفظ التبديل العالم ويعيد التحميل.|どちらも同じ立体世界です。軽量版は動的な影と描画負荷を抑え、画風・町・シミュレーションを保ちます。切り替え時に保存して再読み込みします。
绘图连接中断|Graphics connection interrupted|Conexión gráfica interrumpida|Connexion graphique interrompue|انقطع اتصال الرسوم|描画接続が中断されました
三维绘图连接已中断。当前世界仍保留，可保存后重试。|The 3D graphics connection was interrupted. Your current world is retained; save it before retrying.|Se interrumpió la conexión gráfica 3D. El mundo actual se conserva; guárdalo antes de reintentar.|La connexion graphique 3D a été interrompue. Le monde actuel est conservé ; sauvegardez avant de réessayer.|انقطع اتصال الرسوم ثلاثية الأبعاد. عالمك الحالي محفوظ في الصفحة؛ احفظه قبل إعادة المحاولة.|3D描画の接続が中断されました。現在の世界は保持されています。保存してから再試行できます。
三维画面已暂停。|The 3D view is paused.|La vista 3D está en pausa.|La vue 3D est en pause.|العرض ثلاثي الأبعاد متوقف مؤقتًا.|3D画面を一時停止しました。
`.trim().split('\n').map(line=>line.split('|'));
