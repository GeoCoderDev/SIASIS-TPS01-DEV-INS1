import { convertirStringTiempoADate } from "../../../../utils/functions/parsers/convertirStringATiempoDate";
import RDP02_DB_INSTANCES from '../../../connectors/postgres';

export async function obtenerHorariosGenerales() {
  const fechaHoy = new Date();

  const sql = `
    SELECT "Nombre", "Valor", "Descripcion"
    FROM "T_Horarios_Asistencia"
    WHERE "Nombre" IN (
      'Horario_Laboral_Rango_Total_Inicio',
      'Horario_Laboral_Rango_Total_Fin',
      'Hora_Inicio_Asistencia_Primaria',
      'Hora_Final_Asistencia_Primaria',
      'Hora_Inicio_Asistencia_Secundaria',
      'Hora_Final_Asistencia_Secundaria'
    )
  `;

  const result = await RDP02_DB_INSTANCES.query(sql);

  // Crear un objeto para acceder fácilmente a los valores por nombre
  const horarios = result.rows.reduce((acc: any, row: any) => {
    acc[row.Nombre] = row.Valor;
    return acc;
  }, {});

  // Convertir los strings de tiempo a objetos Date
  return {
    TomaAsistenciaRangoTotalPersonales: {
      Inicio: convertirStringTiempoADate(
        fechaHoy,
        horarios.Horario_Laboral_Rango_Total_Inicio
      ),
      Fin: convertirStringTiempoADate(
        fechaHoy,
        horarios.Horario_Laboral_Rango_Total_Fin
      ),
    },
    TomaAsistenciaProfesorPrimaria: {
      Inicio: convertirStringTiempoADate(
        fechaHoy,
        horarios.Hora_Inicio_Asistencia_Primaria
      ),
      Fin: convertirStringTiempoADate(
        fechaHoy,
        horarios.Hora_Final_Asistencia_Primaria
      ),
    },
    TomaAsistenciaAuxiliares: {
      Inicio: convertirStringTiempoADate(
        fechaHoy,
        horarios.Hora_Inicio_Asistencia_Secundaria
      ),
      Fin: convertirStringTiempoADate(
        fechaHoy,
        horarios.Hora_Final_Asistencia_Secundaria
      ),
    },
  };
}
