// bitcoin-stats-analyzer.js
const axios = require("axios");
const fs = require("fs");

class BitcoinStatsAnalyzer {
  constructor() {
    this.data = [];
    // API Key do CoinGecko
    this.API_KEY = "CG-JWCiJUEaPta2xSZNAAMocVKg";
  }

  // Buscar dados históricos do Bitcoin dos últimos 90 dias hora a hora
  async fetchBitcoinData(days = 90) {
    try {
      console.log(`📊 Buscando dados do Bitcoin dos últimos ${days} dias (hora a hora)...`);

      // Para períodos ≤90 dias, a API retorna dados horários automaticamente
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart`, {
        params: {
          vs_currency: "usd",
          days: days,
          // SEM parâmetro interval - dados horários automáticos para ≤90 dias
        },
        headers: {
          "x-cg-demo-api-key": this.API_KEY,
          Accept: "application/json",
        },
      });

      // Extrair apenas os preços (dados horários)
      let rawData = response.data.prices.map((price) => price[1]);

      // Garantir exatamente o número esperado de dados (days * 24 horas)
      const expectedDataPoints = days * 24;

      console.log(`📊 Dados brutos coletados: ${rawData.length}`);
      console.log(`📊 Dados esperados: ${expectedDataPoints}`);

      if (rawData.length > expectedDataPoints) {
        // Se tiver dados extras, pegar os mais recentes (últimos N dados)
        this.data = rawData.slice(-expectedDataPoints);
        console.log(
          `✂️  Ajustado para exatos ${expectedDataPoints} dados (removidos ${
            rawData.length - expectedDataPoints
          } dados extras)`
        );
      } else if (rawData.length < expectedDataPoints) {
        // Se tiver menos dados, usar todos disponíveis
        this.data = rawData;
        console.log(`⚠️  Dados insuficientes: ${rawData.length} de ${expectedDataPoints} esperados`);
      } else {
        // Se tiver exatamente a quantidade esperada
        this.data = rawData;
        console.log(`✅ Dados perfeitos: exatos ${expectedDataPoints} dados coletados`);
      }

      console.log(`✅ Total final de dados: ${this.data.length}`);
      console.log(`✅ Frequência: Dados horários`);
      console.log(`✅ Período: ${days} dias`);
      console.log(`✅ Meta de 1000+ dados: ${this.data.length >= 1000 ? "✅ ATINGIDA" : "❌ NÃO ATINGIDA"}`);

      return this.data;
    } catch (error) {
      console.error("❌ Erro ao buscar dados:", error.message);
      if (error.response) {
        console.error(`❌ Status HTTP: ${error.response.status}`);
        console.error(`❌ Mensagem: ${error.response.statusText}`);
        if (error.response.data) {
          console.error(`❌ Detalhes:`, error.response.data);
        }
      }
      throw error;
    }
  }

  // Calcular todas as estatísticas
  calculateStatistics() {
    if (this.data.length === 0) {
      throw new Error("Nenhum dado disponível. Execute fetchBitcoinData() primeiro.");
    }

    const sortedData = [...this.data].sort((a, b) => a - b);
    const n = this.data.length;

    // 1. Amplitude
    const amplitude = Math.max(...this.data) - Math.min(...this.data);

    // 2. Média Aritmética Simples
    const mediaAritmetica = this.data.reduce((sum, value) => sum + value, 0) / n;

    // 3. Moda (valor mais frequente)
    const moda = this.calculateMode();

    // 4. Mediana
    const mediana = n % 2 === 0 ? (sortedData[n / 2 - 1] + sortedData[n / 2]) / 2 : sortedData[Math.floor(n / 2)];

    // 5. Variância Populacional
    const varianciaPopulacional = this.data.reduce((sum, value) => sum + Math.pow(value - mediaAritmetica, 2), 0) / n;

    // 6. Variância Amostral
    const varianciaAmostral = this.data.reduce((sum, value) => sum + Math.pow(value - mediaAritmetica, 2), 0) / (n - 1);

    // 7. Desvio Padrão Populacional
    const desvioPadraoPopulacional = Math.sqrt(varianciaPopulacional);

    // 8. Desvio Padrão Amostral
    const desvioPadraoAmostral = Math.sqrt(varianciaAmostral);

    // 9. Coeficiente de Variação Populacional
    const coeficienteVariacaoPopulacional = (desvioPadraoPopulacional / mediaAritmetica) * 100;

    // 10. Coeficiente de Variação Amostral
    const coeficienteVariacaoAmostral = (desvioPadraoAmostral / mediaAritmetica) * 100;

    return {
      dadosBasicos: {
        totalDados: n,
        valorMinimo: Math.min(...this.data),
        valorMaximo: Math.max(...this.data),
        intervaloDados: "1 hora",
        periodoCobertura: `${Math.round(n / 24)} dias`,
      },
      estatisticas: {
        amplitude,
        mediaAritmetica,
        moda,
        mediana,
        varianciaPopulacional,
        varianciaAmostral,
        desvioPadraoPopulacional,
        desvioPadraoAmostral,
        coeficienteVariacaoPopulacional,
        coeficienteVariacaoAmostral,
      },
    };
  }

  // Calcular moda (valor mais frequente)
  calculateMode() {
    const frequency = {};
    let maxFreq = 0;
    let mode = null;

    // Arredondar valores para evitar problemas de ponto flutuante
    this.data.forEach((value) => {
      const roundedValue = Math.round(value * 100) / 100;
      frequency[roundedValue] = (frequency[roundedValue] || 0) + 1;

      if (frequency[roundedValue] > maxFreq) {
        maxFreq = frequency[roundedValue];
        mode = roundedValue;
      }
    });

    return maxFreq > 1 ? mode : "Sem moda (todos os valores são únicos)";
  }

  // Gerar relatório formatado
  generateReport(stats) {
    const report = `
📈 ANÁLISE ESTATÍSTICA - BITCOIN (USD)
${"=".repeat(50)}

📊 DADOS BÁSICOS:
• Total de dados coletados: ${stats.dadosBasicos.totalDados.toLocaleString()}
• Intervalo de coleta: ${stats.dadosBasicos.intervaloDados}
• Período de cobertura: ${stats.dadosBasicos.periodoCobertura}
• Valor mínimo: $${stats.dadosBasicos.valorMinimo.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
• Valor máximo: $${stats.dadosBasicos.valorMaximo.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}

📋 ESTATÍSTICAS CALCULADAS:
${"─".repeat(30)}

🔢 MEDIDAS DE TENDÊNCIA CENTRAL:
• Média Aritmética: $${stats.estatisticas.mediaAritmetica.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
• Mediana: $${stats.estatisticas.mediana.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
• Moda: ${
      typeof stats.estatisticas.moda === "number"
        ? "$" + stats.estatisticas.moda.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : stats.estatisticas.moda
    }

📏 MEDIDAS DE DISPERSÃO:
• Amplitude: $${stats.estatisticas.amplitude.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}

📊 VARIÂNCIA:
• Variância Populacional: ${stats.estatisticas.varianciaPopulacional.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
• Variância Amostral: ${stats.estatisticas.varianciaAmostral.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}

📈 DESVIO PADRÃO:
• Desvio Padrão Populacional: $${stats.estatisticas.desvioPadraoPopulacional.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
• Desvio Padrão Amostral: $${stats.estatisticas.desvioPadraoAmostral.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}

📊 COEFICIENTE DE VARIAÇÃO:
• CV Populacional: ${stats.estatisticas.coeficienteVariacaoPopulacional.toFixed(6)}%
• CV Amostral: ${stats.estatisticas.coeficienteVariacaoAmostral.toFixed(6)}%

${"=".repeat(50)}
⚡ INFORMAÇÕES TÉCNICAS:
• Frequência de coleta: Dados horários
• Fonte de dados: CoinGecko API (Gratuita)
• Método de amostragem: Todos os dados horários
• Status da meta (≥100): ${stats.dadosBasicos.totalDados >= 100 ? "✅ ATINGIDA" : "❌ NÃO ATINGIDA"}

${"=".repeat(50)}
Relatório gerado em: ${new Date().toLocaleString("pt-BR")}
`;

    return report;
  }

  // Salvar dados em arquivo JSON
  saveDataToFile(filename = "bitcoin_data_hourly.json") {
    const dataWithTimestamp = {
      timestamp: new Date().toISOString(),
      totalRecords: this.data.length,
      samplingInterval: "1 hour",
      coveragePeriod: `${Math.round(this.data.length / 24)} days`,
      targetReached: this.data.length >= 100,
      data: this.data,
    };

    fs.writeFileSync(filename, JSON.stringify(dataWithTimestamp, null, 2));
    console.log(`💾 Dados salvos em: ${filename}`);
  }

  // Salvar relatório em arquivo
  saveReportToFile(report, filename = "bitcoin_statistics_report_hourly.txt") {
    fs.writeFileSync(filename, report);
    console.log(`📄 Relatório salvo em: ${filename}`);
  }

  // Método para testar a conexão com a API
  async testApiConnection() {
    try {
      console.log("🔗 Testando conexão com API CoinGecko...");
      const response = await axios.get("https://api.coingecko.com/api/v3/ping", {
        headers: {
          "x-cg-demo-api-key": this.API_KEY,
          Accept: "application/json",
        },
      });
      console.log("✅ API funcionando:", response.data);
      return true;
    } catch (error) {
      console.error("❌ Erro na API:", error.message);
      return false;
    }
  }
}

// Função principal para executar a análise
async function main() {
  try {
    const analyzer = new BitcoinStatsAnalyzer();

    // Testar conexão com API
    const apiWorking = await analyzer.testApiConnection();
    if (!apiWorking) {
      console.log("⚠️  Continuando mesmo com erro na API...");
    }

    // Buscar dados dos últimos 90 dias (hora a hora)
    console.log("\n📊 Coletando dados horários do Bitcoin (90 dias)...");
    await analyzer.fetchBitcoinData(90);

    console.log(`\n📊 Total de dados coletados: ${analyzer.data.length}`);
    console.log(`🎯 Meta (≥100): ${analyzer.data.length >= 100 ? "✅ ATINGIDA" : "❌ NÃO ATINGIDA"}`);
    console.log(`📅 Estimativa: ~${Math.round(analyzer.data.length / 24)} dias de dados`);

    // Salvar dados brutos
    analyzer.saveDataToFile();

    // Calcular estatísticas
    console.log("\n🔢 Calculando estatísticas...");
    const statistics = analyzer.calculateStatistics();

    // Gerar e exibir relatório
    const report = analyzer.generateReport(statistics);
    console.log(report);

    // Salvar relatório
    analyzer.saveReportToFile(report);

    console.log("\n✅ Análise concluída com sucesso!");
    console.log("📁 Arquivos gerados:");
    console.log("   • bitcoin_data_hourly.json (dados horários)");
    console.log("   • bitcoin_statistics_report_hourly.txt (relatório completo)");
  } catch (error) {
    console.error("❌ Erro durante a execução:", error.message);
    console.error("💡 Possíveis soluções:");
    console.error("   • Verifique sua conexão com a internet");
    console.error("   • Verifique se a API key está correta");
    console.error("   • Tente executar novamente após alguns minutos");
  }
}

// Executar se este arquivo for chamado diretamente
if (require.main === module) {
  main();
}

module.exports = BitcoinStatsAnalyzer;
