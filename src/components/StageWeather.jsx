// Météo compacte pour une étape — utilisé dans la fiche détaillée du globe
import { useState, useEffect } from 'react'

const StageWeather = ({ latitude, longitude }) => {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    if (!latitude || !longitude) return
    let cancelled = false
    const load = async () => {
      try {
        const { getWeather } = await import('../services/weatherService')
        const data = await getWeather(latitude, longitude)
        if (!cancelled) setWeather(data)
      } catch {
        // silently fail
      }
    }
    load()
    return () => { cancelled = true }
  }, [latitude, longitude])

  if (!weather) return null

  return (
    <div className="stage-weather">
      <span className="stage-weather-icon">{weather.icon}</span>
      <span className="stage-weather-temp">{weather.temperature}°C</span>
      <span className="stage-weather-label">{weather.label}</span>
      <span className="stage-weather-extra">
        {'\uD83D\uDCA7'} {weather.humidity}% &middot; {'\uD83C\uDF2C\uFE0F'} {weather.windSpeed} km/h
      </span>
    </div>
  )
}

export default StageWeather
