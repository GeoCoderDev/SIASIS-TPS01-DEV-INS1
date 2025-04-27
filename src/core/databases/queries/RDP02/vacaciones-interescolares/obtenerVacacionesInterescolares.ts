import { query } from "../../../connectors/postgres";

export async function obtenerVacacionesInterescolares() {
  const sql = `
    SELECT 
      "Id_Vacacion_Interescolar",
      "Fecha_Inicio",
      "Fecha_Conclusion"
    FROM "T_Vacaciones_Interescolares"
    ORDER BY "Fecha_Inicio" ASC
  `;

  const result = await query(sql);
  return result.rows;
}