import { Meses } from "../../../../interfaces/shared/Meses";
import { obtenerFechasActuales } from "../../../utils/dates/obtenerFechasActuales";
import { query } from "../../connectors/postgres";
import { obtenerPersonalInactivoParaRegistroAutomatico } from "./obtenerPersonalInactivoParaRegistroAutomatico";

export async function registrarAsistenciaAutoNullParaPersonalInactivo(): Promise<{
  totalRegistros: number;
  registrosCreados: number;
  registrosActualizados: number;
}> {
  // Obtener fecha actual en Perú
  const { fechaLocalPeru } = obtenerFechasActuales();

  // Extraer mes y día
  const mes = (fechaLocalPeru.getMonth() + 1) as Meses; // getMonth() devuelve 0-11
  const dia = fechaLocalPeru.getDate();

  // Obtener lista de personal inactivo
  const personalInactivo =
    await obtenerPersonalInactivoParaRegistroAutomatico();

  let registrosCreados = 0;
  let registrosActualizados = 0;

  // Procesar cada miembro del personal inactivo
  for (const persona of personalInactivo) {
    // Procesar tabla de entrada
    const existeRegistroEntrada = await verificarYRegistrarAsistenciaNull(
      persona.tablaMensualEntrada,
      persona.campoId,
      persona.campoDNI,
      persona.dni,
      mes,
      dia,
      "Entradas"
    );

    if (existeRegistroEntrada.creado) registrosCreados++;
    if (existeRegistroEntrada.actualizado) registrosActualizados++;

    // Procesar tabla de salida
    const existeRegistroSalida = await verificarYRegistrarAsistenciaNull(
      persona.tablaMensualSalida,
      persona.campoId,
      persona.campoDNI,
      persona.dni,
      mes,
      dia,
      "Salidas"
    );

    if (existeRegistroSalida.creado) registrosCreados++;
    if (existeRegistroSalida.actualizado) registrosActualizados++;
  }

  return {
    totalRegistros: personalInactivo.length * 2, // Entrada y salida para cada persona
    registrosCreados,
    registrosActualizados,
  };
}

async function verificarYRegistrarAsistenciaNull(
  tabla: string,
  campoId: string,
  campoDNI: string,
  dni: string,
  mes: Meses,
  dia: number,
  campoJson: "Entradas" | "Salidas"
): Promise<{ creado: boolean; actualizado: boolean }> {
  // Verificar si ya existe un registro para este mes
  const sqlVerificar = `
    SELECT ${campoId}, "${campoJson}"
    FROM "${tabla}"
    WHERE "${campoDNI}" = $1 AND "Mes" = $2
  `;

  const resultVerificar = await query(sqlVerificar, [dni, mes]);

  if (resultVerificar.rowCount > 0) {
    // Ya existe un registro, actualizarlo para agregar el día actual como null
    const registro = resultVerificar.rows[0];
    const jsonActual = registro[campoJson] || {};

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
      WHERE ${campoId} = $2
    `;

    await query(sqlActualizar, [jsonActual, registro[campoId]]);
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
}
