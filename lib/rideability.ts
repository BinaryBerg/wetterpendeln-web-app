import type { WeatherSlot } from "./types"

interface RideabilityResult {
  level: "gut" | "ok" | "kritisch" | "schlecht"
  emoji: string
  label: string
  advice: string
}

// Old thresholds in m/s: 8, 12, 16 -> New in km/h: ~29, ~43, ~58
export function evaluateRideability(slot: WeatherSlot): RideabilityResult {
  const { temp, pop, rain, windSpeed, windGust } = slot
  const popPercent = pop * 100

  // Use wind gusts for safety assessment if available
  const effectiveWind = windGust > 0 ? Math.max(windSpeed, windGust * 0.8) : windSpeed

  // 🔴 Nicht empfehlenswert
  // Wind > 58 km/h (was 16 m/s), Rain > 5mm/h, Temp <= -3°C, Pop > 80%
  if (popPercent > 80 || rain > 5 || temp <= -3 || effectiveWind > 58) {
    let advice = ""
    if (popPercent > 80) advice = "Sehr hohe Regenwahrscheinlichkeit"
    else if (rain > 5) advice = "Starker Regen erwartet"
    else if (temp <= -3) advice = "Gefährlich kalt, Glättegefahr"
    else if (effectiveWind > 58) advice = "Gefährlicher Sturm"

    return {
      level: "schlecht",
      emoji: "🔴",
      label: "nicht empfehlenswert",
      advice,
    }
  }

  // 🟠 Kritisch
  // Wind 43-58 km/h (was 12-16 m/s), Rain 2-5mm/h, Temp 0 to -3°C, Pop 60-80%
  if (
    (popPercent >= 60 && popPercent <= 80) ||
    (rain >= 2 && rain <= 5) ||
    (effectiveWind >= 43 && effectiveWind <= 58) ||
    (temp > -3 && temp <= 0)
  ) {
    let advice = ""
    if (popPercent >= 60) advice = "Hohe Regenwahrscheinlichkeit – Regenkleidung empfohlen"
    else if (rain >= 2) advice = "Mäßiger Regen erwartet – volle Regenausrüstung empfohlen"
    else if (effectiveWind >= 43) advice = "Starker Wind – Vorsicht bei Seitenwind"
    else if (temp <= 0) advice = "Frostgefahr – auf Glätte achten"

    return {
      level: "kritisch",
      emoji: "🟠",
      label: "kritisch",
      advice,
    }
  }

  // 🟡 OK mit Vorsicht
  // Wind 29-43 km/h (was 8-12 m/s), Rain 0.5-2mm/h, Pop 20-60%
  if (
    (popPercent >= 20 && popPercent < 60) ||
    (rain >= 0.5 && rain < 2) ||
    (effectiveWind >= 29 && effectiveWind < 43)
  ) {
    let advice = ""
    if (popPercent >= 20) advice = "Regenjacke empfohlen"
    else if (rain >= 0.5) advice = "Leichter Regen möglich – Regenschutz mitnehmen"
    else if (effectiveWind >= 29) advice = "Mäßiger Wind – angepasst fahren"

    return {
      level: "ok",
      emoji: "🟡",
      label: "ok mit Vorsicht",
      advice,
    }
  }

  // 🟢 Gut fahrbar
  return {
    level: "gut",
    emoji: "🟢",
    label: "gut fahrbar",
    advice: "Ideale Bedingungen fürs Radfahren!",
  }
}

export function getClothingAdvice(temp: number): string | null {
  if (temp < 0) {
    return "🧥 Winterjacke, Handschuhe und Mütze empfohlen"
  }
  if (temp < 5) {
    return "🧤 Warme Jacke und Handschuhe empfohlen"
  }
  if (temp > 25) {
    return "👕 Leichte Kleidung, viel trinken!"
  }
  return null
}

export function getWindDirection(deg: number): string {
  const directions = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"]
  const index = Math.round(deg / 45) % 8
  return directions[index]
}

export function getWeatherEmoji(clouds: number, pop: number, rain: number): string {
  const popPercent = pop * 100

  if (rain > 2 || popPercent > 60) return "🌧️"
  if (rain > 0 || popPercent > 30) return "🌦️"
  if (clouds > 80) return "☁️"
  if (clouds > 50) return "🌥️"
  if (clouds > 20) return "⛅"
  return "☀️"
}
