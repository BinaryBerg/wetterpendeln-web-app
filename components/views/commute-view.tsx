"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  CloudSun,
  MapPin,
  ArrowRight,
  AlertTriangle,
  Droplets,
  Wind,
  Thermometer,
  Shirt,
  Umbrella,
  Snowflake,
} from "lucide-react"
import { WeatherResults } from "@/components/weather-results"
import { fetchWeatherData, geocodeLocation } from "@/lib/weather-api"
import { findRelevantSlots } from "@/lib/slot-logic"
import { evaluateRideability } from "@/lib/rideability"
import type { Settings, WeatherSlot } from "@/lib/types"

interface CommuteViewProps {
  settings: Settings
  onSettingsChange: (updates: Partial<Settings>) => void
}

interface TodaySummaryProps {
  results: WeatherSlot[]
}

function TodaySummary({ results }: TodaySummaryProps) {
  // Only show today's slots
  const today = new Date().toISOString().split("T")[0]
  const todaySlots = results.filter((slot) => slot.datetime.startsWith(today))

  if (todaySlots.length === 0) return null

  // Aggregate worst-case values
  const worstRideability = todaySlots.reduce(
    (worst, slot) => {
      const result = evaluateRideability(slot)
      const levels = { schlecht: 4, kritisch: 3, ok: 2, gut: 1 }
      if (levels[result.level] > levels[worst.level]) {
        return result
      }
      return worst
    },
    { level: "gut" as const, emoji: "🟢", label: "gut fahrbar", advice: "" },
  )

  const maxPop = Math.max(...todaySlots.map((s) => s.pop)) * 100
  const maxWind = Math.max(...todaySlots.map((s) => Math.max(s.windSpeed, s.windGust)))
  const maxRain = Math.max(...todaySlots.map((s) => s.rain))
  const minTemp = Math.min(...todaySlots.map((s) => s.temp))
  const maxTemp = Math.max(...todaySlots.map((s) => s.temp))

  // Generate equipment recommendations
  const recommendations: { icon: typeof Umbrella; text: string }[] = []

  if (maxPop > 30 || maxRain > 0.5) {
    recommendations.push({ icon: Umbrella, text: "Regenjacke" })
  }
  if (minTemp < 5) {
    recommendations.push({ icon: Snowflake, text: "Handschuhe" })
  }
  if (minTemp < 10 || maxWind > 30) {
    recommendations.push({ icon: Shirt, text: "Windjacke" })
  }
  if (minTemp < 0) {
    recommendations.push({ icon: Thermometer, text: "Winterausrüstung" })
  }

  const levelColors = {
    gut: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    ok: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
    kritisch: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
    schlecht: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
  }

  const levelTextColors = {
    gut: "text-emerald-400",
    ok: "text-yellow-400",
    kritisch: "text-orange-400",
    schlecht: "text-rose-400",
  }

  return (
    <Card className={`bg-gradient-to-br ${levelColors[worstRideability.level]} backdrop-blur-xl border`}>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className={`h-5 w-5 ${levelTextColors[worstRideability.level]}`} />
          <h3 className="text-lg font-semibold text-slate-200">Heute in Kurzform</h3>
        </div>

        {/* Main Status */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{worstRideability.emoji}</span>
          <div>
            <p className={`text-xl font-bold ${levelTextColors[worstRideability.level]}`}>{worstRideability.label}</p>
            <p className="text-sm text-slate-400">{worstRideability.advice}</p>
          </div>
        </div>

        {/* Weather Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
            <Droplets className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-xs text-slate-400">Regen</p>
              <p className="text-sm font-medium text-slate-200">{Math.round(maxPop)}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
            <Wind className="h-4 w-4 text-cyan-400" />
            <div>
              <p className="text-xs text-slate-400">Wind</p>
              <p className="text-sm font-medium text-slate-200">{Math.round(maxWind)} km/h</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
            <Thermometer className="h-4 w-4 text-orange-400" />
            <div>
              <p className="text-xs text-slate-400">Temp</p>
              <p className="text-sm font-medium text-slate-200">
                {Math.round(minTemp)}-{Math.round(maxTemp)}°
              </p>
            </div>
          </div>
        </div>

        {/* Equipment Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-slate-400 mb-2">Empfehlung:</p>
            <div className="flex flex-wrap gap-2">
              {recommendations.map((rec, idx) => {
                const Icon = rec.icon
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-cyan-500/20 text-cyan-300 text-sm rounded-full"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {rec.text}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CommuteView({ settings, onSettingsChange }: CommuteViewProps) {
  const [selectedShift, setSelectedShift] = useState<string>("")
  const [zeitraum, setZeitraum] = useState<"heute" | "morgen" | "5tage">("heute")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<WeatherSlot[]>([])
  const [startOrtName, setStartOrtName] = useState("")
  const [zielOrtName, setZielOrtName] = useState("")

  // Set default shift on mount
  useEffect(() => {
    if (settings.shifts.length > 0 && !selectedShift) {
      setSelectedShift(settings.shifts[0].id)
    }
  }, [settings.shifts, selectedShift])

  const handleFetchWeather = async () => {
    const shift = settings.shifts.find((s) => s.id === selectedShift)
    if (!shift) {
      setError("Bitte wählen Sie eine Schicht aus.")
      return
    }

    if (!settings.startOrt || !settings.zielOrt) {
      setError("Bitte konfigurieren Sie Start- und Zielort in den Einstellungen.")
      return
    }

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const [startCoords, zielCoords] = await Promise.all([
        geocodeLocation(settings.startOrt),
        geocodeLocation(settings.zielOrt),
      ])

      setStartOrtName(startCoords.name)
      setZielOrtName(zielCoords.name)

      const [startWeather, zielWeather] = await Promise.all([
        fetchWeatherData(startCoords.lat, startCoords.lon),
        fetchWeatherData(zielCoords.lat, zielCoords.lon),
      ])

      const slots = findRelevantSlots(startWeather, zielWeather, shift, zeitraum, startCoords.name, zielCoords.name)
      setResults(slots)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {results.length > 0 && <TodaySummary results={results} />}

      {/* Route Display */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="pt-5">
          <div className="flex items-center justify-center gap-3 text-lg">
            <div className="flex items-center gap-2 text-emerald-400">
              <MapPin className="h-5 w-5" />
              <span className="font-medium">{settings.startOrt || "Start nicht gesetzt"}</span>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-500" />
            <div className="flex items-center gap-2 text-rose-400">
              <MapPin className="h-5 w-5" />
              <span className="font-medium">{settings.zielOrt || "Ziel nicht gesetzt"}</span>
            </div>
          </div>
          <p className="text-center text-sm text-slate-400 mt-2">Route kann in den Einstellungen geändert werden</p>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="pt-6 space-y-5">
          {/* Shift Selection */}
          <div className="space-y-2">
            <Label className="text-slate-300">Schicht auswählen</Label>
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger
                className="bg-white/5 border-white/10 text-slate-200 focus:border-cyan-500/50 focus:ring-cyan-500/20 min-h-[48px]"
                aria-label="Schicht auswählen"
              >
                <SelectValue placeholder="Schicht wählen..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2035] border-white/10 backdrop-blur-xl">
                {settings.shifts.map((shift) => (
                  <SelectItem
                    key={shift.id}
                    value={shift.id}
                    className="text-slate-200 focus:bg-cyan-500/20 focus:text-white min-h-[44px]"
                  >
                    {shift.name} (Hin: {shift.hinStart}-{shift.hinEnd}, Rück: {shift.rueckStart}-{shift.rueckEnd})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Period */}
          <div className="space-y-3">
            <Label className="text-slate-300">Zeitraum</Label>
            <div className="flex gap-3 flex-wrap" role="group" aria-label="Zeitraum auswählen">
              {[
                { value: "heute", label: "Heute" },
                { value: "morgen", label: "Morgen" },
                { value: "5tage", label: "5 Tage" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  onClick={() => setZeitraum(option.value as typeof zeitraum)}
                  aria-pressed={zeitraum === option.value}
                  className={`min-h-[48px] min-w-[100px] transition-all duration-300 ${
                    zeitraum === option.value
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 border-transparent text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:from-cyan-400 hover:to-blue-400"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-cyan-500/30"
                  }`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleFetchWeather}
            disabled={loading || !selectedShift || !settings.startOrt || !settings.zielOrt}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 disabled:opacity-50 disabled:shadow-none min-h-[56px] text-lg font-medium"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Wetter wird abgerufen...
              </>
            ) : (
              <>
                <CloudSun className="mr-2 h-5 w-5" />
                Wetter abrufen
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 backdrop-blur-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <WeatherResults
          results={results}
          startOrt={startOrtName || settings.startOrt}
          zielOrt={zielOrtName || settings.zielOrt}
        />
      )}
    </div>
  )
}
