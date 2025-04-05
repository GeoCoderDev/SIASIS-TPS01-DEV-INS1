// src/core/database/queries/personal/obtenerProfesoresSecundaria.ts
import { DURACION_HORA_ACADEMICA_EN_MINUTOS } from "../../../../constants/DURACION_HORA_ACADEMICA_EN_MINUTOS";
import { ProfesorTutorSecundariaParaTomaDeAsistencia } from "../../../../interfaces/shared/Asistencia/DatosAsistenciaHoyIE20935";
import { query } from "../../connectors/postgres";

export async function obtenerProfesoresSecundariaParaTomarAsistencia(
  fecha: Date
): Promise<ProfesorTutorSecundariaParaTomaDeAsistencia[]> {
  // Obtener el día de la semana (0-6, 0 siendo domingo)
  const diaSemana = fecha.getDay();
  // Convertir a formato usado en la base de datos (1-7, 1 siendo lunes)
  const diaSemanaDB = diaSemana === 0 ? 7 : diaSemana;

  const sql = `
    SELECT 
      ps."DNI_Profesor_Secundaria", 
      ps."Nombres", 
      ps."Apellidos", 
      ps."Genero", 
      ps."Google_Drive_Foto_ID",
      -- Obtener los horarios según los cursos asignados para este día
      MIN(ch."Indice_Hora_Academica_Inicio") as "Indice_Entrada",
      MAX(ch."Indice_Hora_Academica_Inicio" + ch."Cant_Hora_Academicas") as "Indice_Salida"
    FROM "T_Profesores_Secundaria" ps
    JOIN "T_Cursos_Horario" ch ON ps."DNI_Profesor_Secundaria" = ch."DNI_Profesor_Secundaria"
    WHERE ps."Estado" = true AND ch."Dia_Semana" = $1
    GROUP BY ps."DNI_Profesor_Secundaria", ps."Nombres", ps."Apellidos", ps."Genero", ps."Google_Drive_Foto_ID"
  `;

  const result = await query(sql, [diaSemanaDB]);

  // Convertir índices de horas a objetos Date considerando la duración de cada hora académica
  return result.rows.map((profesor:any) => {
    // Hora base (por ejemplo, 7:00 AM como primera hora académica)
    const horaBase = 7; // 7 AM como hora base

    // Calcular hora de entrada
    const horaEntrada = new Date(fecha);
    const minutosEntrada =
      (profesor.Indice_Entrada - 1) * DURACION_HORA_ACADEMICA_EN_MINUTOS;
    horaEntrada.setHours(horaBase, minutosEntrada, 0, 0);

    // Calcular hora de salida
    const horaSalida = new Date(fecha);
    const minutosSalida =
      (profesor.Indice_Salida - 1) * DURACION_HORA_ACADEMICA_EN_MINUTOS;
    horaSalida.setHours(horaBase, minutosSalida, 0, 0);

    return {
      DNI_Profesor_Secundaria: profesor.DNI_Profesor_Secundaria,
      Nombres: profesor.Nombres,
      Apellidos: profesor.Apellidos,
      Genero: profesor.Genero,
      Google_Drive_Foto_ID: profesor.Google_Drive_Foto_ID,
      Hora_Entrada_Dia_Actual: horaEntrada,
      Hora_Salida_Dia_Actual: horaSalida,
    };
  });
}
