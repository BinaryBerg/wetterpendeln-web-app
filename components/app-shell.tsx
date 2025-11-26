"use client"

import { useState, useEffect } from "react"
import { Cloud, Bike, MapPin, Settings, Database, Coffee, Globe } from "lucide-react"
import { NowView } from "@/components/views/now-view"
import { CommuteView } from "@/components/views/commute-view"
import { RadarView } from "@/components/views/radar-view"
import { SettingsView } from "@/components/views/settings-view"
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/storage"
import { LocationProvider } from "@/lib/location-store"
import type { Settings as AppSettings } from "@/lib/types"

type TabId = "jetzt" | "pendeln" | "radar" | "einstellungen"

const tabs = [
  { id: "jetzt" as const, label: "Jetzt", icon: Cloud },
  { id: "pendeln" as const, label: "Pendeln", icon: Bike },
  { id: "radar" as const, label: "Radar", icon: MapPin },
  { id: "einstellungen" as const, label: "Einstellungen", icon: Settings },
]

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("jetzt")
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  // Load settings on mount
  useEffect(() => {
    const saved = loadSettings()
    setSettings(saved)
  }, [])

  // Save settings when changed
  const updateSettings = (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  return (
    <LocationProvider>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Support Button */}
              <a
                href="https://buymeacoffee.com/timintech"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-amber-400 border border-white/10 hover:border-amber-500/30 rounded-lg transition-all duration-300 min-h-[40px]"
                aria-label="Projekt unterst\u00fctzen"
              >
                <Coffee className="h-4 w-4" />
                <span className="hidden sm:inline">Unterst\u00fctzen</span>
              </a>

              {/* Center: Logo */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
                  <Bike className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="text-center">
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    Wetterpendeln
                  </h1>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-400/80">
                    <Database className="h-2.5 w-2.5" />
                    <span>DWD ICON-D2</span>
                  </div>
                </div>
              </div>

              {/* Right: Website Button */}
              <a
                href="https://timinrech.de"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/30 rounded-lg transition-all duration-300 min-h-[40px]"
                aria-label="Website besuchen"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Website</span>
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-6 pb-24 overflow-x-hidden">
          {activeTab === "jetzt" && <NowView settings={settings} />}
          {activeTab === "pendeln" && <CommuteView settings={settings} onSettingsChange={updateSettings} />}
          {activeTab === "radar" && <RadarView settings={settings} />}
          {activeTab === "einstellungen" && <SettingsView settings={settings} onSettingsChange={updateSettings} />}
        </main>

        {/* Bottom Navigation - Mobile Optimized */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0f1e]/90 backdrop-blur-xl border-t border-white/10 safe-area-inset-bottom"
          role="navigation"
          aria-label="Hauptnavigation"
        >
          <div className="container mx-auto px-1 sm:px-2">
            <div
              className="flex justify-around items-center py-1.5"
              role="tablist"
              aria-label="Ansicht wechseln"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    id={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center justify-center min-w-[60px] sm:min-w-[72px] min-h-[52px] px-2 sm:px-3 py-1.5 rounded-xl transition-all duration-300 ${
                      isActive ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 mb-0.5 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                    <span className="text-[10px] sm:text-xs font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>
      </div>
    </LocationProvider>
  )
}
