import { PersonalAdministrativoParaTomaDeAsistencia } from "../../../../interfaces/shared/Asistencia/DatosAsistenciaHoyIE20935";
import { query } from "../../connectors/postgres";

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

  const result = await query(sql);

  return result.rows;
}
