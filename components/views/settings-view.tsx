"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Route, Info, Check } from "lucide-react"
import { ShiftEditor } from "@/components/shift-editor"
import type { Settings } from "@/lib/types"

interface SettingsViewProps {
  settings: Settings
  onSettingsChange: (updates: Partial<Settings>) => void
}

export function SettingsView({ settings, onSettingsChange }: SettingsViewProps) {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Route Settings */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
            <Route className="h-5 w-5 text-cyan-400" />
            Pendelstrecke
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startOrt" className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-4 w-4 text-emerald-400" />
                Startort (Wohnort)
              </Label>
              <Input
                id="startOrt"
                value={settings.startOrt}
                onChange={(e) => onSettingsChange({ startOrt: e.target.value })}
                placeholder="z.B. Leopoldshöhe"
                className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 min-h-[48px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zielOrt" className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-4 w-4 text-rose-400" />
                Zielort (Arbeitsplatz)
              </Label>
              <Input
                id="zielOrt"
                value={settings.zielOrt}
                onChange={(e) => onSettingsChange({ zielOrt: e.target.value })}
                placeholder="z.B. Lemgo"
                className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 min-h-[48px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultLocation" className="flex items-center gap-2 text-slate-300">
              <MapPin className="h-4 w-4 text-cyan-400" />
              Standardort für Live-Wetter
            </Label>
            <Input
              id="defaultLocation"
              value={settings.defaultLocation}
              onChange={(e) => onSettingsChange({ defaultLocation: e.target.value })}
              placeholder="z.B. Leopoldshöhe"
              className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 min-h-[48px]"
            />
            <p className="text-xs text-slate-500">Wird verwendet, wenn kein GPS-Standort verfügbar ist</p>
          </div>
        </CardContent>
      </Card>

      {/* Shift Settings */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-400" />
            Schichtprofile
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ShiftEditor shifts={settings.shifts} onShiftsChange={(shifts) => onSettingsChange({ shifts })} />
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-emerald-500/10 border-emerald-500/20">
        <CardContent className="pt-5">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-emerald-300">
              <p>
                <strong>Datenquelle:</strong> Diese App nutzt kostenlose Wetterdaten des Deutschen Wetterdienstes (DWD)
                über die Open-Meteo API. Es wird kein API-Key benötigt.
              </p>
              <p>
                <strong>Modell:</strong> ICON-D2 für Deutschland (2,2 km Auflösung) mit automatischem Fallback auf
                ICON-EU.
              </p>
              <p>
                <strong>Datenschutz:</strong> Alle Einstellungen werden lokal in Ihrem Browser gespeichert. Es werden
                keine personenbezogenen Daten an Server übertragen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Confirmation */}
      <div className="flex justify-center">
        <Button
          onClick={handleSave}
          className={`min-h-[48px] px-8 transition-all duration-300 ${
            saved
              ? "bg-emerald-500 hover:bg-emerald-400"
              : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
          } text-white`}
        >
          {saved ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              Gespeichert!
            </>
          ) : (
            "Einstellungen werden automatisch gespeichert"
          )}
        </Button>
      </div>
    </div>
  )
}
