import { RangoFechas } from "../../../interfaces/shared/Asistencia/DatosAsistenciaHoyIE20935";


export function verificarDentroVacacionesMedioAño(
  fechaActual: Date,
  fechaInicioVacaciones: Date,
  fechaFinVacaciones: Date
): false | RangoFechas {
  // Verificar si la fecha actual está dentro del rango de vacaciones
  const estaDentro = fechaActual >= fechaInicioVacaciones && fechaActual <= fechaFinVacaciones;
  
  // Si está dentro, devolver el rango de vacaciones
  if (estaDentro) {
    return {
      Inicio: fechaInicioVacaciones,
      Fin: fechaFinVacaciones
    };
  }
  
  // Si no está dentro, devolver false
  return false;
}