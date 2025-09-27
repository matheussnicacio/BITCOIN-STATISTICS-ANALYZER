import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Route to serve the main HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API route to get Bitcoin historical data
app.get("/api/bitcoin-history", async (req, res) => {
  try {
    let { days = 365 } = req.query; // Default to 1 year

    // Handle 'max' option to get maximum available data (use large number instead of 'max')
    if (days === "max") {
      days = 3650; // Approximately 10 years, should get maximum available data
    }

    // CoinGecko API for Bitcoin historical data
    const apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Format the data for easier frontend consumption
    const formattedData = data.prices.map(([timestamp, price]) => ({
      date: new Date(timestamp).toISOString().split("T")[0],
      price: price,
      timestamp: timestamp,
    }));

    res.json({
      success: true,
      data: formattedData,
      totalDays: formattedData.length,
    });
  } catch (error) {
    console.error("Error fetching Bitcoin data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Bitcoin data",
      message: error.message,
    });
  }
});

// API route to get current Bitcoin price
app.get("/api/bitcoin-current", async (req, res) => {
  try {
    const apiUrl =
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true";

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        price: data.bitcoin.usd,
        change24h: data.bitcoin.usd_24h_change,
      },
    });
  } catch (error) {
    console.error("Error fetching current Bitcoin price:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch current Bitcoin price",
      message: error.message,
    });
  }
});

// API route to get Bitcoin statistics
app.get("/api/bitcoin-statistics", async (req, res) => {
  try {
    let { days = 90 } = req.query; // Default to 90 days for hourly data

    // CoinGecko API for Bitcoin historical data (hourly for ≤90 days)
    const apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Extract prices only
    const prices = data.prices.map(([timestamp, price]) => price);

    // Calculate statistics
    const stats = calculateBitcoinStatistics(prices);

    res.json({
      success: true,
      data: stats,
      totalDataPoints: prices.length,
      period: `${days} days`,
      interval: days <= 90 ? "hourly" : "daily",
    });
  } catch (error) {
    console.error("Error fetching Bitcoin statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Bitcoin statistics",
      message: error.message,
    });
  }
});

// Helper function to calculate Bitcoin statistics
function calculateBitcoinStatistics(prices) {
  const n = prices.length;
  if (n === 0) throw new Error("No price data available");

  const sortedPrices = [...prices].sort((a, b) => a - b);

  // 1. Amplitude
  const amplitude = Math.max(...prices) - Math.min(...prices);

  // 2. Média Aritmética
  const mediaAritmetica = prices.reduce((sum, price) => sum + price, 0) / n;

  // 3. Mediana
  const mediana = n % 2 === 0 ? (sortedPrices[n / 2 - 1] + sortedPrices[n / 2]) / 2 : sortedPrices[Math.floor(n / 2)];

  // 4. Moda (simplified - most frequent rounded value)
  const moda = calculateMode(prices);

  // 5. Variância Populacional
  const varianciaPopulacional = prices.reduce((sum, price) => sum + Math.pow(price - mediaAritmetica, 2), 0) / n;

  // 6. Variância Amostral
  const varianciaAmostral = prices.reduce((sum, price) => sum + Math.pow(price - mediaAritmetica, 2), 0) / (n - 1);

  // 7. Desvio Padrão Populacional
  const desvioPadraoPopulacional = Math.sqrt(varianciaPopulacional);

  // 8. Desvio Padrão Amostral
  const desvioPadraoAmostral = Math.sqrt(varianciaAmostral);

  // 9. Coeficiente de Variação Populacional
  const coeficienteVariacaoPopulacional = (desvioPadraoPopulacional / mediaAritmetica) * 100;

  // 10. Coeficiente de Variação Amostral
  const coeficienteVariacaoAmostral = (desvioPadraoAmostral / mediaAritmetica) * 100;

  return {
    amplitude,
    mediaAritmetica,
    mediana,
    moda,
    varianciaPopulacional,
    varianciaAmostral,
    desvioPadraoPopulacional,
    desvioPadraoAmostral,
    coeficienteVariacaoPopulacional,
    coeficienteVariacaoAmostral,
    dadosBasicos: {
      totalDados: n,
      valorMinimo: Math.min(...prices),
      valorMaximo: Math.max(...prices),
    },
  };
}

function calculateMode(prices) {
  const frequency = {};
  let maxFreq = 0;
  let mode = null;

  prices.forEach((price) => {
    frequency[price] = (frequency[price] || 0) + 1;

    if (frequency[price] > maxFreq) {
      maxFreq = frequency[price];
      mode = price;
    }
  });

  return maxFreq > 1 ? mode : null; // Return null if no mode
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("Bitcoin Price Tracker is ready!");
});
