import { obtenerFechasActuales } from "../../../utils/dates/obtenerFechasActuales";
import { query } from "../../connectors/postgres";
import { obtenerPersonalInactivoParaRegistroAutomatico } from "./obtenerPersonalInactivoParaRegistroAutomatico";

export async function registrarAsistenciaAutoNullParaPersonalInactivo(): Promise<{
  totalRegistros: number;
  registrosCreados: number;
  registrosActualizados: number;
  errores: number;
}> {
  // Obtener fecha actual en Perú
  const { fechaLocalPeru } = obtenerFechasActuales();

  // Extraer mes y día
  const mes = fechaLocalPeru.getMonth() + 1; // getMonth() devuelve 0-11
  const dia = fechaLocalPeru.getDate();

  // Obtener lista de personal inactivo
  const personalInactivo =
    await obtenerPersonalInactivoParaRegistroAutomatico();

  console.log(`Personal inactivo encontrado: ${personalInactivo.length}`);

  let registrosCreados = 0;
  let registrosActualizados = 0;
  let errores = 0;

  // Primero, verificar qué tablas de control de asistencia existen
  // Recopilamos todas las tablas que necesitamos verificar
  const tablasNecesarias = new Set<string>();
  personalInactivo.forEach((persona) => {
    tablasNecesarias.add(persona.tablaMensualEntrada);
    tablasNecesarias.add(persona.tablaMensualSalida);
  });

  // Verificamos la existencia de estas tablas
  const tablasExistentes = await verificarTablasExistentes(
    Array.from(tablasNecesarias)
  );
  console.log(
    `Tablas de asistencia verificadas. Existentes: ${tablasExistentes.length} de ${tablasNecesarias.size}`
  );

  // Procesar cada miembro del personal inactivo
  for (const persona of personalInactivo) {
    // Solo procesar si ambas tablas existen
    if (tablasExistentes.includes(persona.tablaMensualEntrada.toLowerCase())) {
      try {
        const resultadoEntrada = await verificarYRegistrarAsistenciaNull(
          persona.tablaMensualEntrada,
          persona.campoId,
          persona.campoDNI,
          persona.dni,
          mes,
          dia,
          "Entradas"
        );

        if (resultadoEntrada.creado) registrosCreados++;
        if (resultadoEntrada.actualizado) registrosActualizados++;
      } catch (error) {
        console.error(
          `Error al registrar entrada null para ${persona.dni}:`,
          error
        );
        errores++;
      }
    } else {
      console.warn(
        `La tabla ${persona.tablaMensualEntrada} no existe en la base de datos. Omitiendo registro de entrada para ${persona.dni}`
      );
    }

    if (tablasExistentes.includes(persona.tablaMensualSalida.toLowerCase())) {
      try {
        const resultadoSalida = await verificarYRegistrarAsistenciaNull(
          persona.tablaMensualSalida,
          persona.campoId,
          persona.campoDNI,
          persona.dni,
          mes,
          dia,
          "Salidas"
        );

        if (resultadoSalida.creado) registrosCreados++;
        if (resultadoSalida.actualizado) registrosActualizados++;
      } catch (error) {
        console.error(
          `Error al registrar salida null para ${persona.dni}:`,
          error
        );
        errores++;
      }
    } else {
      console.warn(
        `La tabla ${persona.tablaMensualSalida} no existe en la base de datos. Omitiendo registro de salida para ${persona.dni}`
      );
    }
  }

  return {
    totalRegistros: personalInactivo.length * 2, // Entrada y salida para cada persona
    registrosCreados,
    registrosActualizados,
    errores,
  };
}

// Función para verificar qué tablas existen en la base de datos
async function verificarTablasExistentes(tablas: string[]): Promise<string[]> {
  const tablasExistentes: string[] = [];

  // Nota importante: PostgreSQL convierte nombres de tabla a minúsculas a menos que estén entre comillas
  // Por eso convertimos todos los nombres a minúsculas para la comparación
  const tablasMinusculas = tablas.map((t) => t.toLowerCase());

  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY($1)
  `;

  try {
    const result = await query(sql, [tablasMinusculas]);
    result.rows.forEach((row: any) => {
      tablasExistentes.push(row.table_name);
    });
  } catch (error) {
    console.warn("Error al verificar tablas existentes:", error);
  }

  return tablasExistentes;
}

async function verificarYRegistrarAsistenciaNull(
  tabla: string,
  campoId: string,
  campoDNI: string,
  dni: string,
  mes: number,
  dia: number,
  campoJson: "Entradas" | "Salidas"
): Promise<{ creado: boolean; actualizado: boolean }> {
  try {
    // Verificar si ya existe un registro para este mes
    const sqlVerificar = `
      SELECT "${campoId}", "${campoJson}"
      FROM "${tabla}"
      WHERE "${campoDNI}" = $1 AND "Mes" = $2
    `;

    const resultVerificar = await query(sqlVerificar, [dni, mes]);

    if (resultVerificar.rowCount > 0) {
      // Ya existe un registro, actualizarlo para agregar el día actual como null
      const registro = resultVerificar.rows[0];
      const jsonActual = registro[campoJson.toLowerCase()] || {};

      // Si ya tiene un registro para este día, no hacer nada
      if (jsonActual[dia.toString()] !== undefined) {
        return { creado: false, actualizado: false };
      }

      // Agregar el registro null para el día actual
      jsonActual[dia.toString()] = null;

      // Actualizar el registro
      const sqlActualizar = `
        UPDATE "${tabla}"
        SET "${campoJson}" = $1
        WHERE "${campoId}" = $2
      `;

      await query(sqlActualizar, [jsonActual, registro[campoId.toLowerCase()]]);
      return { creado: false, actualizado: true };
    } else {
      // No existe un registro, crearlo
      const nuevoJson: any = {};
      nuevoJson[dia.toString()] = null;

      const sqlInsertar = `
        INSERT INTO "${tabla}" ("${campoDNI}", "Mes", "${campoJson}")
        VALUES ($1, $2, $3)
      `;

      await query(sqlInsertar, [dni, mes, nuevoJson]);
      return { creado: true, actualizado: false };
    }
  } catch (error) {
    console.error(
      `Error en verificarYRegistrarAsistenciaNull para tabla ${tabla}:`,
      error
    );
    throw error;
  }
}
