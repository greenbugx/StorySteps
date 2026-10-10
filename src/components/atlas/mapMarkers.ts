import L from 'leaflet'
import { CATEGORY_COLORS, type MemoryCategory } from '@/types/memory'

function markerHtml(category: MemoryCategory, selected: boolean): string {
  const color = CATEGORY_COLORS[category]
  const size = selected ? 20 : 14
  const ring = selected ? 3 : 2
  return `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:${ring}px solid var(--paper);box-shadow:0 1px 4px rgb(0 0 0 / 0.35)"></span>`
}

export function createMemoryIcon(category: MemoryCategory, selected: boolean): L.DivIcon {
  return L.divIcon({
    html: markerHtml(category, selected),
    className: 'storysteps-marker',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  })
}

export function createPickIcon(): L.DivIcon {
  return L.divIcon({
    html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:transparent;border:3px solid var(--moss)"></span>',
    className: 'storysteps-marker',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}
