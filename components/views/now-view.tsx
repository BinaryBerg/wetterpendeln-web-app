"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MapPin,
  Navigation,
  Loader2,
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  Gauge,
  Search,
  Sun,
  Moon,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  CloudSun,
  CloudMoon,
  Bike,
  AlertCircle,
} from "lucide-react"
import {
  fetchWeatherData,
  geocodeSearch,
  parseCurrentWeather,
  parseHourlyForecast,
  getRainPrediction,
  type GeoSearchResult,
} from "@/lib/weather-api"
import { getWindDirection, evaluateRideability } from "@/lib/rideability"
import { useLocationStore } from "@/lib/location-store"
import type { Settings, CurrentWeather, HourlyForecast, WeatherSlot } from "@/lib/types"

interface NowViewProps {
  settings: Settings
}

export function NowView({ settings }: NowViewProps) {
  const { location, isLoading: gpsLoading, error: locationError, updateFromGPS, updateManual, clearError } = useLocationStore()
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null)
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([])
  const [rainPrediction, setRainPrediction] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<GeoSearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [commuteCheck, setCommuteCheck] = useState<{
    rideability: ReturnType<typeof evaluateRideability>
    shiftName: string
    direction: string
  } | null>(null)

  const loadWeather = useCallback(async (lat: number, lon: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWeatherData(lat, lon, true)
      const current = parseCurrentWeather(data)
      const hourly = parseHourlyForecast(data, 12)
      if (current) {
        setCurrentWeather(current)
        setHourlyForecast(hourly)
        setRainPrediction(getRainPrediction(hourly))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Wetterdaten")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (location.lat !== null && location.lon !== null) {
      loadWeather(location.lat, location.lon)
    }
  }, [location.lat, location.lon, loadWeather])

  const getCurrentShift = () => {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    for (const shift of settings.shifts) {
      const [hinStartH, hinStartM] = shift.hinStart.split(":").map(Number)
      const [hinEndH, hinEndM] = shift.hinEnd.split(":").map(Number)
      const [rueckStartH, rueckStartM] = shift.rueckStart.split(":").map(Number)
      const [rueckEndH, rueckEndM] = shift.rueckEnd.split(":").map(Number)

      const hinStart = hinStartH * 60 + hinStartM
      const hinEnd = hinEndH * 60 + hinEndM
      const rueckStart = rueckStartH * 60 + rueckStartM
      const rueckEnd = rueckEndH * 60 + rueckEndM

      if (currentMinutes >= hinStart - 120 && currentMinutes <= hinEnd) {
        return { shift, direction: "Hinfahrt" }
      }
      if (currentMinutes >= rueckStart - 120 && currentMinutes <= rueckEnd) {
        return { shift, direction: "R\u00fcckfahrt" }
      }
    }
    if (settings.shifts.length > 0) {
      return { shift: settings.shifts[0], direction: "Hinfahrt" }
    }
    return null
  }

  const handleCheckNow = async () => {
    clearError()
    setCommuteCheck(null)
    await updateFromGPS()

    if (location.lat && location.lon && currentWeather) {
      const shiftInfo = getCurrentShift()
      if (shiftInfo) {
        const slot: WeatherSlot = {
          datetime: new Date().toISOString(),
          date: new Date().toLocaleDateString("de-DE"),
          time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
          temp: currentWeather.temp,
          feelsLike: currentWeather.feelsLike,
          pop: 0,
          rain: 0,
          windSpeed: currentWeather.windSpeed,
          windGust: currentWeather.windGust,
          windDeg: currentWeather.windDeg,
          clouds: currentWeather.clouds,
          description: currentWeather.description,
          weatherCode: currentWeather.weatherCode,
          type: shiftInfo.direction === "Hinfahrt" ? "hin" : "rueck",
          shiftName: shiftInfo.shift.name,
          model: "icon_d2",
        }
        const rideability = evaluateRideability(slot)
        setCommuteCheck({
          rideability,
          shiftName: shiftInfo.shift.name,
          direction: shiftInfo.direction,
        })
      }
    }
  }

  useEffect(() => {
    if (location.lat && location.lon && currentWeather && !commuteCheck) {
      const shiftInfo = getCurrentShift()
      if (shiftInfo) {
        const slot: WeatherSlot = {
          datetime: new Date().toISOString(),
          date: new Date().toLocaleDateString("de-DE"),
          time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
          temp: currentWeather.temp,
          feelsLike: currentWeather.feelsLike,
          pop: 0,
          rain: 0,
          windSpeed: currentWeather.windSpeed,
          windGust: currentWeather.windGust,
          windDeg: currentWeather.windDeg,
          clouds: currentWeather.clouds,
          description: currentWeather.description,
          weatherCode: currentWeather.weatherCode,
          type: shiftInfo.direction === "Hinfahrt" ? "hin" : "rueck",
          shiftName: shiftInfo.shift.name,
          model: "icon_d2",
        }
        const rideability = evaluateRideability(slot)
        setCommuteCheck({
          rideability,
          shiftName: shiftInfo.shift.name,
          direction: shiftInfo.direction,
        })
      }
    }
  }, [currentWeather, location, settings.shifts])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    try {
      const results = await geocodeSearch(searchQuery)
      setSearchResults(results)
      setShowSearch(true)
    } catch {
      setSearchResults([])
    }
  }

  const selectLocation = (result: GeoSearchResult) => {
    const name = result.name + (result.admin1 ? `, ${result.admin1}` : "")
    updateManual(result.lat, result.lon, name)
    setShowSearch(false)
    setSearchQuery("")
    setSearchResults([])
  }

  const getWeatherIcon = (code: number, isDay: boolean) => {
    if (code === 0) return isDay ? Sun : Moon
    if (code <= 3) return isDay ? CloudSun : CloudMoon
    if (code <= 48) return CloudFog
    if (code <= 57) return CloudDrizzle
    if (code <= 67) return CloudRain
    if (code <= 77) return CloudSnow
    if (code <= 82) return CloudRain
    if (code <= 86) return CloudSnow
    if (code >= 95) return CloudLightning
    return Cloud
  }

  const WeatherIconComponent = currentWeather ? getWeatherIcon(currentWeather.weatherCode, currentWeather.isDay) : Cloud

  const levelColors = {
    gut: "from-emerald-500 to-emerald-600",
    ok: "from-yellow-500 to-yellow-600",
    kritisch: "from-orange-500 to-orange-600",
    schlecht: "from-rose-500 to-rose-600",
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Main CTA Section */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border-cyan-500/20 overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <h2 className="text-center text-lg font-semibold text-slate-200 mb-4">
            Jetzt Wetter- & Pendeltauglichkeit pr\u00fcfen
          </h2>
          <Button
            onClick={handleCheckNow}
            disabled={gpsLoading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white min-h-[56px] text-base sm:text-lg font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300"
            size="lg"
          >
            {gpsLoading ? (
              <>
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mr-2 sm:mr-3" />
                Standort wird ermittelt...
              </>
            ) : (
              <>
                <Bike className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                Standort per GPS ermitteln & pr\u00fcfen
              </>
            )}
          </Button>
          <p className="text-center text-xs sm:text-sm text-slate-400 mt-3">GPS-Standort + automatische Schichterkennung</p>
        </CardContent>
      </Card>

      {/* Commute Check Result */}
      {commuteCheck && (
        <Card className={`bg-gradient-to-r ${levelColors[commuteCheck.rideability.level]} bg-opacity-20 backdrop-blur-xl border-white/20`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-3xl sm:text-4xl">{commuteCheck.rideability.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wide">
                  {commuteCheck.shiftName} - {commuteCheck.direction}
                </p>
                <p className="text-lg sm:text-xl font-bold text-white truncate">{commuteCheck.rideability.label}</p>
                <p className="text-xs sm:text-sm text-white/80">{commuteCheck.rideability.advice}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Selector */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="pt-4 space-y-3">
          <Button
            onClick={updateFromGPS}
            disabled={gpsLoading}
            variant="outline"
            className="w-full bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-cyan-500/30 min-h-[48px]"
          >
            {gpsLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Navigation className="h-5 w-5 mr-2" />}
            Aktueller Standort
          </Button>

          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="PLZ oder Ort eingeben..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 min-h-[48px]"
                  aria-label="Ort suchen"
                />
              </div>
              <Button
                onClick={handleSearch}
                variant="outline"
                className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 min-h-[48px] px-4 sm:px-6"
              >
                Suchen
              </Button>
            </div>

            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a2035] border border-white/10 rounded-xl shadow-xl z-50 max-h-64 overflow-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectLocation(result)}
                    className="w-full px-4 py-3 text-left hover:bg-cyan-500/10 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0 min-h-[48px]"
                  >
                    <MapPin className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-slate-200 truncate">{result.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {result.admin1 && `${result.admin1}, `}
                        {result.country}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {location.cityLabel && (
            <div className="flex items-center gap-2 text-cyan-400">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium truncate">{location.cityLabel}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Messages */}
      {(error || locationError) && (
        <div className="p-3 sm:p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error || locationError}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      )}

      {/* Current Weather */}
      {currentWeather && !loading && (
        <>
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
                  <WeatherIconComponent className="h-10 w-10 sm:h-12 sm:w-12 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-3xl sm:text-4xl font-bold text-slate-100">{Math.round(currentWeather.temp)}\u00b0C</p>
                  <p className="text-base sm:text-lg text-slate-300 mt-1 truncate">{currentWeather.description}</p>
                  <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1 mt-1">
                    <Thermometer className="h-3 w-3" />
                    gef\u00fchlt {Math.round(currentWeather.feelsLike)}\u00b0C
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-5">
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/5 rounded-xl">
                  <Wind className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400">Wind</p>
                    <p className="text-xs sm:text-sm text-slate-200 truncate">
                      {Math.round(currentWeather.windSpeed)} km/h {getWindDirection(currentWeather.windDeg)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/5 rounded-xl">
                  <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-400">B\u00f6en</p>
                    <p className="text-xs sm:text-sm text-slate-200">{Math.round(currentWeather.windGust)} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/5 rounded-xl">
                  <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Luftfeuchtigkeit</p>
                    <p className="text-xs sm:text-sm text-slate-200">{currentWeather.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/5 rounded-xl">
                  <Cloud className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Bew\u00f6lkung</p>
                    <p className="text-xs sm:text-sm text-slate-200">{currentWeather.clouds}%</p>
                  </div>
                </div>
              </div>

              {rainPrediction && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-blue-300 text-xs sm:text-sm">{rainPrediction}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hourly Timeline */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="pt-4">
              <h3 className="text-base sm:text-lg font-medium text-slate-200 mb-3">N\u00e4chste Stunden</h3>
              <div className="overflow-x-auto -mx-4 px-4 pb-2">
                <div className="flex gap-2 sm:gap-3" style={{ minWidth: "max-content" }}>
                  {hourlyForecast.map((hour, idx) => {
                    const time = new Date(hour.time)
                    const HourIcon = getWeatherIcon(hour.weatherCode, time.getHours() >= 6 && time.getHours() < 20)
                    const hasRain = hour.rain > 0.1 || hour.pop > 0.5
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col items-center p-2 sm:p-3 rounded-xl min-w-[60px] sm:min-w-[70px] transition-colors ${
                          hasRain ? "bg-blue-500/10 border border-blue-500/20" : "bg-white/5"
                        }`}
                      >
                        <p className="text-[10px] sm:text-xs text-slate-400 mb-1.5 sm:mb-2">
                          {time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <HourIcon className={`h-5 w-5 sm:h-6 sm:w-6 mb-1.5 sm:mb-2 ${hasRain ? "text-blue-400" : "text-cyan-400"}`} />
                        <p className="text-xs sm:text-sm font-medium text-slate-200">{Math.round(hour.temp)}\u00b0</p>
                        {hour.pop > 0.1 && <p className="text-[10px] sm:text-xs text-blue-400 mt-0.5 sm:mt-1">{Math.round(hour.pop * 100)}%</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
