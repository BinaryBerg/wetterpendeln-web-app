export interface Shift {
  id: string
  name: string
  hinStart: string // HH:mm
  hinEnd: string // HH:mm
  rueckStart: string
  rueckEnd: string
}

export interface Route {
  id: string
  name: string
  startOrt: string
  zielOrt: string
  shiftId: string
}

export interface Settings {
  startOrt: string
  zielOrt: string
  shifts: Shift[]
  routes: Route[]
  defaultLocation: string
  units: "metric" | "imperial"
}

export interface GeoLocation {
  lat: number
  lon: number
  name: string
}

export interface WeatherSlot {
  datetime: string
  date: string
  time: string
  temp: number
  feelsLike: number
  pop: number // 0-1
  rain: number // mm/h
  windSpeed: number // km/h
  windGust: number // km/h
  windDeg: number
  clouds: number // %
  description: string
  weatherCode: number // WMO weather code
  type: "hin" | "rueck"
  shiftName: string
  model: "icon_d2" | "icon_eu" | "icon_global"
}

export interface CurrentWeather {
  temp: number
  feelsLike: number
  humidity: number
  pressure: number
  windSpeed: number
  windGust: number
  windDeg: number
  clouds: number
  weatherCode: number
  description: string
  isDay: boolean
}

export interface HourlyForecast {
  time: string
  temp: number
  pop: number
  rain: number
  weatherCode: number
  windSpeed: number
  description: string
}

export interface DWDHourlyData {
  time: string[]
  temperature_2m: number[]
  apparent_temperature: number[]
  precipitation_probability: number[]
  precipitation: number[]
  rain: number[]
  weather_code: number[]
  cloud_cover: number[]
  wind_speed_10m: number[]
  wind_direction_10m: number[]
  wind_gusts_10m: number[]
}

export interface DWDCurrentData {
  time: string
  temperature_2m: number
  apparent_temperature: number
  relative_humidity_2m: number
  surface_pressure: number
  precipitation: number
  weather_code: number
  cloud_cover: number
  wind_speed_10m: number
  wind_direction_10m: number
  wind_gusts_10m: number
  is_day: number
}

export interface DWDForecastResponse {
  latitude: number
  longitude: number
  timezone: string
  current?: DWDCurrentData
  hourly: DWDHourlyData
}

// Keep for backwards compatibility but mark as deprecated
/** @deprecated Use DWDForecastResponse instead */
export interface OpenWeatherForecastItem {
  dt: number
  dt_txt: string
  main: {
    temp: number
    feels_like: number
  }
  pop: number
  rain?: {
    "3h"?: number
  }
  wind: {
    speed: number
    deg: number
  }
  clouds: {
    all: number
  }
  weather: Array<{
    description: string
  }>
}

/** @deprecated Use DWDForecastResponse instead */
export interface OpenWeatherForecast {
  list: OpenWeatherForecastItem[]
}
