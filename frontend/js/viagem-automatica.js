// Movimento visual sobre a geometria existente; não representa GPS real.
(function () {
  const duracaoMs = 150000;
  function preparar(coords, projetar) {
    if (!Array.isArray(coords) || coords.length < 2 || coords.some(c =>
      !Array.isArray(c) || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1]))) return null;
    const pontos = coords.map(projetar);
    if (pontos.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
    const distancias = [0];
    for (let i = 1; i < pontos.length; i++) {
      distancias.push(distancias[i - 1] + Math.hypot(pontos[i].x - pontos[i - 1].x, pontos[i].y - pontos[i - 1].y));
    }
    const total = distancias[distancias.length - 1];
    return total > 0 ? { pontos, distancias, total } : null;
  }
  function posicao(trajeto, decorridoMs) {
    // O horário da viagem vem do servidor. Recarregar a página não reinicia
    // o percurso; ao chegar, aguarda o motorista encerrar a viagem.
    const tempo = Number.isFinite(decorridoMs) ? Math.max(0, decorridoMs) : 0;
    const alvo = trajeto.total * Math.min(tempo / duracaoMs, 1);
    let i = 1;
    while (i < trajeto.distancias.length - 1 && trajeto.distancias[i] < alvo) i++;
    const tamanho = trajeto.distancias[i] - trajeto.distancias[i - 1];
    const fracao = tamanho ? (alvo - trajeto.distancias[i - 1]) / tamanho : 0;
    const a = trajeto.pontos[i - 1], b = trajeto.pontos[i];
    return { x: a.x + (b.x - a.x) * fracao, y: a.y + (b.y - a.y) * fracao };
  }
  window.ValeBusViagemAutomatica = { preparar, posicao, duracaoMs };
})();
