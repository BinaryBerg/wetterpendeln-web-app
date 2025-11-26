import type { Shift, WeatherSlot, DWDForecastResponse } from "./types"
import { getWeatherDescription } from "./weather-api"

export function findRelevantSlots(
  startWeather: DWDForecastResponse,
  zielWeather: DWDForecastResponse,
  shift: Shift,
  zeitraum: "heute" | "morgen" | "5tage",
  startOrtName: string,
  zielOrtName: string,
): WeatherSlot[] {
  const results: WeatherSlot[] = []
  const now = new Date()

  // Determine which dates to check
  const datesToCheck: Date[] = []

  if (zeitraum === "heute") {
    datesToCheck.push(new Date(now))
  } else if (zeitraum === "morgen") {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    datesToCheck.push(tomorrow)
  } else {
    // 5 days
    for (let i = 0; i < 5; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      datesToCheck.push(date)
    }
  }

  for (const date of datesToCheck) {
    const dateStr = date.toISOString().split("T")[0]

    // Find Hinfahrt slot (use weather at start location)
    const hinSlot = findBestSlotInTimeWindow(startWeather, dateStr, shift.hinStart, shift.hinEnd)

    if (hinSlot) {
      results.push({
        ...hinSlot,
        type: "hin",
        shiftName: shift.name,
        date: dateStr,
      })
    }

    // Find Rückfahrt slot (use weather at destination location)
    // Note: For night shifts, Rückfahrt might be on the next day
    let rueckDateStr = dateStr
    if (shift.rueckStart < shift.hinStart) {
      // Rückfahrt is on the next day (e.g., night shift)
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      rueckDateStr = nextDay.toISOString().split("T")[0]
    }

    const rueckSlot = findBestSlotInTimeWindow(zielWeather, rueckDateStr, shift.rueckStart, shift.rueckEnd)

    if (rueckSlot) {
      results.push({
        ...rueckSlot,
        type: "rueck",
        shiftName: shift.name,
        date: dateStr, // Keep original date for grouping
      })
    }
  }

  return results
}

function findBestSlotInTimeWindow(
  forecast: DWDForecastResponse,
  dateStr: string,
  startTime: string,
  endTime: string,
): Omit<WeatherSlot, "type" | "shiftName" | "date"> | null {
  const { hourly } = forecast
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  // Find all hourly slots that match our time window
  const matchingIndices: number[] = []

  for (let i = 0; i < hourly.time.length; i++) {
    const slotTime = new Date(hourly.time[i])
    const slotDateStr = slotTime.toISOString().split("T")[0]

    if (slotDateStr !== dateStr) continue

    const slotMinutes = slotTime.getHours() * 60 + slotTime.getMinutes()

    // Check if this hour falls within our time window
    // We consider a slot if it's within or close to our window
    if (slotMinutes >= startMinutes - 30 && slotMinutes <= endMinutes + 30) {
      matchingIndices.push(i)
    }
  }

  if (matchingIndices.length === 0) {
    return null
  }

  // Find the slot closest to the middle of our time window
  const targetMinutes = (startMinutes + endMinutes) / 2
  let bestIndex = matchingIndices[0]
  let bestDiff = Number.POSITIVE_INFINITY

  for (const idx of matchingIndices) {
    const slotTime = new Date(hourly.time[idx])
    const slotMinutes = slotTime.getHours() * 60 + slotTime.getMinutes()
    const diff = Math.abs(slotMinutes - targetMinutes)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIndex = idx
    }
  }

  const i = bestIndex
  const slotTime = new Date(hourly.time[i])

  return {
    datetime: hourly.time[i],
    time: `${String(slotTime.getHours()).padStart(2, "0")}:${String(slotTime.getMinutes()).padStart(2, "0")}`,
    temp: hourly.temperature_2m[i],
    feelsLike: hourly.apparent_temperature[i],
    pop: (hourly.precipitation_probability[i] ?? 0) / 100, // Convert to 0-1
    rain: hourly.precipitation[i] ?? 0,
    windSpeed: hourly.wind_speed_10m[i],
    windGust: hourly.wind_gusts_10m[i],
    windDeg: hourly.wind_direction_10m[i],
    clouds: hourly.cloud_cover[i],
    description: getWeatherDescription(hourly.weather_code[i]),
    weatherCode: hourly.weather_code[i],
    model: "icon_d2", // ICON-D2 is used for Germany
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}
