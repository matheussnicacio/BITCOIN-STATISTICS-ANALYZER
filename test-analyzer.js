// test-analyzer.js
const BitcoinStatsAnalyzer = require('./bitcoin-stats-analyzer');

async function runTests() {
  console.log('🧪 Iniciando testes do Bitcoin Statistics Analyzer\n');
  
  try {
    const analyzer = new BitcoinStatsAnalyzer();
    
    // Teste 1: Buscar dados menores para teste rápido
    console.log('📊 Teste 1: Buscando dados dos últimos 30 dias...');
    await analyzer.fetchBitcoinData(30);
    
    // Teste 2: Calcular estatísticas
    console.log('🔢 Teste 2: Calculando estatísticas...');
    const stats = analyzer.calculateStatistics();
    
    // Teste 3: Verificar se todas as métricas foram calculadas
    console.log('✅ Teste 3: Verificando se todas as métricas estão presentes...');
    const requiredMetrics = [
      'amplitude',
      'mediaAritmetica',
      'moda',
      'mediana',
      'varianciaPopulacional',
      'varianciaAmostral',
      'desvioPadraoPopulacional',
      'desvioPadraoAmostral',
      'coeficienteVariacaoPopulacional',
      'coeficienteVariacaoAmostral'
    ];
    
    const missingMetrics = requiredMetrics.filter(metric => 
      stats.estatisticas[metric] === undefined || stats.estatisticas[metric] === null
    );
    
    if (missingMetrics.length > 0) {
      console.error(`❌ Métricas faltando: ${missingMetrics.join(', ')}`);
    } else {
      console.log('✅ Todas as métricas calculadas com sucesso!');
    }
    
    // Teste 4: Gerar relatório
    console.log('📄 Teste 4: Gerando relatório...');
    const report = analyzer.generateReport(stats);
    
    // Exibir resumo dos resultados
    console.log('\n📈 RESUMO DOS RESULTADOS DE TESTE:');
    console.log('─'.repeat(40));
    console.log(`Total de dados: ${stats.dadosBasicos.totalDados}`);
    console.log(`Média: $${stats.estatisticas.mediaAritmetica.toFixed(2)}`);
    console.log(`Mediana: $${stats.estatisticas.mediana.toFixed(2)}`);
    console.log(`Desvio Padrão Amostral: $${stats.estatisticas.desvioPadraoAmostral.toFixed(2)}`);
    console.log(`Coeficiente de Variação Amostral: ${stats.estatisticas.coeficienteVariacaoAmostral.toFixed(2)}%`);
    
    // Salvar arquivos de teste
    analyzer.saveDataToFile('test_bitcoin_data.json');
    analyzer.saveReportToFile(report, 'test_bitcoin_report.txt');
    
    console.log('\n✅ Todos os testes executados com sucesso!');
    console.log('📁 Arquivos de teste gerados:');
    console.log('   • test_bitcoin_data.json');
    console.log('   • test_bitcoin_report.txt');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

// Executar testes
if (require.main === module) {
  runTests();
}