export default async (request, context) => {
  const url = new URL(request.url);
  const materiaId = url.searchParams.get("materia");

  // Pega o seu index.html original
  const response = await context.next();
  let html = await response.text();

  // Se for a página inicial (sem link de matéria), mostra o site normal
  if (!materiaId) {
    return new Response(html, response);
  }

  try {
    // Vai no seu banco de dados do Firebase via API buscar a notícia específica
    const firebaseUrl = `https://firestore.googleapis.com/v1/projects/cgnewsoficial7799/databases/(default)/documents/noticias/${materiaId}`;
    const fbReq = await fetch(firebaseUrl);
    
    if (fbReq.ok) {
      const data = await fbReq.json();
      const fields = data.fields;
      
      if (fields) {
        // Extrai o título
        const titulo = fields.titulo?.stringValue || "CG NEWS OFICIAL - Informação em Tempo Real";
        
        // Extrai o texto e corta para fazer o resumo do WhatsApp
        let descricao = fields.texto?.stringValue || fields.textoRico?.stringValue || "Leia a matéria completa em nosso portal.";
        descricao = descricao.replace(/<[^>]*>?/gm, '').substring(0, 140) + "...";
        
        // Extrai a imagem da capa (ignora se for vídeo)
        const imagem = fields.imagem1?.stringValue || fields.imagem?.stringValue || fields.capa?.stringValue || fields.foto?.stringValue || "";

        // Carimba os dados da notícia por cima do HTML original para o robô ler
        html = html.replace(/<title>.*?<\/title>/i, `<title>${titulo}</title>`);
        html = html.replace(/<meta property="og:title" content=".*?">/i, `<meta property="og:title" content="${titulo}">`);
        html = html.replace(/<meta property="og:description" content=".*?">/i, `<meta property="og:description" content="${descricao}">`);
        html = html.replace(/<meta name="twitter:title" content=".*?">/i, `<meta name="twitter:title" content="${titulo}">`);
        html = html.replace(/<meta name="twitter:description" content=".*?">/i, `<meta name="twitter:description" content="${descricao}">`);
        
        if (imagem && !imagem.startsWith("data:video")) {
            html = html.replace(/<meta property="og:image" content=".*?">/i, `<meta property="og:image" content="${imagem}">`);
            html = html.replace(/<meta name="twitter:image" content=".*?">/i, `<meta name="twitter:image" content="${imagem}">`);
        }
      }
    }
    
    // Entrega a página formatada com a foto para as Redes Sociais
    return new Response(html, {
      headers: { "content-type": "text/html;charset=UTF-8" }
    });

  } catch (error) {
    // Se der erro, entrega o site normalmente
    return new Response(html, response); 
  }
};
