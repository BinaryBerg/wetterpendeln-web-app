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
  geocodeLocation,
  geocodeSearch,
  parseCurrentWeather,
  parseHourlyForecast,
  getRainPrediction,
  type GeoSearchResult,
} from "@/lib/weather-api"
import { getWindDirection, evaluateRideability } from "@/lib/rideability"
import { saveLastLocation, loadLastLocation } from "@/lib/storage"
import type { Settings, CurrentWeather, HourlyForecast, WeatherSlot } from "@/lib/types"

interface NowViewProps {
  settings: Settings
}

export function NowView({ settings }: NowViewProps) {
  const [location, setLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null)
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([])
  const [rainPrediction, setRainPrediction] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<GeoSearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [commuteCheck, setCommuteCheck] = useState<{
    rideability: ReturnType<typeof evaluateRideability>
    shiftName: string
    direction: string
  } | null>(null)

  // Load weather for location
  const loadWeather = useCallback(async (lat: number, lon: number, name: string) => {
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
        setLocation({ lat, lon, name })
        saveLastLocation({ lat, lon, name })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Wetterdaten")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load - try last location or default
  useEffect(() => {
    const lastLocation = loadLastLocation()
    if (lastLocation) {
      loadWeather(lastLocation.lat, lastLocation.lon, lastLocation.name)
    } else if (settings.defaultLocation) {
      geocodeLocation(settings.defaultLocation)
        .then((loc) => {
          loadWeather(loc.lat, loc.lon, loc.name)
        })
        .catch(() => {
          // Fallback to settings.startOrt
          if (settings.startOrt) {
            geocodeLocation(settings.startOrt)
              .then((loc) => {
                loadWeather(loc.lat, loc.lon, loc.name)
              })
              .catch(() => {})
          }
        })
    }
  }, [settings.defaultLocation, settings.startOrt, loadWeather])

  const getCurrentShift = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinutes = currentHour * 60 + now.getMinutes()

    for (const shift of settings.shifts) {
      // Parse shift times
      const [hinStartH, hinStartM] = shift.hinStart.split(":").map(Number)
      const [hinEndH, hinEndM] = shift.hinEnd.split(":").map(Number)
      const [rueckStartH, rueckStartM] = shift.rueckStart.split(":").map(Number)
      const [rueckEndH, rueckEndM] = shift.rueckEnd.split(":").map(Number)

      const hinStart = hinStartH * 60 + hinStartM
      const hinEnd = hinEndH * 60 + hinEndM
      const rueckStart = rueckStartH * 60 + rueckStartM
      const rueckEnd = rueckEndH * 60 + rueckEndM

      // Check if current time is within 2 hours before any slot
      if (currentMinutes >= hinStart - 120 && currentMinutes <= hinEnd) {
        return { shift, direction: "Hinfahrt" }
      }
      if (currentMinutes >= rueckStart - 120 && currentMinutes <= rueckEnd) {
        return { shift, direction: "Rückfahrt" }
      }
    }

    // Default to first shift's next slot
    if (settings.shifts.length > 0) {
      return { shift: settings.shifts[0], direction: "Hinfahrt" }
    }
    return null
  }

  const handleCheckNow = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation wird von Ihrem Browser nicht unterstützt. Bitte geben Sie eine PLZ oder einen Ort ein.")
      return
    }

    setGpsLoading(true)
    setError(null)
    setCommuteCheck(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          // Get location name
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=de`,
          )
          const data = await response.json()
          const name = data.results?.[0]?.name || "Aktueller Standort"

          // Load weather
          await loadWeather(latitude, longitude, name)

          // Determine current shift
          const shiftInfo = getCurrentShift()
          if (shiftInfo && currentWeather) {
            // Create a weather slot for rideability check
            const slot: WeatherSlot = {
              datetime: new Date().toISOString(),
              date: new Date().toLocaleDateString("de-DE"),
              time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
              temp: currentWeather.temp,
              feelsLike: currentWeather.feelsLike,
              pop: 0, // Current weather doesn't have pop
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
        } catch {
          await loadWeather(latitude, longitude, "Aktueller Standort")
        }
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        const lastLocation = loadLastLocation()
        let errorMsg = ""
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = "Standortzugriff wurde verweigert."
            break
          case err.POSITION_UNAVAILABLE:
            errorMsg = "Standortinformationen sind nicht verfügbar."
            break
          case err.TIMEOUT:
            errorMsg = "Zeitüberschreitung bei der Standortabfrage."
            break
          default:
            errorMsg = "Ein unbekannter Fehler ist aufgetreten."
        }

        if (lastLocation) {
          errorMsg += " Letzter bekannter Standort wird verwendet."
          loadWeather(lastLocation.lat, lastLocation.lon, lastLocation.name)
        } else {
          errorMsg += " Bitte Standortfreigabe im Browser aktivieren oder PLZ/Ort eingeben."
        }
        setError(errorMsg)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  // Get current GPS location (simple version)
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setError("Geolocation wird von Ihrem Browser nicht unterstützt. Bitte geben Sie eine PLZ oder einen Ort ein.")
      return
    }

    setGpsLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=de`,
          )
          const data = await response.json()
          const name = data.results?.[0]?.name || "Aktueller Standort"
          loadWeather(latitude, longitude, name)
        } catch {
          loadWeather(latitude, longitude, "Aktueller Standort")
        }
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        const lastLocation = loadLastLocation()
        let errorMsg = ""
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = "Standortzugriff wurde verweigert."
            break
          case err.POSITION_UNAVAILABLE:
            errorMsg = "Standortinformationen sind nicht verfügbar."
            break
          case err.TIMEOUT:
            errorMsg = "Zeitüberschreitung bei der Standortabfrage."
            break
          default:
            errorMsg = "Ein unbekannter Fehler ist aufgetreten."
        }

        if (lastLocation) {
          errorMsg += " Letzter bekannter Standort wird verwendet."
          loadWeather(lastLocation.lat, lastLocation.lon, lastLocation.name)
        } else {
          errorMsg += " Bitte Standortfreigabe im Browser aktivieren oder PLZ/Ort eingeben."
        }
        setError(errorMsg)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  // Search locations
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
    loadWeather(result.lat, result.lon, name)
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border-cyan-500/20 overflow-hidden">
        <CardContent className="pt-6 pb-6">
          <Button
            onClick={handleCheckNow}
            disabled={gpsLoading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white min-h-[64px] text-lg font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300"
            size="lg"
          >
            {gpsLoading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin mr-3" />
                Standort wird ermittelt...
              </>
            ) : (
              <>
                <Bike className="h-6 w-6 mr-3" />
                Jetzt Wetter & Pendel-Tauglichkeit prüfen
              </>
            )}
          </Button>
          <p className="text-center text-sm text-slate-400 mt-3">GPS-Standort + automatische Schichterkennung</p>
        </CardContent>
      </Card>

      {commuteCheck && (
        <Card
          className={`bg-gradient-to-r ${levelColors[commuteCheck.rideability.level]} bg-opacity-20 backdrop-blur-xl border-white/20`}
        >
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{commuteCheck.rideability.emoji}</span>
              <div className="flex-1">
                <p className="text-xs text-white/70 uppercase tracking-wide">
                  {commuteCheck.shiftName} - {commuteCheck.direction}
                </p>
                <p className="text-xl font-bold text-white">{commuteCheck.rideability.label}</p>
                <p className="text-sm text-white/80">{commuteCheck.rideability.advice}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Selector */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="pt-5 space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={handleGetGPS}
              disabled={gpsLoading}
              variant="outline"
              className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-cyan-500/30 min-h-[48px]"
            >
              {gpsLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Navigation className="h-5 w-5 mr-2" />}
              Aktueller Standort
            </Button>
          </div>

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
                className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 min-h-[48px] px-6"
              >
                Suchen
              </Button>
            </div>

            {/* Search Results Dropdown */}
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a2035] border border-white/10 rounded-xl shadow-xl z-50 max-h-64 overflow-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectLocation(result)}
                    className="w-full px-4 py-3 text-left hover:bg-cyan-500/10 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0 min-h-[48px]"
                  >
                    <MapPin className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    <div>
                      <p className="text-slate-200">{result.name}</p>
                      <p className="text-xs text-slate-400">
                        {result.admin1 && `${result.admin1}, `}
                        {result.country}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {location && (
            <div className="flex items-center gap-2 text-cyan-400">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{location.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
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
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
                  <WeatherIconComponent className="h-12 w-12 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-4xl font-bold text-slate-100">{Math.round(currentWeather.temp)}°C</p>
                  <p className="text-lg text-slate-300 mt-1">{currentWeather.description}</p>
                  <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                    <Thermometer className="h-3 w-3" />
                    gefühlt {Math.round(currentWeather.feelsLike)}°C
                  </p>
                </div>
              </div>

              {/* Weather Details Grid */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <Wind className="h-5 w-5 text-cyan-400" />
                  <div>
                    <p className="text-xs text-slate-400">Wind</p>
                    <p className="text-slate-200">
                      {Math.round(currentWeather.windSpeed)} km/h {getWindDirection(currentWeather.windDeg)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <Gauge className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="text-xs text-slate-400">Böen</p>
                    <p className="text-slate-200">{Math.round(currentWeather.windGust)} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <Droplets className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-xs text-slate-400">Luftfeuchtigkeit</p>
                    <p className="text-slate-200">{currentWeather.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <Cloud className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">Bewölkung</p>
                    <p className="text-slate-200">{currentWeather.clouds}%</p>
                  </div>
                </div>
              </div>

              {/* Rain Prediction Summary */}
              {rainPrediction && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-blue-300 text-sm">{rainPrediction}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hourly Timeline */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="pt-5">
              <h3 className="text-lg font-medium text-slate-200 mb-4">Nächste Stunden</h3>
              <div className="overflow-x-auto -mx-5 px-5 pb-2">
                <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                  {hourlyForecast.map((hour, idx) => {
                    const time = new Date(hour.time)
                    const HourIcon = getWeatherIcon(hour.weatherCode, time.getHours() >= 6 && time.getHours() < 20)
                    const hasRain = hour.rain > 0.1 || hour.pop > 0.5

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col items-center p-3 rounded-xl min-w-[70px] transition-colors ${
                          hasRain ? "bg-blue-500/10 border border-blue-500/20" : "bg-white/5"
                        }`}
                      >
                        <p className="text-xs text-slate-400 mb-2">
                          {time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <HourIcon className={`h-6 w-6 mb-2 ${hasRain ? "text-blue-400" : "text-cyan-400"}`} />
                        <p className="text-sm font-medium text-slate-200">{Math.round(hour.temp)}°</p>
                        {hour.pop > 0.1 && <p className="text-xs text-blue-400 mt-1">{Math.round(hour.pop * 100)}%</p>}
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
