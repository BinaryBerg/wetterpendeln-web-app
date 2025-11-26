"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2, Edit2, Check, X, Clock } from "lucide-react"
import type { Shift } from "@/lib/types"

interface ShiftEditorProps {
  shifts: Shift[]
  onShiftsChange: (shifts: Shift[]) => void
}

export function ShiftEditor({ shifts, onShiftsChange }: ShiftEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Shift | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newShift, setNewShift] = useState<Omit<Shift, "id">>({
    name: "",
    hinStart: "08:00",
    hinEnd: "09:00",
    rueckStart: "17:00",
    rueckEnd: "18:00",
  })

  const handleAdd = () => {
    if (!newShift.name.trim()) return
    const id = Date.now().toString()
    onShiftsChange([...shifts, { ...newShift, id }])
    setNewShift({
      name: "",
      hinStart: "08:00",
      hinEnd: "09:00",
      rueckStart: "17:00",
      rueckEnd: "18:00",
    })
    setShowAddForm(false)
  }

  const handleDelete = (id: string) => {
    onShiftsChange(shifts.filter((s) => s.id !== id))
  }

  const handleEdit = (shift: Shift) => {
    setEditingId(shift.id)
    setEditForm({ ...shift })
  }

  const handleSaveEdit = () => {
    if (!editForm) return
    onShiftsChange(shifts.map((s) => (s.id === editForm.id ? editForm : s)))
    setEditingId(null)
    setEditForm(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const TimeInput = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-slate-400">{label}</Label>
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border-white/10 text-slate-200 focus:border-cyan-500/50 focus:ring-cyan-500/20 min-h-[44px]"
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium text-slate-200 flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-400" />
          Schichten verwalten
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="gap-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 min-h-[44px] px-4"
        >
          <Plus className="h-4 w-4" />
          Neue Schicht
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-emerald-500/5 border-emerald-500/20 backdrop-blur-sm">
          <CardContent className="pt-4 space-y-4">
            <Input
              placeholder="Schichtname"
              value={newShift.name}
              onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
              className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 min-h-[44px]"
            />
            <div className="grid grid-cols-2 gap-3">
              <TimeInput
                label="Hinfahrt Start"
                value={newShift.hinStart}
                onChange={(v) => setNewShift({ ...newShift, hinStart: v })}
              />
              <TimeInput
                label="Hinfahrt Ende"
                value={newShift.hinEnd}
                onChange={(v) => setNewShift({ ...newShift, hinEnd: v })}
              />
              <TimeInput
                label="Rückfahrt Start"
                value={newShift.rueckStart}
                onChange={(v) => setNewShift({ ...newShift, rueckStart: v })}
              />
              <TimeInput
                label="Rückfahrt Ende"
                value={newShift.rueckEnd}
                onChange={(v) => setNewShift({ ...newShift, rueckEnd: v })}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleAdd}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white min-h-[44px]"
              >
                Hinzufügen
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 min-h-[44px]"
              >
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {shifts.map((shift) => (
          <Card
            key={shift.id}
            className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/8 hover:border-cyan-500/20 transition-all duration-300 group"
          >
            <CardContent className="py-4 px-4">
              {editingId === shift.id && editForm ? (
                <div className="space-y-4">
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="bg-white/5 border-white/10 text-slate-200 focus:border-cyan-500/50 min-h-[44px]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TimeInput
                      label="Hinfahrt Start"
                      value={editForm.hinStart}
                      onChange={(v) => setEditForm({ ...editForm, hinStart: v })}
                    />
                    <TimeInput
                      label="Hinfahrt Ende"
                      value={editForm.hinEnd}
                      onChange={(v) => setEditForm({ ...editForm, hinEnd: v })}
                    />
                    <TimeInput
                      label="Rückfahrt Start"
                      value={editForm.rueckStart}
                      onChange={(v) => setEditForm({ ...editForm, rueckStart: v })}
                    />
                    <TimeInput
                      label="Rückfahrt Ende"
                      value={editForm.rueckEnd}
                      onChange={(v) => setEditForm({ ...editForm, rueckEnd: v })}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveEdit}
                      className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white min-h-[44px]"
                    >
                      <Check className="h-4 w-4" />
                      Speichern
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="gap-2 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 min-h-[44px]"
                    >
                      <X className="h-4 w-4" />
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-200">{shift.name}</p>
                    <p className="text-sm text-slate-400">
                      Hin: {shift.hinStart}-{shift.hinEnd} | Rück: {shift.rueckStart}-{shift.rueckEnd}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(shift)}
                      className="h-11 w-11 p-0 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(shift.id)}
                      className="h-11 w-11 p-0 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
