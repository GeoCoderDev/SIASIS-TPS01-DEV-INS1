import { query } from "../../connectors/postgres";

async function verificarTablasPorRol(): Promise<Map<string, boolean>> {
  // Lista de todas las posibles tablas de control de asistencia
  const tablasNecesarias = [
    "T_Control_Entrada_Mensual_Auxiliar",
    "T_Control_Salida_Mensual_Auxiliar",
    "T_Control_Entrada_Mensual_Profesores_Primaria",
    "T_Control_Salida_Mensual_Profesores_Primaria",
    "T_Control_Entrada_Mensual_Profesores_Secundaria",
    "T_Control_Salida_Mensual_Profesores_Secundaria",
    "T_Control_Entrada_Mensual_Personal_Administrativo",
    "T_Control_Salida_Mensual_Personal_Administrativo",
  ];

  // Verificar en información del esquema qué tablas existen
  const sql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name IN (${tablasNecesarias
      .map((t) => `'${t.toLowerCase()}'`)
      .join(", ")})
  `;

  try {
    const result = await query(sql);

    // Inicializar map con todas las tablas como inexistentes
    const tablasExistentes = new Map<string, boolean>();
    tablasNecesarias.forEach((tabla) => {
      tablasExistentes.set(tabla, false);
    });

    // Marcar las tablas que realmente existen
    result.rows.forEach((row: any) => {
      // Buscar el nombre exacto en la lista original
      const nombreOriginal = tablasNecesarias.find(
        (t) => t.toLowerCase() === row.table_name.toLowerCase()
      );

      if (nombreOriginal) {
        tablasExistentes.set(nombreOriginal, true);
      }
    });

    // Hacer log de las tablas existentes para depuración
    const tablasEncontradas = Array.from(tablasExistentes.entries())
      .filter(([_, existe]) => existe)
      .map(([nombre]) => nombre);

    console.log(
      `Tablas de control de asistencia encontradas (${
        tablasEncontradas.length
      }): ${tablasEncontradas.join(", ") || "Ninguna"}`
    );

    return tablasExistentes;
  } catch (error) {
    console.error("Error al verificar tablas de control de asistencia:", error);
    // En caso de error, retornar todas como no existentes
    const tablasExistentes = new Map<string, boolean>();
    tablasNecesarias.forEach((tabla) => {
      tablasExistentes.set(tabla, false);
    });
    return tablasExistentes;
  }
}
