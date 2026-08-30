// disponibilidade.js
// Busca a planilha do Google (publicada como CSV) e marca no site
// quais itens estão indisponíveis no dia.

// Cole aqui o link gerado em: Arquivo > Compartilhar > Publicar na Web > CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2MpscKa1XLjukgK_pl_HHz6EDAv-wsEenAF5zIvpQBx2lqNt4gPhFdGvmo4_2OXeBsLlOg4Bb7sEL/pub?gid=0&single=true&output=csv";

async function aplicarDisponibilidade() {
  try {
    // O "t=" evita que o navegador/Google sirva uma versão em cache antiga
    const url = `${SHEET_CSV_URL}&t=${Date.now()}`;
    const resposta = await fetch(url);
    const textoCSV = await resposta.text();

    // Transforma o CSV em um mapa: { "Torta - Limão": true, "Torta - Brigadeiro": false, ... }
    const linhas = textoCSV.trim().split("\n").slice(1); // remove o cabeçalho
    const disponibilidade = {};

    linhas.forEach((linha) => {
      const colunas = linha.split(",");
      const nome = colunas[0]?.trim().replace(/^"|"$/g, "");
      const status = colunas[1]?.trim().toUpperCase();
      if (nome) disponibilidade[nome] = status === "SIM";
    });

    // Percorre todos os botões "Pedir" da página e desabilita os indisponíveis
    document.querySelectorAll(".btn-pedir").forEach((botao) => {
      const nomeItem = botao.dataset.name;
      const disponivel = disponibilidade[nomeItem];

      // Se o item não estiver na planilha, assume disponível (não mexe em nada)
      if (disponivel === false) {
        botao.disabled = true;
        botao.textContent = "Indisponível hoje";

        const card = botao.closest(".card");  //picture.doces, picture.gelatos, (adicionar esses elementos dentro de .closest se quiser marcar os cards em cinza)
        if (card) card.classList.add("indisponivel");
      }
    });
  } catch (erro) {
    console.error("Não foi possível carregar a disponibilidade do dia:", erro);
  }
}

document.addEventListener("DOMContentLoaded", aplicarDisponibilidade);
