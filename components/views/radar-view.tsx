"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { MapPin, Navigation, Loader2, Play, Pause, SkipBack, SkipForward, Clock, AlertCircle } from "lucide-react"
import { geocodeLocation } from "@/lib/weather-api"
import { loadLastLocation } from "@/lib/storage"
import type { Settings } from "@/lib/types"

interface RadarViewProps {
  settings: Settings
}

// RainViewer API provides free radar tiles
const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json"

interface RainViewerData {
  radar: {
    past: Array<{ time: number; path: string }>
    nowcast: Array<{ time: number; path: string }>
  }
}

export function RadarView({ settings }: RadarViewProps) {
  const [location, setLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [radarData, setRadarData] = useState<RainViewerData | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load radar data from RainViewer
  const loadRadarData = useCallback(async () => {
    try {
      const response = await fetch(RAINVIEWER_API)
      const data = await response.json()
      setRadarData(data)
      // Start at most recent past frame
      const pastFrames = data.radar?.past?.length || 0
      setCurrentFrame(Math.max(0, pastFrames - 1))
    } catch (err) {
      setError("Radardaten konnten nicht geladen werden")
    }
  }, [])

  // Initialize location and radar
  useEffect(() => {
    const init = async () => {
      setLoading(true)

      // Load radar data
      await loadRadarData()

      // Load location
      const lastLocation = loadLastLocation()
      if (lastLocation) {
        setLocation(lastLocation)
      } else if (settings.defaultLocation || settings.startOrt) {
        try {
          const loc = await geocodeLocation(settings.defaultLocation || settings.startOrt)
          setLocation({ lat: loc.lat, lon: loc.lon, name: loc.name })
        } catch {
          // Default to Germany center
          setLocation({ lat: 51.1657, lon: 10.4515, name: "Deutschland" })
        }
      } else {
        setLocation({ lat: 51.1657, lon: 10.4515, name: "Deutschland" })
      }

      setLoading(false)
    }
    init()
  }, [settings.defaultLocation, settings.startOrt, loadRadarData])

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !radarData) return

    const allFrames = [...(radarData.radar.past || []), ...(radarData.radar.nowcast || [])]
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % allFrames.length)
    }, 500)

    return () => clearInterval(interval)
  }, [isPlaying, radarData])

  // Get GPS location
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setError("Geolocation wird nicht unterstützt. Bitte geben Sie einen Ort in den Einstellungen ein.")
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
          setLocation({ lat: latitude, lon: longitude, name })
        } catch {
          setLocation({ lat: latitude, lon: longitude, name: "Aktueller Standort" })
        }
        setGpsLoading(false)
      },
      () => {
        setError("Standort konnte nicht ermittelt werden. Bitte Standortfreigabe im Browser aktivieren.")
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // Get all radar frames
  const allFrames = radarData ? [...(radarData.radar.past || []), ...(radarData.radar.nowcast || [])] : []
  const currentFrameData = allFrames[currentFrame]
  const pastFrameCount = radarData?.radar.past?.length || 0

  // Format frame time
  const formatFrameTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
  }

  const getMinutesOffset = (frameIndex: number) => {
    if (!radarData) return 0
    const pastCount = radarData.radar.past?.length || 0
    // Each frame is approximately 10 minutes
    return (frameIndex - pastCount + 1) * 10
  }

  const jumpToTime = (minutesFromNow: number) => {
    if (!radarData) return
    const pastCount = radarData.radar.past?.length || 0
    const targetFrame = pastCount - 1 + Math.floor(minutesFromNow / 10)
    const clampedFrame = Math.max(0, Math.min(allFrames.length - 1, targetFrame))
    setCurrentFrame(clampedFrame)
    setIsPlaying(false)
  }

  // Get rain prediction text based on radar
  const getRainText = () => {
    if (!radarData || !location) return null

    const minutesOffset = getMinutesOffset(currentFrame)
    if (minutesOffset > 0) {
      return `Vorhersage: ${minutesOffset} Minuten in der Zukunft`
    } else if (minutesOffset < 0) {
      return `Vergangenheit: vor ${Math.abs(minutesOffset)} Minuten`
    }
    return "Aktuelle Radardaten"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Location Header */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <MapPin className="h-5 w-5" />
              <span className="font-medium">{location?.name || "Standort wählen"}</span>
            </div>
            <Button
              onClick={handleGetGPS}
              disabled={gpsLoading}
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 min-h-[44px] min-w-[44px]"
              aria-label="GPS-Standort ermitteln"
            >
              {gpsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  GPS
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rain Prediction */}
      {getRainText() && (
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-blue-300 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {getRainText()}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-slate-400 mb-3 uppercase tracking-wide">Schnellauswahl</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Zeitauswahl">
            <Button
              variant="outline"
              size="sm"
              onClick={() => jumpToTime(-30)}
              className={`min-h-[44px] px-4 ${
                getMinutesOffset(currentFrame) === -30
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              -30 Min
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => jumpToTime(0)}
              className={`min-h-[44px] px-4 ${
                Math.abs(getMinutesOffset(currentFrame)) <= 5
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              Jetzt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => jumpToTime(30)}
              className={`min-h-[44px] px-4 ${
                getMinutesOffset(currentFrame) === 30
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              +30 Min
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => jumpToTime(60)}
              className={`min-h-[44px] px-4 ${
                getMinutesOffset(currentFrame) === 60
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              +60 Min
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Radar Map */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden">
        <CardContent className="p-0">
          {location && (
            <div className="relative aspect-video bg-slate-900">
              {/* Base Map Layer - Using OpenStreetMap */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-60"
                style={{
                  backgroundImage: `url(https://tile.openstreetmap.org/7/${Math.floor(((location.lon + 180) / 360) * 128)}/${Math.floor(((1 - Math.log(Math.tan((location.lat * Math.PI) / 180) + 1 / Math.cos((location.lat * Math.PI) / 180)) / Math.PI) / 2) * 128)}.png)`,
                }}
              />

              {/* Radar Layer */}
              {currentFrameData && (
                <img
                  src={`https://tilecache.rainviewer.com${currentFrameData.path}/256/7/${Math.floor(((location.lon + 180) / 360) * 128)}/${Math.floor(((1 - Math.log(Math.tan((location.lat * Math.PI) / 180) + 1 / Math.cos((location.lat * Math.PI) / 180)) / Math.PI) / 2) * 128)}/2/1_1.png`}
                  alt="Regenradar"
                  className="absolute inset-0 w-full h-full object-cover mix-blend-screen"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              )}

              {/* Center Marker */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="w-4 h-4 bg-cyan-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
              </div>

              {/* Time Overlay */}
              {currentFrameData && (
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <p className="text-white text-sm font-medium">
                    {formatFrameTime(currentFrameData.time)}
                    {currentFrame >= pastFrameCount && <span className="ml-2 text-cyan-400 text-xs">Vorhersage</span>}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 border-t border-white/10 bg-white/5">
            <p className="text-xs text-slate-400 mb-2">Niederschlagsintensität</p>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                <div className="flex-1 bg-[#00f]" title="Leichter Regen" />
                <div className="flex-1 bg-[#0f0]" title="Mäßiger Regen" />
                <div className="flex-1 bg-[#ff0]" title="Stärkerer Regen" />
                <div className="flex-1 bg-[#f80]" title="Starker Regen" />
                <div className="flex-1 bg-[#f00]" title="Sehr starker Regen" />
                <div className="flex-1 bg-[#f0f]" title="Extremer Regen" />
              </div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>Leicht</span>
              <span>Mäßig</span>
              <span>Stark</span>
              <span>Extrem</span>
            </div>
          </div>

          {/* Playback Controls */}
          {allFrames.length > 0 && (
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFrame(0)}
                  className="text-slate-400 hover:text-white min-h-[44px] min-w-[44px] p-0"
                  aria-label="Zum Anfang springen"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-slate-400 hover:text-white min-h-[44px] min-w-[44px] p-0"
                  aria-label={isPlaying ? "Animation pausieren" : "Animation abspielen"}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFrame(allFrames.length - 1)}
                  className="text-slate-400 hover:text-white min-h-[44px] min-w-[44px] p-0"
                  aria-label="Zum Ende springen"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>

                <div className="flex-1">
                  <Slider
                    value={[currentFrame]}
                    onValueChange={([value]) => setCurrentFrame(value)}
                    max={allFrames.length - 1}
                    step={1}
                    className="w-full"
                    aria-label="Zeitstrahl"
                  />
                </div>

                <span className="text-sm text-slate-400 min-w-[60px] text-right">
                  {currentFrame + 1} / {allFrames.length}
                </span>
              </div>

              {/* Timeline markers */}
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>-{pastFrameCount * 10} Min</span>
                <span className="text-cyan-400">Jetzt</span>
                <span>+{(allFrames.length - pastFrameCount) * 10} Min</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
