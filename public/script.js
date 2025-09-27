let bitcoinData = [];
let priceChart = null;

// DOM elements
const currentPriceElement = document.getElementById("current-price");
const priceChangeElement = document.getElementById("price-change");
const daysSelect = document.getElementById("days-select");
const fetchButton = document.getElementById("fetch-data");
const loadingElement = document.getElementById("loading");
const tableBody = document.getElementById("table-body");
const highestPriceElement = document.getElementById("highest-price");
const lowestPriceElement = document.getElementById("lowest-price");
const highestDateElement = document.getElementById("highest-date");
const lowestDateElement = document.getElementById("lowest-date");
const totalDaysElement = document.getElementById("total-days");
const statsDaysSelect = document.getElementById("stats-days-select");
const fetchStatisticsButton = document.getElementById("fetch-statistics");
const statisticsBody = document.getElementById("statistics-body");

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  fetchCurrentPrice();
  fetchHistoricalData();

  fetchButton.addEventListener("click", fetchHistoricalData);
  fetchStatisticsButton.addEventListener("click", fetchStatistics);
});

// Fetch current Bitcoin price
async function fetchCurrentPrice() {
  try {
    const response = await fetch("/api/bitcoin-current");
    const result = await response.json();

    if (result.success) {
      const { price, change24h } = result.data;
      currentPriceElement.textContent = formatPrice(price);

      const changeText = `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`;
      priceChangeElement.textContent = changeText;
      priceChangeElement.className = change24h >= 0 ? "positive" : "negative";
    }
  } catch (error) {
    console.error("Error fetching current price:", error);
    currentPriceElement.textContent = "Error loading price";
  }
}

// Fetch historical Bitcoin data
async function fetchHistoricalData() {
  const days = daysSelect.value;

  try {
    showLoading(true);

    const response = await fetch(`/api/bitcoin-history?days=${days}`);
    const result = await response.json();

    if (result.success) {
      bitcoinData = result.data;
      updateChart();
      updateTable();
      updateStats();
    } else {
      console.error("API Error:", result.message);
    }
  } catch (error) {
    console.error("Error fetching historical data:", error);
  } finally {
    showLoading(false);
  }
}

// Update the data table
function updateTable() {
  tableBody.innerHTML = "";

  // Show most recent data first (last 1000 entries for performance)
  const recentData = bitcoinData.slice(-1000).reverse();

  recentData.forEach((item, index) => {
    const row = document.createElement("tr");

    // Calculate change from previous day
    let changePercent = 0;
    let changeClass = "";

    if (index < recentData.length - 1) {
      const currentPrice = item.price;
      const previousPrice = recentData[index + 1].price;
      changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
      changeClass = changePercent >= 0 ? "positive" : "negative";
    }

    row.innerHTML = `
            <td>${formatDate(item.date)}</td>
            <td>${formatPrice(item.price)}</td>
            <td class="${changeClass}">
                ${index < recentData.length - 1 ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%` : "-"}
            </td>
        `;

    tableBody.appendChild(row);
  });
}

// Update the chart
function updateChart() {
  const ctx = document.getElementById("price-chart").getContext("2d");

  if (priceChart) {
    priceChart.destroy();
  }

  const labels = bitcoinData.map((item) => item.date);
  const prices = bitcoinData.map((item) => item.price);

  priceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Bitcoin Price (USD)",
          data: prices,
          borderColor: "#000000",
          backgroundColor: "rgba(247, 147, 26, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Date",
          },
          ticks: {
            maxTicksLimit: 10,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Price (USD)",
          },
          ticks: {
            callback: function (value) {
              return "$" + value.toLocaleString();
            },
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return "Price: $" + context.parsed.y.toLocaleString();
            },
          },
        },
        legend: {
          display: true,
          position: "top",
        },
      },
    },
  });
}

// Update statistics
function updateStats() {
  if (bitcoinData.length === 0) return;

  const prices = bitcoinData.map((item) => item.price);
  const highest = Math.max(...prices);
  const lowest = Math.min(...prices);

  const highestIndex = prices.indexOf(highest);
  const lowestIndex = prices.indexOf(lowest);

  highestPriceElement.textContent = formatPrice(highest);
  lowestPriceElement.textContent = formatPrice(lowest);
  highestDateElement.textContent = formatDate(bitcoinData[highestIndex].date);
  lowestDateElement.textContent = formatDate(bitcoinData[lowestIndex].date);
  totalDaysElement.textContent = bitcoinData.length.toLocaleString();
}

// Utility functions
function formatPrice(price) {
  return (
    "$" +
    price.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function showLoading(show) {
  loadingElement.style.display = show ? "flex" : "none";
}

// Fetch Bitcoin statistics
async function fetchStatistics() {
  const days = statsDaysSelect.value;

  try {
    showLoading(true);

    const response = await fetch(`/api/bitcoin-statistics?days=${days}`);
    const result = await response.json();

    if (result.success) {
      updateStatisticsTable(result.data, result.totalDataPoints, result.period, result.interval);
    } else {
      console.error("Statistics API Error:", result.message);
      statisticsBody.innerHTML = '<tr><td colspan="3" class="error">Error loading statistics</td></tr>';
    }
  } catch (error) {
    console.error("Error fetching statistics:", error);
    statisticsBody.innerHTML = '<tr><td colspan="3" class="error">Error loading statistics</td></tr>';
  } finally {
    showLoading(false);
  }
}

// Update statistics table
function updateStatisticsTable(stats, totalDataPoints, period, interval) {
  const statisticsData = [
    {
      measure: "Amplitude",
      value: formatPrice(stats.amplitude),
      description: "Valor máximo - Valor mínimo",
    },
    {
      measure: "Média Aritmética",
      value: formatPrice(stats.mediaAritmetica),
      description: "Soma dos dados / Quantidade de dados",
    },
    {
      measure: "Mediana",
      value: formatPrice(stats.mediana),
      description: "Valor encontrado na posição central dos dados ordenados",
    },
    {
      measure: "Moda",
      value: stats.moda ? formatPrice(stats.moda) : "Nenhuma moda encontrada",
      description: "Dado mais frequentemente observado",
    },
    {
      measure: "Variância Populacional",
      value: formatLargeNumber(stats.varianciaPopulacional),
      description: "Soma dos quadrados dos desvios dividido por n (total de dados)",
    },
    {
      measure: "Variância Amostral",
      value: formatLargeNumber(stats.varianciaAmostral),
      description: "Soma dos quadrados dos desvios dividido por (n-1)",
    },
    {
      measure: "Desvio Padrão Populacional",
      value: formatPrice(stats.desvioPadraoPopulacional),
      description: "Raiz quadrada da variância populacional",
    },
    {
      measure: "Desvio Padrão Amostral",
      value: formatPrice(stats.desvioPadraoAmostral),
      description: "Raiz quadrada da variância amostral",
    },
    {
      measure: "Coeficiente de Variação Populacional",
      value: `${stats.coeficienteVariacaoPopulacional.toFixed(4)}%`,
      description: "Desvio padrão populacional / Média aritmética",
    },
    {
      measure: "Coeficiente de Variação Amostral",
      value: `${stats.coeficienteVariacaoAmostral.toFixed(4)}%`,
      description: "Desvio padrão amostral / Média aritmética",
    },
  ];

  // Add header with data info
  let tableHTML = `
    <tr class="info-row">
      <td colspan="3">
        <strong>Período analisado:</strong> ${(totalDataPoints - 2).toLocaleString()} dados dos últimos ${
    period == "90 days" ? "90 dias" : "30 dias"
  } (${interval == "hourly" ? "hora-a-hora" : "diários"})
      </td>
    </tr>
  `;

  // Add statistics rows
  statisticsData.forEach((stat, index) => {
    const rowClass = index % 2 === 0 ? "even" : "odd";
    tableHTML += `
      <tr class="${rowClass}">
        <td class="measure-name">${stat.measure}</td>
        <td class="measure-value">${stat.value}</td>
        <td class="measure-description">${stat.description}</td>
      </tr>
    `;
  });

  statisticsBody.innerHTML = tableHTML;
}

// Format large numbers
function formatLargeNumber(num) {
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  //   if (num >= 1e6) {
  //     return (num / 1e6).toFixed(2) + "M";
  //   } else if (num >= 1e3) {
  //     return (num / 1e3).toFixed(2) + "K";
  //   } else {
  //     return num.toFixed(2);
  //   }
}
