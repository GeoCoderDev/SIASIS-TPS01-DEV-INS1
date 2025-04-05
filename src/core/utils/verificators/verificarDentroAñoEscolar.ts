
export default function verificarDentroAñoEscolar(
  fecha: Date,
  fechaInicio: Date,
  fechaFin: Date
): boolean {
  return fecha >= fechaInicio && fecha <= fechaFin;
}
