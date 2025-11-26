import type { GeoLocation, DWDForecastResponse, CurrentWeather, HourlyForecast } from "./types"

export interface GeoSearchResult {
  name: string
  lat: number
  lon: number
  country: string
  admin1?: string
}

export async function geocodeLocation(query: string): Promise<GeoLocation> {
  const results = await geocodeSearch(query)
  if (results.length === 0) {
    throw new Error(`Ort nicht gefunden: ${query}`)
  }
  const result = results[0]
  return {
    lat: result.lat,
    lon: result.lon,
    name: result.name + (result.admin1 ? `, ${result.admin1}` : ""),
  }
}

export async function geocodeSearch(query: string): Promise<GeoSearchResult[]> {
  const cleanQuery = query.replace(/^\d{5}\s*/, "").trim() || query
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=10&language=de&format=json`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Geocoding fehlgeschlagen: ${response.statusText}`)
  }

  const data = await response.json()
  if (!data.results || data.results.length === 0) {
    return []
  }

  // Prefer German results
  const sorted = data.results.sort((a: { country_code?: string }, b: { country_code?: string }) => {
    if (a.country_code === "DE" && b.country_code !== "DE") return -1
    if (a.country_code !== "DE" && b.country_code === "DE") return 1
    return 0
  })

  return sorted.map((r: { name: string; latitude: number; longitude: number; country: string; admin1?: string }) => ({
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    country: r.country,
    admin1: r.admin1,
  }))
}

export async function fetchWeatherData(lat: number, lon: number, includeCurrent = false): Promise<DWDForecastResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "rain",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
    models: "icon_seamless",
    timezone: "Europe/Berlin",
    forecast_days: "7",
  })

  if (includeCurrent) {
    params.append(
      "current",
      [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "surface_pressure",
        "precipitation",
        "weather_code",
        "cloud_cover",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "is_day",
      ].join(","),
    )
  }

  const url = `https://api.open-meteo.com/v1/dwd-icon?${params}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Wetterdaten konnten nicht abgerufen werden: ${response.statusText}`)
  }

  return response.json()
}

export function parseCurrentWeather(data: DWDForecastResponse): CurrentWeather | null {
  if (!data.current) return null

  const current = data.current
  return {
    temp: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    pressure: current.surface_pressure,
    windSpeed: current.wind_speed_10m,
    windGust: current.wind_gusts_10m,
    windDeg: current.wind_direction_10m,
    clouds: current.cloud_cover,
    weatherCode: current.weather_code,
    description: getWeatherDescription(current.weather_code),
    isDay: current.is_day === 1,
  }
}

export function parseHourlyForecast(data: DWDForecastResponse, hours = 24): HourlyForecast[] {
  const { hourly } = data
  const now = new Date()
  const results: HourlyForecast[] = []

  for (let i = 0; i < hourly.time.length && results.length < hours; i++) {
    const time = new Date(hourly.time[i])
    if (time < now) continue

    results.push({
      time: hourly.time[i],
      temp: hourly.temperature_2m[i],
      pop: (hourly.precipitation_probability[i] ?? 0) / 100,
      rain: hourly.precipitation[i] ?? 0,
      weatherCode: hourly.weather_code[i],
      windSpeed: hourly.wind_speed_10m[i],
      description: getWeatherDescription(hourly.weather_code[i]),
    })
  }

  return results
}

export function getRainPrediction(hourly: HourlyForecast[]): string {
  const now = new Date()

  // Check next 3 hours for rain
  const next3Hours = hourly.slice(0, 3)
  const rainingSoon = next3Hours.find((h) => h.rain > 0.1 || h.pop > 0.5)
  const noRainSoon = next3Hours.every((h) => h.rain < 0.1 && h.pop < 0.3)

  // Find when rain starts/stops
  let rainStartTime: Date | null = null
  let rainEndTime: Date | null = null

  for (let i = 0; i < hourly.length; i++) {
    const h = hourly[i]
    if (!rainStartTime && (h.rain > 0.1 || h.pop > 0.6)) {
      rainStartTime = new Date(h.time)
    }
    if (rainStartTime && !rainEndTime && h.rain < 0.1 && h.pop < 0.3) {
      rainEndTime = new Date(h.time)
    }
  }

  // Check if currently raining (first hour)
  const currentlyRaining = hourly[0]?.rain > 0.1

  if (currentlyRaining) {
    if (rainEndTime) {
      const minutesUntilDry = Math.round((rainEndTime.getTime() - now.getTime()) / 60000)
      if (minutesUntilDry < 60) {
        return `Voraussichtlich trocken in ca. ${minutesUntilDry} Minuten.`
      }
      return `Voraussichtlich trocken ab ca. ${rainEndTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr.`
    }
    return "Regen hält voraussichtlich an."
  }

  if (noRainSoon) {
    if (rainStartTime) {
      const minutesUntilRain = Math.round((rainStartTime.getTime() - now.getTime()) / 60000)
      if (minutesUntilRain > 180) {
        return `Trocken. Regen erst ab ca. ${rainStartTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr möglich.`
      }
    }
    return "Aktuell trocken, kein Regen in den nächsten 3 Stunden erwartet."
  }

  if (rainingSoon) {
    const rainTime = new Date(rainingSoon.time)
    const minutesUntilRain = Math.round((rainTime.getTime() - now.getTime()) / 60000)
    if (minutesUntilRain <= 30) {
      return `Regen in den nächsten 30 Minuten wahrscheinlich.`
    }
    if (minutesUntilRain <= 60) {
      return `Regen innerhalb der nächsten Stunde wahrscheinlich.`
    }
    return `Regen ab ca. ${rainTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr möglich.`
  }

  return "Wechselhaftes Wetter in den nächsten Stunden."
}

// WMO Weather interpretation codes to German descriptions
export function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Klar",
    1: "Überwiegend klar",
    2: "Teilweise bewölkt",
    3: "Bewölkt",
    45: "Nebel",
    48: "Gefrierender Nebel",
    51: "Leichter Nieselregen",
    53: "Mäßiger Nieselregen",
    55: "Starker Nieselregen",
    56: "Leichter gefrierender Nieselregen",
    57: "Starker gefrierender Nieselregen",
    61: "Leichter Regen",
    63: "Mäßiger Regen",
    65: "Starker Regen",
    66: "Leichter gefrierender Regen",
    67: "Starker gefrierender Regen",
    71: "Leichter Schneefall",
    73: "Mäßiger Schneefall",
    75: "Starker Schneefall",
    77: "Schneegriesel",
    80: "Leichte Regenschauer",
    81: "Mäßige Regenschauer",
    82: "Starke Regenschauer",
    85: "Leichte Schneeschauer",
    86: "Starke Schneeschauer",
    95: "Gewitter",
    96: "Gewitter mit leichtem Hagel",
    99: "Gewitter mit starkem Hagel",
  }
  return descriptions[code] || "Unbekannt"
}

// Get weather icon based on WMO code
export function getWeatherIcon(code: number, isDay = true): string {
  if (code === 0) return isDay ? "sun" : "moon"
  if (code <= 3) return isDay ? "cloud-sun" : "cloud-moon"
  if (code <= 48) return "cloud-fog"
  if (code <= 57) return "cloud-drizzle"
  if (code <= 67) return "cloud-rain"
  if (code <= 77) return "cloud-snow"
  if (code <= 82) return "cloud-rain"
  if (code <= 86) return "cloud-snow"
  if (code >= 95) return "cloud-lightning"
  return "cloud"
}
