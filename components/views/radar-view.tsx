"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { MapPin, Navigation, Loader2, Play, Pause, SkipBack, SkipForward, Clock, AlertCircle, Crosshair } from "lucide-react"
import { useLocationStore } from "@/lib/location-store"
import type { Settings } from "@/lib/types"

interface RadarViewProps {
  settings: Settings
}

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json"
const DEFAULT_CENTER = { lat: 51.1657, lon: 10.4515 } // Germany center

interface RainViewerData {
  radar: {
    past: Array<{ time: number; path: string }>
    nowcast: Array<{ time: number; path: string }>
  }
}

export function RadarView({ settings }: RadarViewProps) {
  const { location, isLoading: gpsLoading, error: locationError, updateFromGPS, clearError } = useLocationStore()
  const [radarData, setRadarData] = useState<RainViewerData | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentCenter = {
    lat: location.lat ?? DEFAULT_CENTER.lat,
    lon: location.lon ?? DEFAULT_CENTER.lon,
  }

  const loadRadarData = useCallback(async () => {
    try {
      const response = await fetch(RAINVIEWER_API)
      const data = await response.json()
      setRadarData(data)
      const pastFrames = data.radar?.past?.length || 0
      setCurrentFrame(Math.max(0, pastFrames - 1))
    } catch (err) {
      setError("Radardaten konnten nicht geladen werden")
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadRadarData()
      setLoading(false)
    }
    init()
  }, [loadRadarData])

  useEffect(() => {
    if (!isPlaying || !radarData) return
    const allFrames = [...(radarData.radar.past || []), ...(radarData.radar.nowcast || [])]
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % allFrames.length)
    }, 500)
    return () => clearInterval(interval)
  }, [isPlaying, radarData])

  const handleCenterOnLocation = async () => {
    clearError()
    await updateFromGPS()
  }

  const allFrames = radarData ? [...(radarData.radar.past || []), ...(radarData.radar.nowcast || [])] : []
  const currentFrameData = allFrames[currentFrame]
  const pastFrameCount = radarData?.radar.past?.length || 0

  const formatFrameTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
  }

  const getMinutesOffset = (frameIndex: number) => {
    if (!radarData) return 0
    const pastCount = radarData.radar.past?.length || 0
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

  const getRainText = () => {
    if (!radarData) return null
    const minutesOffset = getMinutesOffset(currentFrame)
    if (minutesOffset > 0) return `Vorhersage: ${minutesOffset} Minuten in der Zukunft`
    if (minutesOffset < 0) return `Vergangenheit: vor ${Math.abs(minutesOffset)} Minuten`
    return "Aktuelle Radardaten"
  }

  const getTileCoords = (lat: number, lon: number, zoom: number) => {
    const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
    const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, zoom))
    return { x, y }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  const zoom = 7
  const tileCoords = getTileCoords(currentCenter.lat, currentCenter.lon, zoom)

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Location Header with Center Button */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-cyan-400 min-w-0">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium truncate">
                {location.cityLabel || "Standort w\u00e4hlen"}
              </span>
            </div>
            <Button
              onClick={handleCenterOnLocation}
              disabled={gpsLoading}
              variant="outline"
              size="sm"
              className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 min-h-[44px] px-4"
              aria-label="Radar auf aktuellen Standort zentrieren"
            >
              {gpsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Crosshair className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Auf Standort zentrieren</span>
                  <span className="sm:hidden">Zentrieren</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Messages */}
      {(error || locationError) && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{error || locationError}</p>
        </div>
      )}

      {/* Rain Prediction Info */}
      {getRainText() && (
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-3 pb-3">
            <p className="text-blue-300 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {getRainText()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Time Quick Select */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Schnellauswahl</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Zeitauswahl">
            {[-30, 0, 30, 60].map((minutes) => (
              <Button
                key={minutes}
                variant="outline"
                size="sm"
                onClick={() => jumpToTime(minutes)}
                className={`min-h-[44px] px-3 sm:px-4 flex-1 sm:flex-none ${
                  (minutes === 0 && Math.abs(getMinutesOffset(currentFrame)) <= 5) ||
                  getMinutesOffset(currentFrame) === minutes
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                {minutes === 0 ? "Jetzt" : `${minutes > 0 ? "+" : ""}${minutes} Min`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Radar Map - Mobile Optimized */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden">
        <CardContent className="p-0">
          <div 
            className="relative w-full bg-slate-900 touch-pan-x touch-pan-y"
            style={{ height: "min(65vh, 500px)" }}
          >
            {/* Base Map Layer */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60"
              style={{
                backgroundImage: `url(https://tile.openstreetmap.org/${zoom}/${tileCoords.x}/${tileCoords.y}.png)`,
              }}
            />

            {/* Radar Overlay */}
            {currentFrameData && (
              <img
                src={`https://tilecache.rainviewer.com${currentFrameData.path}/256/${zoom}/${tileCoords.x}/${tileCoords.y}/2/1_1.png`}
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
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg">
                <p className="text-white text-sm font-medium">
                  {formatFrameTime(currentFrameData.time)}
                  {currentFrame >= pastFrameCount && (
                    <span className="ml-2 text-cyan-400 text-xs">Vorhersage</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="p-3 border-t border-white/10 bg-white/5">
            <p className="text-xs text-slate-400 mb-2">Niederschlagsintensit\u00e4t</p>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                <div className="flex-1 bg-[#00f]" />
                <div className="flex-1 bg-[#0f0]" />
                <div className="flex-1 bg-[#ff0]" />
                <div className="flex-1 bg-[#f80]" />
                <div className="flex-1 bg-[#f00]" />
                <div className="flex-1 bg-[#f0f]" />
              </div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>Leicht</span>
              <span>Stark</span>
            </div>
          </div>

          {/* Playback Controls */}
          {allFrames.length > 0 && (
            <div className="p-3 border-t border-white/10">
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFrame(0)}
                  className="text-slate-400 hover:text-white min-h-[44px] min-w-[44px] p-0"
                  aria-label="Zum Anfang"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-slate-400 hover:text-white min-h-[44px] min-w-[44px] p-0"
                  aria-label={isPlaying ? "Pause" : "Abspielen"}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFrame(allFrames.length - 1)}
                  className="text-slate-400 hover:text-white min-h-[44px] min-w-[44px] p-0"
                  aria-label="Zum Ende"
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
                <span className="text-xs text-slate-400 min-w-[45px] text-right">
                  {currentFrame + 1}/{allFrames.length}
                </span>
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>-{pastFrameCount * 10}m</span>
                <span className="text-cyan-400">Jetzt</span>
                <span>+{(allFrames.length - pastFrameCount) * 10}m</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
