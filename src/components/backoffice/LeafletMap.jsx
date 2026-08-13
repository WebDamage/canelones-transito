import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import icon from 'leaflet/dist/images/marker-icon.png'
import shadow from 'leaflet/dist/images/marker-shadow.png'

// Vite no resuelve los íconos por defecto de Leaflet solo — hay que pasarle
// las URLs procesadas a mano una vez.
const defaultIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = defaultIcon

function coloredIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  })
}
const ICONO_INSPECTOR = coloredIcon('#1e8e3e') // verde
const ICONO_MULTA = coloredIcon('#c62828') // rojo

const CENTRO_CANELONES = [-34.75, -56.15]

function AjustarVista({ puntos }) {
  const map = useMap()
  useEffect(() => {
    if (puntos.length === 0) return
    if (puntos.length === 1) { map.setView(puntos[0], 15); return }
    map.fitBounds(puntos, { padding: [40, 40] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(puntos)])
  return null
}

export default function LeafletMap({ inspectores, multas, onSelectMulta }) {
  const puntos = [
    ...inspectores.map((i) => [i.lat, i.lon]),
    ...multas.map((m) => [m.geolocalizacion?.lat, m.geolocalizacion?.lon]).filter(([lat, lon]) => lat != null && lon != null),
  ]

  return (
    <MapContainer center={CENTRO_CANELONES} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AjustarVista puntos={puntos} />

      {inspectores.map((i) => (
        <Marker key={i.cedula} position={[i.lat, i.lon]} icon={ICONO_INSPECTOR}>
          <Popup>
            <b>{i.nombre}</b><br />
            {i.equipo && <>{i.equipo}<br /></>}
            <span style={{ color: '#5f6368' }}>Activo hace instantes</span>
          </Popup>
        </Marker>
      ))}

      {multas.filter((m) => m.geolocalizacion?.lat != null).map((m) => (
        <Marker key={m.uuid} position={[m.geolocalizacion.lat, m.geolocalizacion.lon]} icon={ICONO_MULTA}>
          <Popup>
            <b>{m.vehiculo?.placa}</b> · {m.infraccion?.codigo}<br />
            {m.inspectorNombre}<br />
            <span style={{ color: '#5f6368' }}>{(m.creadaEn || '').slice(0, 16).replace('T', ' ')}</span><br />
            <button
              onClick={() => onSelectMulta(m)}
              style={{ color: '#043c77', textDecoration: 'underline', fontSize: 12, marginTop: 4, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            >
              Ver ficha completa
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
