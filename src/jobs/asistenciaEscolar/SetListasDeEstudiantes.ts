import {
  T_Archivos_Respaldo_Google_Drive,
  T_Aulas,
  T_Estudiantes,
  T_Modificaciones_Especificas,
} from "@prisma/client";
import {
  GradosPrimaria,
  GradosSecundaria,
} from "../../constants/GRADOS_POR_NIVEL_EDUCATIVO";
import { closeClient } from "../../core/databases/connectors/mongodb";
import { closePool } from "../../core/databases/connectors/postgres";
import { obtenerArchivosRespaldoDeUltimasListasEstudiantes } from "../../core/databases/queries/RDP02/archivos-respaldo/obtenerArchivosListasEstudiantes";
import { obtenerAulasPorGradoYNivel } from "../../core/databases/queries/RDP03/aulas/obtenerAulasPorGradoYNivel";
import {
  GradosPorNivel,
  obtenerEstudiantesPorGradoYNivel,
} from "../../core/databases/queries/RDP03/estudiantes/obtenerEstudiantesPorNivelYGrado";
import { obtenerModificacionesEspecificasEstudiantes } from "../../core/databases/queries/RDP03/modificaciones-especificas/obtenerModificacionesEspecificasDeEstudiantes";
import { actualizarArchivoRespaldoEnGoogleDrive } from "../../core/external/google/drive/actualizarArchivoDatosAsistencia";
import { descargarArchivoJSONDesdeGoogleDrive } from "../../core/external/google/drive/descargarArchivoJSONDesdeGoogle";
import { guardarObjetoComoJSONEnBlobs } from "../../core/external/vercel/blobs/guardarObjetoComoJSONEnBlobs";
import { ListaEstudiantesPorGradoParaHoy } from "../../interfaces/shared/Asistencia/ListaEstudiantesPorGradosParaHoy";
import { NivelEducativo } from "../../interfaces/shared/NivelEducativo";
import { generarNombreArchivo } from "../../core/utils/helpers/generators/generarNombreArchivoJSONListaEstudiantes";
import { obtenerFechasActuales } from "../../core/utils/dates/obtenerFechasActuales";
import verificarFueraAñoEscolar from "../../core/utils/helpers/verificators/verificarDentroAñoEscolar";
import { obtenerFechasAñoEscolar } from "../../core/databases/queries/RDP02/fechas-importantes/obtenerFechasAñoEscolar";
import { NOMBRE_ARCHIVO_REPORTE_ACTUALIZACION_DE_LISTAS_DE_ESTUDIANTES } from "../../constants/NOMBRE_ARCHIVOS_SISTEMA";
import { ReporteActualizacionDeListasEstudiantes } from "../../interfaces/shared/Asistencia/ReporteModificacionesListasDeEstudiantes";

/**
 * Inicializa el reporte con todos los archivos de estudiantes y fechas por defecto
 */
function inicializarReporteActualizacion(
  fechaActual: Date
): ReporteActualizacionDeListasEstudiantes {
  console.log("🔧 [DEBUG] Inicializando reporte de actualización...");

  // Crear objeto con todas las propiedades requeridas por el tipo
  const estadoInicial = {} as Record<string, Date>;

  // Agregar todos los archivos de PRIMARIA
  console.log("🔧 [DEBUG] Agregando archivos de PRIMARIA al reporte...");
  for (const grado of Object.values(GradosPrimaria)) {
    if (typeof grado === "number") {
      const nombreArchivo = generarNombreArchivo(
        NivelEducativo.PRIMARIA,
        grado as GradosPrimaria
      );
      estadoInicial[nombreArchivo] = fechaActual;
      console.log(`🔧 [DEBUG] Agregado: ${nombreArchivo}`);
    }
  }

  // Agregar todos los archivos de SECUNDARIA
  console.log("🔧 [DEBUG] Agregando archivos de SECUNDARIA al reporte...");
  for (const grado of Object.values(GradosSecundaria)) {
    if (typeof grado === "number") {
      const nombreArchivo = generarNombreArchivo(
        NivelEducativo.SECUNDARIA,
        grado as GradosSecundaria
      );
      estadoInicial[nombreArchivo] = fechaActual;
      console.log(`🔧 [DEBUG] Agregado: ${nombreArchivo}`);
    }
  }

  console.log(
    `🔧 [DEBUG] Reporte inicializado con ${
      Object.keys(estadoInicial).length
    } archivos`
  );

  return {
    EstadoDeListasDeEstudiantes: estadoInicial as any,
    Fecha_Actualizacion: fechaActual,
  };
}

/**
 * Verifica si hay modificaciones para una combinación específica de nivel y grado
 */
function buscarModificacionParaNivelYGrado<T extends NivelEducativo>(
  modificaciones: T_Modificaciones_Especificas[],
  nivel: T,
  grado: T extends NivelEducativo.PRIMARIA ? GradosPrimaria : GradosSecundaria
): T_Modificaciones_Especificas | undefined {
  const valorBuscado = `${nivel},${grado}`;
  console.log(`🔧 [DEBUG] Buscando modificación para: ${valorBuscado}`);

  const modificacion = modificaciones.find(
    (m) => m.Valores_Campos_Identificadores === valorBuscado
  );

  if (modificacion) {
    console.log(
      `🔧 [DEBUG] ✅ Modificación encontrada: ${modificacion.Id_Modificacion_Especifica}, Fecha: ${modificacion.Fecha_Modificacion}`
    );
  } else {
    console.log(
      `🔧 [DEBUG] ❌ No se encontró modificación para: ${valorBuscado}`
    );
  }

  return modificacion;
}

/**
 * Busca un archivo existente para una combinación de nivel y grado
 */
function buscarArchivoExistente<T extends NivelEducativo>(
  archivos: T_Archivos_Respaldo_Google_Drive[],
  nivel: T,
  grado: T extends NivelEducativo.PRIMARIA ? GradosPrimaria : GradosSecundaria
): T_Archivos_Respaldo_Google_Drive | undefined {
  const nombreArchivo = generarNombreArchivo(nivel, grado);
  console.log(`🔧 [DEBUG] Buscando archivo existente: ${nombreArchivo}`);

  const archivo = archivos.find(
    (archivo) => archivo.Nombre_Archivo === nombreArchivo
  );

  if (archivo) {
    console.log(
      `🔧 [DEBUG] ✅ Archivo encontrado: ID=${archivo.Google_Drive_Id}, Fecha=${archivo.Ultima_Modificacion}`
    );
  } else {
    console.log(`🔧 [DEBUG] ❌ No se encontró archivo: ${nombreArchivo}`);
  }

  return archivo;
}

/**
 * Procesa una combinación específica de nivel y grado
 */
async function procesarNivelYGrado<T extends NivelEducativo>(
  nivel: T,
  grado: T extends NivelEducativo.PRIMARIA ? GradosPrimaria : GradosSecundaria,
  modificaciones: T_Modificaciones_Especificas[],
  archivosExistentes: T_Archivos_Respaldo_Google_Drive[],
  estadoReporte: Record<string, Date>
): Promise<boolean> {
  const procesoId = `${nivel}-${grado}`;
  console.log(
    `\n🔄 [${procesoId}] ==================== INICIANDO PROCESAMIENTO ====================`
  );

  try {
    const { fechaUTC, fechaLocalPeru } = obtenerFechasActuales();
    const nombreArchivo = generarNombreArchivo(nivel, grado);

    console.log(`🔧 [${procesoId}] Nombre del archivo: ${nombreArchivo}`);
    console.log(`🔧 [${procesoId}] Fecha UTC: ${fechaUTC.toISOString()}`);
    console.log(
      `🔧 [${procesoId}] Fecha Perú: ${fechaLocalPeru.toISOString()}`
    );

    // Verificar si hay modificaciones para esta combinación
    console.log(`🔧 [${procesoId}] Paso 1: Buscando modificaciones...`);
    const modificacion = buscarModificacionParaNivelYGrado(
      modificaciones,
      nivel,
      grado
    );

    // Buscar archivo existente
    console.log(`🔧 [${procesoId}] Paso 2: Buscando archivo existente...`);
    const archivoExistente = buscarArchivoExistente(
      archivosExistentes,
      nivel,
      grado
    );

    let debeActualizar = false;
    let fechaParaReporte = fechaUTC;
    let estudiantes: T_Estudiantes[] = [];
    let aulas: T_Aulas[] = [];

    console.log(
      `🔧 [${procesoId}] Paso 3: Determinando estrategia de procesamiento...`
    );

    if (!modificacion) {
      console.log(
        `⚠️ [${procesoId}] No hay modificaciones registradas, consultando desde cero por seguridad`
      );
      debeActualizar = true;

      console.log(`🔧 [${procesoId}] Consultando estudiantes desde MongoDB...`);
      estudiantes = await obtenerEstudiantesPorGradoYNivel(
        nivel,
        grado as GradosPorNivel<typeof nivel>
      );
      console.log(
        `🔧 [${procesoId}] ✅ Estudiantes obtenidos: ${estudiantes.length} estudiantes`
      );

      // LOG CRÍTICO: Verificar que los estudiantes están correctos
      if (estudiantes.length > 0) {
        console.log(
          `🔧 [${procesoId}] Primer estudiante: ${JSON.stringify(
            estudiantes[0],
            null,
            2
          )}`
        );
      }

      console.log(`🔧 [${procesoId}] Consultando aulas desde MongoDB...`);
      aulas = await obtenerAulasPorGradoYNivel(nivel, grado);
      console.log(
        `🔧 [${procesoId}] ✅ Aulas obtenidas: ${aulas.length} aulas`
      );

      // LOG CRÍTICO: Verificar que las aulas están correctas
      if (aulas.length > 0) {
        console.log(
          `🔧 [${procesoId}] Primera aula: ${JSON.stringify(aulas[0], null, 2)}`
        );
      }
    } else {
      console.log(
        `✅ [${procesoId}] Encontrada modificación para ${nivel} grado ${grado}`
      );

      if (!archivoExistente) {
        console.log(
          `📝 [${procesoId}] No existe archivo previo, creando desde cero`
        );
        debeActualizar = true;

        console.log(
          `🔧 [${procesoId}] Consultando estudiantes desde MongoDB...`
        );
        estudiantes = await obtenerEstudiantesPorGradoYNivel(
          nivel,
          grado as GradosPorNivel<typeof nivel>
        );
        console.log(
          `🔧 [${procesoId}] ✅ Estudiantes obtenidos: ${estudiantes.length} estudiantes`
        );

        console.log(`🔧 [${procesoId}] Consultando aulas desde MongoDB...`);
        aulas = await obtenerAulasPorGradoYNivel(nivel, grado);
        console.log(
          `🔧 [${procesoId}] ✅ Aulas obtenidas: ${aulas.length} aulas`
        );
      } else {
        try {
          console.log(
            `📥 [${procesoId}] Descargando archivo existente para comparar fechas...`
          );
          const datosExistentes = await descargarArchivoJSONDesdeGoogleDrive<
            ListaEstudiantesPorGradoParaHoy<T>
          >(archivoExistente.Google_Drive_Id);

          console.log(`🔧 [${procesoId}] Archivo descargado exitosamente`);
          console.log(
            `🔧 [${procesoId}] Estudiantes en archivo existente: ${
              datosExistentes.ListaEstudiantes?.length || 0
            }`
          );
          console.log(
            `🔧 [${procesoId}] Aulas en archivo existente: ${
              datosExistentes.Aulas?.length || 0
            }`
          );

          const fechaModificacion = new Date(modificacion.Fecha_Modificacion);
          const fechaArchivoExistente = new Date(
            datosExistentes.Fecha_Actualizacion
          );

          console.log(
            `🔧 [${procesoId}] Fecha modificación: ${fechaModificacion.toISOString()}`
          );
          console.log(
            `🔧 [${procesoId}] Fecha archivo existente: ${fechaArchivoExistente.toISOString()}`
          );

          if (fechaModificacion > fechaArchivoExistente) {
            console.log(
              `🔄 [${procesoId}] Modificación más reciente que archivo existente, actualizando...`
            );
            debeActualizar = true;

            console.log(
              `🔧 [${procesoId}] Consultando estudiantes desde MongoDB...`
            );
            estudiantes = await obtenerEstudiantesPorGradoYNivel(
              nivel,
              grado as GradosPorNivel<typeof nivel>
            );
            console.log(
              `🔧 [${procesoId}] ✅ Estudiantes obtenidos: ${estudiantes.length} estudiantes`
            );

            console.log(`🔧 [${procesoId}] Consultando aulas desde MongoDB...`);
            aulas = await obtenerAulasPorGradoYNivel(nivel, grado);
            console.log(
              `🔧 [${procesoId}] ✅ Aulas obtenidas: ${aulas.length} aulas`
            );
          } else {
            console.log(
              `✅ [${procesoId}] Archivo existente está actualizado, no se requiere actualización`
            );
            debeActualizar = false;
            fechaParaReporte = fechaArchivoExistente;
          }
        } catch (downloadError) {
          console.error(
            `❌ [${procesoId}] Error al descargar archivo existente:`,
            downloadError
          );
          console.log(`🔧 [${procesoId}] Fallback: consultando desde cero`);
          debeActualizar = true;

          console.log(
            `🔧 [${procesoId}] Consultando estudiantes desde MongoDB...`
          );
          estudiantes = await obtenerEstudiantesPorGradoYNivel(
            nivel,
            grado as GradosPorNivel<typeof nivel>
          );
          console.log(
            `🔧 [${procesoId}] ✅ Estudiantes obtenidos: ${estudiantes.length} estudiantes`
          );

          console.log(`🔧 [${procesoId}] Consultando aulas desde MongoDB...`);
          aulas = await obtenerAulasPorGradoYNivel(nivel, grado);
          console.log(
            `🔧 [${procesoId}] ✅ Aulas obtenidas: ${aulas.length} aulas`
          );
        }
      }
    }

    // LOG CRÍTICO: Verificar estado antes de construir objeto final
    console.log(
      `🔧 [${procesoId}] ==================== VERIFICACIÓN PRE-CONSTRUCCIÓN ====================`
    );
    console.log(`🔧 [${procesoId}] Debe actualizar: ${debeActualizar}`);
    console.log(
      `🔧 [${procesoId}] Estudiantes en memoria: ${estudiantes.length}`
    );
    console.log(`🔧 [${procesoId}] Aulas en memoria: ${aulas.length}`);
    console.log(
      `🔧 [${procesoId}] Tipo de estudiantes: ${typeof estudiantes}, Es array: ${Array.isArray(
        estudiantes
      )}`
    );
    console.log(
      `🔧 [${procesoId}] Tipo de aulas: ${typeof aulas}, Es array: ${Array.isArray(
        aulas
      )}`
    );

    // Verificación adicional de integridad de datos
    if (debeActualizar && estudiantes.length === 0 && aulas.length === 0) {
      console.warn(
        `⚠️ [${procesoId}] ADVERTENCIA: Se va a actualizar pero no hay datos. Esto podría ser un problema.`
      );
      console.log(`🔧 [${procesoId}] Reintentando consultas una vez más...`);

      // Reintento de seguridad
      try {
        estudiantes = await obtenerEstudiantesPorGradoYNivel(
          nivel,
          grado as GradosPorNivel<typeof nivel>
        );
        aulas = await obtenerAulasPorGradoYNivel(nivel, grado);
        console.log(
          `🔧 [${procesoId}] Reintento - Estudiantes: ${estudiantes.length}, Aulas: ${aulas.length}`
        );
      } catch (retryError) {
        console.error(`❌ [${procesoId}] Error en reintento:`, retryError);
      }
    }

    if (debeActualizar) {
      console.log(
        `🔧 [${procesoId}] ==================== CONSTRUYENDO OBJETO FINAL ====================`
      );

      // Clonar arrays para evitar referencias compartidas
      const estudiantesCopia = [...estudiantes];
      const aulasCopia = [...aulas];

      console.log(
        `🔧 [${procesoId}] Estudiantes copiados: ${estudiantesCopia.length}`
      );
      console.log(`🔧 [${procesoId}] Aulas copiadas: ${aulasCopia.length}`);

      const listaFinal: ListaEstudiantesPorGradoParaHoy<T> = {
        ListaEstudiantes: estudiantesCopia,
        Aulas: aulasCopia,
        Nivel: nivel,
        Grado: grado,
        Fecha_Actualizacion: fechaUTC,
        Fecha_Actualizacion_Peru: fechaLocalPeru,
      };

      // LOG CRÍTICO: Verificar objeto final antes de guardar
      console.log(
        `🔧 [${procesoId}] ==================== VERIFICACIÓN POST-CONSTRUCCIÓN ====================`
      );
      console.log(
        `🔧 [${procesoId}] ListaFinal.ListaEstudiantes.length: ${listaFinal.ListaEstudiantes.length}`
      );
      console.log(
        `🔧 [${procesoId}] ListaFinal.Aulas.length: ${listaFinal.Aulas.length}`
      );
      console.log(`🔧 [${procesoId}] ListaFinal.Nivel: ${listaFinal.Nivel}`);
      console.log(`🔧 [${procesoId}] ListaFinal.Grado: ${listaFinal.Grado}`);

      // Si hay datos vacíos, hacer log del objeto completo para debug
      if (
        listaFinal.ListaEstudiantes.length === 0 &&
        estudiantesCopia.length > 0
      ) {
        console.error(
          `🚨 [${procesoId}] PROBLEMA CRÍTICO: Los estudiantes se perdieron al crear listaFinal!`
        );
        console.log(
          `🔧 [${procesoId}] EstudiantesCopia original: ${estudiantesCopia.length}`
        );
        console.log(
          `🔧 [${procesoId}] JSON.stringify(estudiantesCopia): ${JSON.stringify(
            estudiantesCopia
          ).substring(0, 200)}...`
        );
      }

      console.log(
        `💾 [${procesoId}] Guardando archivo ${nombreArchivo} con ${listaFinal.ListaEstudiantes.length} estudiantes y ${listaFinal.Aulas.length} aulas`
      );

      // Guardar en Vercel Blobs
      console.log(`🔧 [${procesoId}] Iniciando guardado en Vercel Blobs...`);
      await guardarObjetoComoJSONEnBlobs(listaFinal, nombreArchivo);
      console.log(`🔧 [${procesoId}] ✅ Guardado en Vercel Blobs completado`);

      // Actualizar archivo de respaldo en Google Drive
      console.log(
        `🔧 [${procesoId}] Iniciando actualización en Google Drive...`
      );
      await actualizarArchivoRespaldoEnGoogleDrive(nombreArchivo, listaFinal);
      console.log(
        `🔧 [${procesoId}] ✅ Actualización en Google Drive completada`
      );

      console.log(
        `✅ [${procesoId}] ${nombreArchivo} actualizado correctamente`
      );

      // Actualizar fecha en el reporte con la nueva fecha
      estadoReporte[nombreArchivo] = fechaUTC;
      console.log(
        `🔧 [${procesoId}] Fecha actualizada en reporte: ${fechaUTC.toISOString()}`
      );
    } else {
      console.log(
        `⏭️ [${procesoId}] ${nombreArchivo} no requiere actualización`
      );
      estadoReporte[nombreArchivo] = fechaParaReporte;
      console.log(
        `🔧 [${procesoId}] Fecha mantenida en reporte: ${fechaParaReporte.toISOString()}`
      );
    }

    console.log(
      `🔧 [${procesoId}] ==================== PROCESAMIENTO COMPLETADO ====================`
    );
    return debeActualizar;
  } catch (error) {
    console.error(`❌ [${procesoId}] Error procesando nivel y grado:`, error);
    console.error(`❌ [${procesoId}] Stack trace:`, (error as Error).stack);
    throw error;
  }
}

/**
 * Función principal que maneja todo el proceso de actualización
 */
async function main() {
  console.log(
    "🚀 ==================== INICIANDO SISTEMA DE ACTUALIZACIÓN ===================="
  );

  try {
    // Obtener fechas actuales
    console.log("🔧 [MAIN] Obteniendo fechas actuales...");
    const { fechaUTC, fechaLocalPeru } = obtenerFechasActuales();
    console.log(`🔧 [MAIN] Fecha UTC: ${fechaUTC.toISOString()}`);
    console.log(`🔧 [MAIN] Fecha Perú: ${fechaLocalPeru.toISOString()}`);

    // Verificar si estamos dentro del año escolar
    console.log("🔧 [MAIN] Verificando año escolar...");
    const fechasAñoEscolar = await obtenerFechasAñoEscolar();
    console.log(
      `🔧 [MAIN] Inicio año escolar: ${fechasAñoEscolar.Inicio_Año_Escolar}`
    );
    console.log(
      `🔧 [MAIN] Fin año escolar: ${fechasAñoEscolar.Fin_Año_Escolar}`
    );

    const fueraAñoEscolar = verificarFueraAñoEscolar(
      fechaLocalPeru,
      fechasAñoEscolar.Inicio_Año_Escolar,
      fechasAñoEscolar.Fin_Año_Escolar
    );

    if (fueraAñoEscolar) {
      console.log(
        "🚫 [MAIN] Fuera del año escolar, no se procesará la actualización de registros de listas de estudiantes."
      );
      return;
    }

    console.log(
      "🚀 [MAIN] Iniciando sistema de actualización de listas de estudiantes..."
    );

    // Inicializar reporte con todas las propiedades requeridas
    console.log(
      "\n📊 [MAIN] Paso 0: Inicializando reporte de actualización..."
    );
    const reporteActualizacion = inicializarReporteActualizacion(fechaUTC);

    console.log(
      `📋 [MAIN] Reporte inicializado con ${
        Object.keys(reporteActualizacion.EstadoDeListasDeEstudiantes).length
      } archivos`
    );

    // 1. Obtener modificaciones específicas de estudiantes
    console.log("\n📋 [MAIN] Paso 1: Obteniendo modificaciones específicas...");
    const modificaciones = await obtenerModificacionesEspecificasEstudiantes();
    console.log(
      `🔧 [MAIN] ✅ Modificaciones obtenidas: ${modificaciones.length} registros`
    );

    if (modificaciones.length > 0) {
      console.log(
        `🔧 [MAIN] Primera modificación: ${JSON.stringify(
          modificaciones[0],
          null,
          2
        )}`
      );
    }

    // 2. Obtener archivos existentes de estudiantes
    console.log("\n📁 [MAIN] Paso 2: Obteniendo archivos existentes...");
    const archivosExistentes =
      await obtenerArchivosRespaldoDeUltimasListasEstudiantes();
    console.log(
      `🔧 [MAIN] ✅ Archivos existentes obtenidos: ${archivosExistentes.length} registros`
    );

    if (archivosExistentes.length > 0) {
      console.log(
        `🔧 [MAIN] Primer archivo: ${JSON.stringify(
          archivosExistentes[0],
          null,
          2
        )}`
      );
    }

    // 3. Procesar cada nivel y grado
    console.log("\n🔄 [MAIN] Paso 3: Procesando cada nivel y grado...");

    let archivosActualizados = 0;
    let archivosNoActualizados = 0;

    // Iterar por PRIMARIA
    console.log("\n📚 [MAIN] === PROCESANDO PRIMARIA ===");
    const gradosPrimaria = Object.values(GradosPrimaria).filter(
      (g) => typeof g === "number"
    );
    console.log(
      `🔧 [MAIN] Grados de primaria a procesar: ${gradosPrimaria.join(", ")}`
    );

    for (const grado of gradosPrimaria) {
      console.log(`🔧 [MAIN] Procesando PRIMARIA grado ${grado}...`);
      const fueActualizado = await procesarNivelYGrado(
        NivelEducativo.PRIMARIA,
        grado as GradosPrimaria,
        modificaciones,
        archivosExistentes,
        reporteActualizacion.EstadoDeListasDeEstudiantes
      );

      if (fueActualizado) {
        archivosActualizados++;
        console.log(`🔧 [MAIN] ✅ PRIMARIA grado ${grado} fue actualizado`);
      } else {
        archivosNoActualizados++;
        console.log(
          `🔧 [MAIN] ⏭️ PRIMARIA grado ${grado} no requirió actualización`
        );
      }

      // Pausa breve entre procesamientos para evitar race conditions
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Iterar por SECUNDARIA
    console.log("\n🎓 [MAIN] === PROCESANDO SECUNDARIA ===");
    const gradosSecundaria = Object.values(GradosSecundaria).filter(
      (g) => typeof g === "number"
    );
    console.log(
      `🔧 [MAIN] Grados de secundaria a procesar: ${gradosSecundaria.join(
        ", "
      )}`
    );

    for (const grado of gradosSecundaria) {
      console.log(`🔧 [MAIN] Procesando SECUNDARIA grado ${grado}...`);
      const fueActualizado = await procesarNivelYGrado(
        NivelEducativo.SECUNDARIA,
        grado as GradosSecundaria,
        modificaciones,
        archivosExistentes,
        reporteActualizacion.EstadoDeListasDeEstudiantes
      );

      if (fueActualizado) {
        archivosActualizados++;
        console.log(`🔧 [MAIN] ✅ SECUNDARIA grado ${grado} fue actualizado`);
      } else {
        archivosNoActualizados++;
        console.log(
          `🔧 [MAIN] ⏭️ SECUNDARIA grado ${grado} no requirió actualización`
        );
      }

      // Pausa breve entre procesamientos para evitar race conditions
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 4. Finalizar reporte y guardarlo
    console.log(
      "\n📊 [MAIN] Paso 4: Finalizando y guardando reporte de actualizaciones..."
    );

    // Actualizar fecha final del reporte
    reporteActualizacion.Fecha_Actualizacion = fechaUTC;

    console.log(
      `💾 [MAIN] Guardando reporte de actualización con ${
        Object.keys(reporteActualizacion.EstadoDeListasDeEstudiantes).length
      } archivos registrados`
    );

    console.log(
      `📊 [MAIN] Resumen de procesamiento: ${archivosActualizados} actualizados, ${archivosNoActualizados} sin cambios`
    );

    // Verificar integridad del reporte antes de guardar
    console.log(
      "🔧 [MAIN] ==================== VERIFICACIÓN FINAL DEL REPORTE ===================="
    );
    console.log(
      `🔧 [MAIN] Archivos en reporte: ${
        Object.keys(reporteActualizacion.EstadoDeListasDeEstudiantes).length
      }`
    );
    Object.entries(reporteActualizacion.EstadoDeListasDeEstudiantes).forEach(
      ([archivo, fecha]) => {
        console.log(`🔧 [MAIN] ${archivo}: ${fecha.toISOString()}`);
      }
    );

    // Guardar reporte en Vercel Blobs
    console.log("🔧 [MAIN] Iniciando guardado del reporte en Vercel Blobs...");
    await guardarObjetoComoJSONEnBlobs(
      reporteActualizacion,
      NOMBRE_ARCHIVO_REPORTE_ACTUALIZACION_DE_LISTAS_DE_ESTUDIANTES
    );
    console.log("🔧 [MAIN] ✅ Reporte guardado en Vercel Blobs");

    // Guardar reporte en Google Drive
    console.log(
      "🔧 [MAIN] Iniciando actualización del reporte en Google Drive..."
    );
    await actualizarArchivoRespaldoEnGoogleDrive(
      NOMBRE_ARCHIVO_REPORTE_ACTUALIZACION_DE_LISTAS_DE_ESTUDIANTES,
      reporteActualizacion
    );
    console.log("🔧 [MAIN] ✅ Reporte actualizado en Google Drive");

    console.log(`✅ [MAIN] Reporte de actualización guardado correctamente`);

    // Mostrar resumen del reporte
    console.log("\n📋 [MAIN] === RESUMEN FINAL DEL REPORTE ===");
    Object.entries(reporteActualizacion.EstadoDeListasDeEstudiantes).forEach(
      ([archivo, fecha]) => {
        console.log(`📄 [MAIN] ${archivo}: ${fecha.toISOString()}`);
      }
    );

    console.log(
      "\n✅ [MAIN] ==================== SISTEMA COMPLETADO EXITOSAMENTE ===================="
    );
    console.log(
      `📊 [MAIN] Total archivos procesados: ${
        Object.keys(reporteActualizacion.EstadoDeListasDeEstudiantes).length
      }`
    );
    console.log(`📊 [MAIN] Archivos actualizados: ${archivosActualizados}`);
    console.log(`📊 [MAIN] Archivos sin cambios: ${archivosNoActualizados}`);
  } catch (error) {
    console.error(
      "❌ [MAIN] ==================== ERROR CRÍTICO ===================="
    );
    console.error(
      "❌ [MAIN] Error en el sistema de actualización de listas de estudiantes:",
      error
    );
    console.error("❌ [MAIN] Stack trace:", (error as Error).stack);
    console.error("❌ [MAIN] Tipo de error:", typeof error);
    console.error(
      "❌ [MAIN] Error stringificado:",
      JSON.stringify(error, null, 2)
    );
    process.exit(1);
  } finally {
    // Cerrar todas las conexiones
    console.log("\n🔌 [MAIN] Cerrando conexiones...");
    try {
      await Promise.all([closePool(), closeClient()]);
      console.log("✅ [MAIN] Conexiones cerradas correctamente");
    } catch (closeError) {
      console.error("❌ [MAIN] Error al cerrar conexiones:", closeError);
    }
    console.log("🏁 [MAIN] Finalizando proceso...");
    process.exit(0);
  }
}

// Ejecutar el script
console.log(
  "🎬 ==================== INICIANDO SCRIPT DE LISTAS DE ESTUDIANTES ===================="
);
console.log(`🎬 Fecha de ejecución: ${new Date().toISOString()}`);
console.log(`🎬 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
console.log(`🎬 Process ID: ${process.pid}`);
console.log(`🎬 Node version: ${process.version}`);
console.log(`🎬 Platform: ${process.platform}`);

main().catch((error) => {
  console.error("🚨 ERROR NO CAPTURADO EN MAIN:", error);
  process.exit(1);
});
