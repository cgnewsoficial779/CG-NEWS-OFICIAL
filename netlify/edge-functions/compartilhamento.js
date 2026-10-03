export default async (request, context) => {
  const url = new URL(request.url);
  const materiaId = url.searchParams.get("materia");

  // Pega o seu index.html original
  const response = await context.next();
  let html = await response.text();

  // Se não tiver link de matéria, exibe o site normal
  if (!materiaId) {
    return new Response(html, response);
  }

  try {
    // Busca a notícia específica diretamente no seu Firebase
    const firebaseUrl = `https://firestore.googleapis.com/v1/projects/cgnewsoficial7799/databases/(default)/documents/noticias/${materiaId}`;
    
    const fbReq = await fetch(firebaseUrl);
    
    if (fbReq.ok) {
      const data = await fbReq.json();
      const fields = data.fields;
      
      if (fields) {
        const titulo = fields.titulo?.stringValue || "CG NEWS OFICIAL";
        
        let descricao = fields.texto?.stringValue || fields.textoRico?.stringValue || "Leia a matéria completa em nosso portal.";
        descricao = descricao.replace(/<[^>]*>?/gm, '').substring(0, 140) + "...";
        
        const imagem = fields.imagem1?.stringValue || fields.imagem?.stringValue || fields.capa?.stringValue || fields.foto?.stringValue || "";

        // Injeta os dados da matéria por cima do HTML para o WhatsApp/Facebook ler
        html = html.replace(/<title>.*?<\/title>/i, `<title>${titulo}</title>`);
        html = html.replace(/<meta property="og:title" content=".*?">/i, `<meta property="og:title" content="${titulo}">`);
        html = html.replace(/<meta property="og:description" content=".*?">/i, `<meta property="og:description" content="${descricao}">`);
        html = html.replace(/<meta name="twitter:title" content=".*?">/i, `<meta name="twitter:title" content="${titulo}">`);
        html = html.replace(/<meta name="twitter:description" content=".*?">/i, `<meta name="twitter:description" content="${descricao}">`);
        
        // Se a imagem for um link válido (e não um vídeo), injeta na capa
        if (imagem && !imagem.startsWith("data:video")) {
            html = html.replace(/<meta property="og:image" content=".*?">/i, `<meta property="og:image" content="${imagem}">`);
            html = html.replace(/<meta name="twitter:image" content=".*?">/i, `<meta name="twitter:image" content="${imagem}">`);
        }
      }
    }
    
    // Entrega a página formatada para a rede social
    return new Response(html, {
      headers: { "content-type": "text/html;charset=UTF-8" }
    });

  } catch (error) {
    return new Response(html, response); 
  }
};
