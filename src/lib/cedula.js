// Validación de cédula de identidad uruguaya (dígito verificador, pesos 2-9-8-7-6-3-4)
// Mismo algoritmo usado en las otras apps del organismo, para consistencia.
export function validarCedulaUY(ci) {
  const dig = (ci || '').replace(/\D/g, '')
  if (dig.length < 7 || dig.length > 8) return false
  const num = dig.padStart(8, '0')
  const pesos = [2, 9, 8, 7, 6, 3, 4]
  let suma = 0
  for (let i = 0; i < 7; i++) suma += parseInt(num[i], 10) * pesos[i]
  const dv = (10 - (suma % 10)) % 10
  return dv === parseInt(num[7], 10)
}

export function limpiarCedula(ci) {
  return (ci || '').replace(/\D/g, '')
}
