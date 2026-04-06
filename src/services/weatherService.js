// Service météo — utilise Open-Meteo (gratuit, sans clé API)
const WEATHER_CACHE = new Map()
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

const WEATHER_CODES = {
  0: { label: 'Ensoleillé', icon: '\u2600\uFE0F' },
  1: { label: 'Peu nuageux', icon: '\uD83C\uDF24\uFE0F' },
  2: { label: 'Partiellement nuageux', icon: '\u26C5' },
  3: { label: 'Couvert', icon: '\u2601\uFE0F' },
  45: { label: 'Brouillard', icon: '\uD83C\uDF2B\uFE0F' },
  48: { label: 'Brouillard givrant', icon: '\uD83C\uDF2B\uFE0F' },
  51: { label: 'Bruine légère', icon: '\uD83C\uDF26\uFE0F' },
  53: { label: 'Bruine', icon: '\uD83C\uDF26\uFE0F' },
  55: { label: 'Bruine dense', icon: '\uD83C\uDF27\uFE0F' },
  61: { label: 'Pluie légère', icon: '\uD83C\uDF27\uFE0F' },
  63: { label: 'Pluie', icon: '\uD83C\uDF27\uFE0F' },
  65: { label: 'Forte pluie', icon: '\uD83C\uDF27\uFE0F' },
  71: { label: 'Neige légère', icon: '\uD83C\uDF28\uFE0F' },
  73: { label: 'Neige', icon: '\u2744\uFE0F' },
  75: { label: 'Forte neige', icon: '\u2744\uFE0F' },
  77: { label: 'Grains de neige', icon: '\u2744\uFE0F' },
  80: { label: 'Averses légères', icon: '\uD83C\uDF26\uFE0F' },
  81: { label: 'Averses', icon: '\uD83C\uDF27\uFE0F' },
  82: { label: 'Fortes averses', icon: '\u26C8\uFE0F' },
  85: { label: 'Averses de neige', icon: '\uD83C\uDF28\uFE0F' },
  86: { label: 'Fortes averses de neige', icon: '\uD83C\uDF28\uFE0F' },
  95: { label: 'Orage', icon: '\u26A1' },
  96: { label: 'Orage avec grêle', icon: '\u26A1' },
  99: { label: 'Orage violent', icon: '\u26A1' },
}

// Récupérer la météo actuelle pour des coordonnées
export const getWeather = async (latitude, longitude) => {
  const cacheKey = `${latitude.toFixed(2)}_${longitude.toFixed(2)}`
  const cached = WEATHER_CACHE.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
    const response = await fetch(url)
    if (!response.ok) return null

    const json = await response.json()
    const current = json.current

    if (!current) return null

    const weatherCode = current.weather_code ?? 0
    const weatherInfo = WEATHER_CODES[weatherCode] || { label: 'Inconnu', icon: '\uD83C\uDF0D' }

    const data = {
      temperature: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      weatherCode,
      label: weatherInfo.label,
      icon: weatherInfo.icon,
    }

    WEATHER_CACHE.set(cacheKey, { data, timestamp: Date.now() })
    return data
  } catch (err) {
    console.error('Erreur météo:', err)
    return null
  }
}
