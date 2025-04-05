export function verificarFueraVacacionesMedioAño(
  fecha: Date,
  fechaInicioVacaciones: Date,
  fechaFinVacaciones: Date
): boolean {
  return fecha < fechaInicioVacaciones || fecha > fechaFinVacaciones;
}
