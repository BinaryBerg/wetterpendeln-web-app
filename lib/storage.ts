import type { Settings, Shift } from "./types"

const STORAGE_KEY = "wetterpendeln-settings"
const LAST_LOCATION_KEY = "wetterpendeln-last-location"

export const DEFAULT_SHIFTS: Shift[] = [
  { id: "1", name: "Frühschicht", hinStart: "05:00", hinEnd: "06:00", rueckStart: "14:30", rueckEnd: "15:30" },
  { id: "2", name: "Spätschicht", hinStart: "13:00", hinEnd: "14:00", rueckStart: "22:30", rueckEnd: "23:00" },
  { id: "3", name: "Mittelschicht", hinStart: "09:00", hinEnd: "10:00", rueckStart: "18:00", rueckEnd: "19:00" },
  { id: "4", name: "Nachtschicht", hinStart: "21:00", hinEnd: "22:00", rueckStart: "06:00", rueckEnd: "07:00" },
]

export const DEFAULT_SETTINGS: Settings = {
  startOrt: "Leopoldshöhe",
  zielOrt: "Lemgo",
  shifts: DEFAULT_SHIFTS,
  routes: [],
  defaultLocation: "Leopoldshöhe",
  units: "metric",
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    console.error("Fehler beim Laden der Einstellungen")
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    console.error("Fehler beim Speichern der Einstellungen")
  }
}

export function loadLastLocation(): { lat: number; lon: number; name: string } | null {
  if (typeof window === "undefined") return null

  try {
    const saved = localStorage.getItem(LAST_LOCATION_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    console.error("Fehler beim Laden des letzten Standorts")
  }
  return null
}

export function saveLastLocation(location: { lat: number; lon: number; name: string }): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location))
  } catch {
    console.error("Fehler beim Speichern des Standorts")
  }
}
