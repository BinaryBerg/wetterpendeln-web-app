"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bike, Settings, CloudSun, MapPin, Loader2, ChevronDown, Database } from "lucide-react"
import { ShiftEditor } from "@/components/shift-editor"
import { WeatherResults } from "@/components/weather-results"
import { fetchWeatherData, geocodeLocation } from "@/lib/weather-api"
import { findRelevantSlots } from "@/lib/slot-logic"
import type { Shift, WeatherSlot, Settings as AppSettings } from "@/lib/types"

const DEFAULT_SHIFTS: Shift[] = [
  { id: "1", name: "Frühschicht", hinStart: "05:00", hinEnd: "06:00", rueckStart: "14:30", rueckEnd: "15:30" },
  { id: "2", name: "Spätschicht", hinStart: "13:00", hinEnd: "14:00", rueckStart: "22:30", rueckEnd: "23:00" },
  { id: "3", name: "Mittelschicht", hinStart: "09:00", hinEnd: "10:00", rueckStart: "18:00", rueckEnd: "19:00" },
  { id: "4", name: "Nachtschicht", hinStart: "21:00", hinEnd: "22:00", rueckStart: "06:00", rueckEnd: "07:00" },
]

const DEFAULT_SETTINGS: AppSettings = {
  startOrt: "Leopoldshöhe",
  zielOrt: "Lemgo",
  shifts: DEFAULT_SHIFTS,
}

export function WeatherApp() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [selectedShift, setSelectedShift] = useState<string>("")
  const [zeitraum, setZeitraum] = useState<"heute" | "morgen" | "5tage">("heute")
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<WeatherSlot[]>([])
  const [startOrtName, setStartOrtName] = useState("")
  const [zielOrtName, setZielOrtName] = useState("")

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("wetterpendeln-settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
        if (parsed.shifts?.length > 0) {
          setSelectedShift(parsed.shifts[0].id)
        }
      } catch {
        console.error("Fehler beim Laden der Einstellungen")
      }
    } else if (DEFAULT_SHIFTS.length > 0) {
      setSelectedShift(DEFAULT_SHIFTS[0].id)
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("wetterpendeln-settings", JSON.stringify(settings))
  }, [settings])

  const handleFetchWeather = async () => {
    const shift = settings.shifts.find((s) => s.id === selectedShift)
    if (!shift) {
      setError("Bitte wählen Sie eine Schicht aus.")
      return
    }

    if (!settings.startOrt || !settings.zielOrt) {
      setError("Bitte geben Sie Start- und Zielort ein.")
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

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="text-center mb-10">
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm border border-cyan-500/20">
            <Bike className="h-8 w-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Wetterpendeln
          </h1>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-500/20">
            <CloudSun className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Wettervorhersage für Radpendler - finde das beste Wetter für deinen Arbeitsweg
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <Database className="h-4 w-4" />
          <span>Wetterdaten vom Deutschen Wetterdienst (DWD ICON-D2)</span>
        </div>
      </header>

      <div className="flex justify-end mb-6">
        <Button
          variant="outline"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-500/30 text-slate-300 backdrop-blur-sm transition-all duration-300 min-h-[44px] px-5"
        >
          <Settings className="h-4 w-4 text-cyan-400" />
          <span>{showSettings ? "Einstellungen ausblenden" : "Einstellungen"}</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showSettings ? "rotate-180" : ""}`} />
        </Button>
      </div>

      <div
        className={`grid transition-all duration-500 ease-out ${showSettings ? "grid-rows-[1fr] opacity-100 mb-6" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl shadow-cyan-500/5">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                <Settings className="h-5 w-5 text-cyan-400" />
                Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Locations */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startOrt" className="flex items-center gap-2 text-slate-300">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    Startort
                  </Label>
                  <Input
                    id="startOrt"
                    value={settings.startOrt}
                    onChange={(e) => updateSettings({ startOrt: e.target.value })}
                    placeholder="z.B. Leopoldshöhe"
                    className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zielOrt" className="flex items-center gap-2 text-slate-300">
                    <MapPin className="h-4 w-4 text-rose-400" />
                    Zielort
                  </Label>
                  <Input
                    id="zielOrt"
                    value={settings.zielOrt}
                    onChange={(e) => updateSettings({ zielOrt: e.target.value })}
                    placeholder="z.B. Lemgo"
                    className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 backdrop-blur-sm">
                <p className="text-sm">
                  Diese App nutzt die kostenlosen Wetterdaten des Deutschen Wetterdienstes (DWD) über die Open-Meteo
                  API. Es wird kein API-Key benötigt.
                </p>
              </div>

              {/* Shift Editor */}
              <ShiftEditor shifts={settings.shifts} onShiftsChange={(shifts) => updateSettings({ shifts })} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mb-6 bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl shadow-cyan-500/5">
        <CardContent className="pt-6 space-y-5">
          {/* Shift Selection */}
          <div className="space-y-2">
            <Label className="text-slate-300">Schicht auswählen</Label>
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger className="bg-white/5 border-white/10 text-slate-200 focus:border-cyan-500/50 focus:ring-cyan-500/20 min-h-[48px]">
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
            <div className="flex gap-3 flex-wrap">
              {[
                { value: "heute", label: "Heute" },
                { value: "morgen", label: "Morgen" },
                { value: "5tage", label: "5 Tage" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  onClick={() => setZeitraum(option.value as typeof zeitraum)}
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
