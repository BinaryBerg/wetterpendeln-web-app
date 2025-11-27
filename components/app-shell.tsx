"use client"

import { useState, useEffect } from "react"
import { Cloud, Bike, MapPin, Settings, Database } from "lucide-react"
import { NowView } from "@/components/views/now-view"
import { CommuteView } from "@/components/views/commute-view"
import { RadarView } from "@/components/views/radar-view"
import { SettingsView } from "@/components/views/settings-view"
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/storage"
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
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
              <Bike className="h-6 w-6 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Wetterpendeln
            </h1>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-emerald-400/80">
            <Database className="h-3 w-3" />
            <span>DWD ICON-D2</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-24">
        {activeTab === "jetzt" && <NowView settings={settings} />}
        {activeTab === "pendeln" && <CommuteView settings={settings} onSettingsChange={updateSettings} />}
        {activeTab === "radar" && <RadarView settings={settings} />}
        {activeTab === "einstellungen" && <SettingsView settings={settings} onSettingsChange={updateSettings} />}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0f1e]/90 backdrop-blur-xl border-t border-white/10 safe-area-inset-bottom"
        role="navigation"
        aria-label="Hauptnavigation"
      >
        <div className="container mx-auto px-2">
          <div
            className="flex justify-around items-center py-2"
            role="tablist"
            aria-label="Ansicht wechseln: Jetzt / Pendeln / Radar / Einstellungen"
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
                  className={`flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-3 py-2 rounded-xl transition-all duration-300 ${
                    isActive ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-6 w-6 mb-1 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
