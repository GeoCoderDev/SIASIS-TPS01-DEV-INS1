import { PersonalAdministrativoParaTomaDeAsistencia } from "../../../../../interfaces/shared/Asistencia/DatosAsistenciaHoyIE20935";
import RDP02_DB_INSTANCES from '../../../connectors/postgres';

export async function obtenerPersonalAdministrativoParaTomarAsistencia(): Promise<
  PersonalAdministrativoParaTomaDeAsistencia[]
> {
  const sql = `
    SELECT 
      "DNI_Personal_Administrativo", 
      "Genero", 
      "Nombres", 
      "Apellidos", 
      "Cargo", 
      "Google_Drive_Foto_ID", 
      "Horario_Laboral_Entrada", 
      "Horario_Laboral_Salida"
    FROM "T_Personal_Administrativo"
    WHERE "Estado" = true
  `;

  const result = await RDP02_DB_INSTANCES.query(sql);

  // Obtener la fecha actual en Perú (UTC-5)
  const fechaUTC = new Date();
  // Restar 5 horas para convertir a hora peruana
  const fechaPeruana = new Date(fechaUTC.getTime() - 5 * 60 * 60 * 1000);
  const fechaPeruanaString = fechaPeruana.toISOString().split("T")[0];

  // Procesar los resultados para combinar fecha y hora
  const datosConFechas = result.rows.map((row: any) => {
    // Extraer las horas originales (asumiendo que vienen en formato hh:mm:ss)
    const horaEntrada = row.Horario_Laboral_Entrada;
    const horaSalida = row.Horario_Laboral_Salida;

    // Crear fechas combinando la fecha peruana con las horas
    // Al usar new Date() con formato ISO, JavaScript asume UTC
    const fechaEntrada = new Date(`${fechaPeruanaString}T${horaEntrada}`);
    const fechaSalida = new Date(`${fechaPeruanaString}T${horaSalida}`);

    // Convertir a formato ISO con Z (UTC)
    const fechaHoraEntrada = fechaEntrada.toISOString();
    const fechaHoraSalida = fechaSalida.toISOString();

    // Devolver el objeto con los campos actualizados
    return {
      ...row,
      Hora_Entrada_Dia_Actual: fechaHoraEntrada,
      Hora_Salida_Dia_Actual: fechaHoraSalida,
    };
  });

  return datosConFechas;
}
