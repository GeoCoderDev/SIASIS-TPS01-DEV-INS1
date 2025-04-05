// src/core/database/queries/configuracion/obtenerFechasAñoEscolar.ts
import { query } from "../../connectors/postgres";

export async function obtenerFechasAñoEscolar() {
  const sql = `
    SELECT "Nombre", "Valor"
    FROM "T_Fechas_Importantes"
    WHERE "Nombre" IN (
      'Fecha_Inicio_Año_Escolar',
      'Fecha_Fin_Año_Escolar',
      'Fecha_Inicio_Vacaciones_Medio_Año',
      'Fecha_Fin_Vacaciones_Medio_Año'
    )
  `;

  const result = await query(sql);

  // Convertir a un objeto para fácil acceso
  const fechas = result.rows.reduce((acc: any, row: any) => {
    acc[row.Nombre] = new Date(row.Valor);
    return acc;
  }, {});

  return fechas;
}
