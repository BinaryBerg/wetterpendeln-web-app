"use client"

import { Card, CardContent } from "@/components/ui/card"
import { evaluateRideability, getClothingAdvice, getWindDirection, getWeatherEmoji } from "@/lib/rideability"
import type { WeatherSlot } from "@/lib/types"
import { ArrowRight, Droplets, Wind, Thermometer, CloudRain, Gauge } from "lucide-react"

interface WeatherResultsProps {
  results: WeatherSlot[]
  startOrt: string
  zielOrt: string
}

export function WeatherResults({ results, startOrt, zielOrt }: WeatherResultsProps) {
  // Group by date
  const groupedByDate: Record<string, WeatherSlot[]> = {}
  results.forEach((slot) => {
    const dateKey = slot.date
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = []
    }
    groupedByDate[dateKey].push(slot)
  })

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-3">
        <CloudRain className="h-6 w-6 text-cyan-400" />
        Wettervorhersage
      </h2>

      {Object.entries(groupedByDate).map(([date, slots]) => (
        <div key={date} className="space-y-4">
          <h3 className="text-lg font-medium text-slate-300 border-b border-white/10 pb-3">{formatDateHeader(date)}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {slots.map((slot, idx) => (
              <WeatherCard key={`${date}-${slot.type}-${idx}`} slot={slot} startOrt={startOrt} zielOrt={zielOrt} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function WeatherCard({
  slot,
  startOrt,
  zielOrt,
}: {
  slot: WeatherSlot
  startOrt: string
  zielOrt: string
}) {
  const rideability = evaluateRideability(slot)
  const clothingAdvice = getClothingAdvice(slot.temp)
  const windDir = getWindDirection(slot.windDeg)
  const weatherEmoji = getWeatherEmoji(slot.clouds, slot.pop, slot.rain)

  const from = slot.type === "hin" ? startOrt : zielOrt
  const to = slot.type === "hin" ? zielOrt : startOrt
  const typeLabel = slot.type === "hin" ? "Hinfahrt" : "Rückfahrt"

  const cardStyles = {
    gut: "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/15",
    ok: "bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/15",
    kritisch: "bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/15",
    schlecht: "bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/15",
  }[rideability.level]

  const accentColor = {
    gut: "text-emerald-400",
    ok: "text-yellow-400",
    kritisch: "text-orange-400",
    schlecht: "text-rose-400",
  }[rideability.level]

  const displayTime = slot.time

  return (
    <Card className={`${cardStyles} backdrop-blur-xl transition-all duration-300 shadow-lg hover:shadow-xl group`}>
      <CardContent className="pt-5 space-y-4">
        {/* Route Header */}
        <div className="flex items-center gap-2 text-slate-200 font-medium">
          <span className="text-emerald-400">{from}</span>
          <ArrowRight className="h-4 w-4 text-slate-500" />
          <span className="text-rose-400">{to}</span>
        </div>

        {/* Shift & Type */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">{slot.shiftName}</span>
          <span
            className={`text-sm px-3 py-1 rounded-full ${slot.type === "hin" ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"}`}
          >
            {typeLabel}
          </span>
        </div>

        <div className="text-sm text-slate-400">Zeit: {displayTime} Uhr</div>

        <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/5">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{weatherEmoji}</span>
            <div>
              <p className="font-medium text-slate-200 text-lg">
                {slot.description}, {slot.temp.toFixed(1)} °C
              </p>
              <p className="text-sm text-slate-400 flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                gefühlt {slot.feelsLike.toFixed(1)} °C
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Droplets className="h-4 w-4 text-blue-400" />
              <span>{Math.round(slot.pop * 100)} % Regen</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <CloudRain className="h-4 w-4 text-blue-400" />
              <span>{slot.rain.toFixed(1)} mm/h</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Wind className="h-4 w-4 text-cyan-400" />
              <span>
                {slot.windSpeed.toFixed(0)} km/h aus {windDir}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Gauge className="h-4 w-4 text-orange-400" />
              <span>Böen {slot.windGust?.toFixed(0) ?? "-"} km/h</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-3 border-t border-white/10">
          <span className="text-2xl">{rideability.emoji}</span>
          <div className="flex-1">
            <p className={`font-semibold ${accentColor}`}>{rideability.label}</p>
            {rideability.advice && <p className="text-sm text-slate-400 mt-1">{rideability.advice}</p>}
            {clothingAdvice && <p className="text-sm text-slate-500 mt-2 italic">{clothingAdvice}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const isToday = date.toDateString() === today.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const weekdays = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
  const weekday = weekdays[date.getDay()]

  const formatted = date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  if (isToday) return `Heute - ${weekday}, ${formatted}`
  if (isTomorrow) return `Morgen - ${weekday}, ${formatted}`
  return `${weekday}, ${formatted}`
}
