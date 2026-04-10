// ── Weather code → emoji + description mapping ──
const WEATHER_CODES = {
  0:  { icon: "☀️",  desc: "Clear sky" },
  1:  { icon: "🌤️", desc: "Mainly clear" },
  2:  { icon: "⛅",  desc: "Partly cloudy" },
  3:  { icon: "☁️",  desc: "Overcast" },
  45: { icon: "🌫️", desc: "Foggy" },
  48: { icon: "🌫️", desc: "Depositing rime fog" },
  51: { icon: "🌦️", desc: "Light drizzle" },
  53: { icon: "🌦️", desc: "Moderate drizzle" },
  55: { icon: "🌦️", desc: "Dense drizzle" },
  56: { icon: "🌧️", desc: "Freezing drizzle" },
  57: { icon: "🌧️", desc: "Heavy freezing drizzle" },
  61: { icon: "🌧️", desc: "Slight rain" },
  63: { icon: "🌧️", desc: "Moderate rain" },
  65: { icon: "🌧️", desc: "Heavy rain" },
  66: { icon: "🌧️", desc: "Light freezing rain" },
  67: { icon: "🌧️", desc: "Heavy freezing rain" },
  71: { icon: "🌨️", desc: "Slight snowfall" },
  73: { icon: "🌨️", desc: "Moderate snowfall" },
  75: { icon: "❄️",  desc: "Heavy snowfall" },
  77: { icon: "🌨️", desc: "Snow grains" },
  80: { icon: "🌦️", desc: "Slight rain showers" },
  81: { icon: "🌧️", desc: "Moderate rain showers" },
  82: { icon: "⛈️",  desc: "Violent rain showers" },
  85: { icon: "🌨️", desc: "Slight snow showers" },
  86: { icon: "❄️",  desc: "Heavy snow showers" },
  95: { icon: "⛈️",  desc: "Thunderstorm" },
  96: { icon: "⛈️",  desc: "Thunderstorm with slight hail" },
  99: { icon: "⛈️",  desc: "Thunderstorm with heavy hail" },
};

function getWeather(code) {
  return WEATHER_CODES[code] || { icon: "❓", desc: "Unknown" };
}

// ── DOM references ──
const cityInput       = document.getElementById("city-input");
const searchForm      = document.getElementById("search-form");
const locateBtn       = document.getElementById("locate-btn");
const suggestionsEl   = document.getElementById("suggestions");
const loadingEl       = document.getElementById("loading");
const errorEl         = document.getElementById("error");
const errorMsg        = document.getElementById("error-message");
const contentEl       = document.getElementById("weather-content");
const currentIcon     = document.getElementById("current-icon");
const currentTemp     = document.getElementById("current-temp-value");
const currentDesc     = document.getElementById("current-desc");
const currentLocation = document.getElementById("current-location");
const feelsLike       = document.getElementById("feels-like");
const humidity        = document.getElementById("humidity");
const wind            = document.getElementById("wind");
const uvIndex         = document.getElementById("uv-index");
const visibility      = document.getElementById("visibility");
const pressure        = document.getElementById("pressure");
const hourlyContainer = document.getElementById("hourly-container");
const dailyContainer  = document.getElementById("daily-container");

let debounceTimer = null;
let activeSuggestionIdx = -1;

// ── Show / hide helpers ──
function showLoading() {
  loadingEl.classList.remove("hidden");
  errorEl.classList.add("hidden");
  contentEl.classList.add("hidden");
}

function showError(msg) {
  loadingEl.classList.add("hidden");
  errorEl.classList.remove("hidden");
  contentEl.classList.add("hidden");
  errorMsg.textContent = msg;
}

function showContent() {
  loadingEl.classList.add("hidden");
  errorEl.classList.add("hidden");
  contentEl.classList.remove("hidden");
}

// ── Geocoding (city search) ──
async function geocode(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  return data.results || [];
}

// ── Fetch weather data ──
async function fetchWeather(lat, lon) {
  const params = [
    `latitude=${lat}`,
    `longitude=${lon}`,
    "current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility",
    "hourly=temperature_2m,weather_code,precipitation_probability",
    "daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
    "temperature_unit=fahrenheit",
    "wind_speed_unit=mph",
    "precipitation_unit=inch",
    "timezone=auto",
    "forecast_days=7",
    "forecast_hours=24",
  ];
  const url = `https://api.open-meteo.com/v1/forecast?${params.join("&")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather API request failed");
  return res.json();
}

// ── Render weather ──
function render(data, locationName) {
  const c = data.current;
  const w = getWeather(c.weather_code);

  // Current
  currentIcon.textContent     = w.icon;
  currentTemp.textContent     = Math.round(c.temperature_2m);
  currentDesc.textContent     = w.desc;
  currentLocation.textContent = locationName;
  feelsLike.textContent       = `${Math.round(c.apparent_temperature)}°`;
  humidity.textContent         = `${c.relative_humidity_2m}%`;
  wind.textContent             = `${Math.round(c.wind_speed_10m)} mph`;
  pressure.textContent         = `${Math.round(c.surface_pressure)} hPa`;

  const vis = c.visibility != null ? `${Math.round(c.visibility * 0.000621371)} mi` : "N/A";
  visibility.textContent = vis;

  // UV from daily
  const todayUV = data.daily?.uv_index_max?.[0];
  uvIndex.textContent = todayUV != null ? todayUV.toFixed(1) : "N/A";

  // Hourly forecast (next 24h)
  hourlyContainer.innerHTML = "";
  const hourly = data.hourly;
  const nowHour = new Date().getHours();

  for (let i = 0; i < Math.min(24, hourly.time.length); i++) {
    const dt   = new Date(hourly.time[i]);
    const hour = dt.getHours();
    const hw   = getWeather(hourly.weather_code[i]);
    const temp = Math.round(hourly.temperature_2m[i]);
    const precip = hourly.precipitation_probability?.[i];

    const card = document.createElement("div");
    card.className = `hourly-card${i === 0 ? " now" : ""}`;

    const timeLabel = i === 0 ? "Now" : dt.toLocaleTimeString([], { hour: "numeric", hour12: true });

    card.innerHTML = `
      <div class="hourly-time">${timeLabel}</div>
      <div class="hourly-icon">${hw.icon}</div>
      <div class="hourly-temp">${temp}°</div>
      ${precip != null && precip > 0 ? `<div class="hourly-precip">💧 ${precip}%</div>` : ""}
    `;
    hourlyContainer.appendChild(card);
  }

  // Daily forecast
  dailyContainer.innerHTML = "";
  const daily = data.daily;
  const allLows  = daily.temperature_2m_min;
  const allHighs = daily.temperature_2m_max;
  const absLow   = Math.min(...allLows);
  const absHigh  = Math.max(...allHighs);
  const range    = absHigh - absLow || 1;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < daily.time.length; i++) {
    const dt   = new Date(daily.time[i] + "T00:00:00");
    const dw   = getWeather(daily.weather_code[i]);
    const lo   = Math.round(allLows[i]);
    const hi   = Math.round(allHighs[i]);
    const prec = daily.precipitation_probability_max?.[i];

    const left  = ((allLows[i] - absLow) / range) * 100;
    const width = ((allHighs[i] - allLows[i]) / range) * 100;

    const dayLabel = i === 0 ? "Today" : `${dayNames[dt.getDay()]} ${dt.getMonth() + 1}/${dt.getDate()}`;

    const row = document.createElement("div");
    row.className = `daily-row${i === 0 ? " today" : ""}`;
    row.innerHTML = `
      <div class="daily-day">${dayLabel}</div>
      <div class="daily-icon">${dw.icon}</div>
      <div class="daily-bar-wrapper">
        <span class="daily-lo">${lo}°</span>
        <div class="daily-bar">
          <div class="daily-bar-fill" style="left:${left}%;width:${Math.max(width, 4)}%"></div>
        </div>
        <span class="daily-hi">${hi}°</span>
      </div>
      <div class="daily-precip">${prec != null && prec > 0 ? `💧 ${prec}%` : ""}</div>
    `;
    dailyContainer.appendChild(row);
  }

  showContent();
}

// ── Main: load weather for a location ──
async function loadWeather(lat, lon, name) {
  showLoading();
  try {
    const data = await fetchWeather(lat, lon);
    render(data, name);
  } catch (err) {
    console.error(err);
    showError("Unable to fetch weather data. Please try again.");
  }
}

// ── Suggestions ──
function showSuggestions(results) {
  suggestionsEl.innerHTML = "";
  activeSuggestionIdx = -1;
  if (results.length === 0) {
    suggestionsEl.classList.add("hidden");
    return;
  }
  results.forEach((r, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    const parts = [r.name];
    if (r.admin1) parts.push(r.admin1);
    if (r.country) parts.push(r.country);
    li.textContent = parts.join(", ");
    li.addEventListener("click", () => {
      cityInput.value = parts.join(", ");
      suggestionsEl.classList.add("hidden");
      loadWeather(r.latitude, r.longitude, parts.join(", "));
    });
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.classList.remove("hidden");
}

cityInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const query = cityInput.value.trim();
  if (query.length < 2) {
    suggestionsEl.classList.add("hidden");
    return;
  }
  debounceTimer = setTimeout(async () => {
    try {
      const results = await geocode(query);
      showSuggestions(results);
    } catch {
      suggestionsEl.classList.add("hidden");
    }
  }, 300);
});

// Keyboard navigation for suggestions
cityInput.addEventListener("keydown", (e) => {
  const items = suggestionsEl.querySelectorAll("li");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeSuggestionIdx = Math.min(activeSuggestionIdx + 1, items.length - 1);
    items.forEach((li, i) => li.classList.toggle("active", i === activeSuggestionIdx));
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeSuggestionIdx = Math.max(activeSuggestionIdx - 1, 0);
    items.forEach((li, i) => li.classList.toggle("active", i === activeSuggestionIdx));
  } else if (e.key === "Enter" && activeSuggestionIdx >= 0) {
    e.preventDefault();
    items[activeSuggestionIdx].click();
  }
});

// Close suggestions on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) {
    suggestionsEl.classList.add("hidden");
  }
});

// ── Form submit ──
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = cityInput.value.trim();
  if (!query) return;
  suggestionsEl.classList.add("hidden");
  showLoading();
  try {
    const results = await geocode(query);
    if (results.length === 0) {
      showError(`No location found for "${query}". Try another city name.`);
      return;
    }
    const r = results[0];
    const parts = [r.name];
    if (r.admin1) parts.push(r.admin1);
    if (r.country) parts.push(r.country);
    cityInput.value = parts.join(", ");
    await loadWeather(r.latitude, r.longitude, parts.join(", "));
  } catch (err) {
    showError("Search failed. Please check your connection and try again.");
  }
});

// ── Geolocation ──
locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      // Reverse-geocode for location name
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=&count=1&language=en&format=json`
        );
      } catch {}
      // Use coordinates directly
      const name = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
      cityInput.value = name;
      await loadWeather(latitude, longitude, name);
    },
    () => {
      showError("Unable to get your location. Please allow location access or search manually.");
    }
  );
});

// ── Load default city on start ──
loadWeather(40.7128, -74.006, "New York, New York, United States");
