// obtenerPersonalInactivoParaRegistroAutomatico.ts

import { RolesSistema } from "../../../../interfaces/shared/RolesSistema";
import { query } from "../../connectors/postgres";

interface PersonalInactivo {
  dni: string;
  rol: RolesSistema;
  tablaMensualEntrada: string;
  tablaMensualSalida: string;
  campoId: string;
  campoDNI: string;
}

export async function obtenerPersonalInactivoParaRegistroAutomatico(): Promise<
  PersonalInactivo[]
> {
  // Crear una lista con todos los registros de personal inactivo
  const personalInactivo: PersonalInactivo[] = [];

  // 1. Auxiliares inactivos
  const sqlAuxiliares = `
    SELECT "DNI_Auxiliar" as dni
    FROM "T_Auxiliares"
    WHERE "Estado" = false
  `;

  const auxiliaresInactivos = await query(sqlAuxiliares);
  auxiliaresInactivos.rows.forEach((row: any) => {
    personalInactivo.push({
      dni: row.dni,
      rol: RolesSistema.Auxiliar,
      tablaMensualEntrada: "t_Control_Entrada_Mensual_Auxiliar",
      tablaMensualSalida: "t_Control_Salida_Mensual_Auxiliar",
      campoId: "Id_C_E_M_P_Auxiliar",
      campoDNI: "DNI_Auxiliar",
    });
  });

  // 2. Profesores de primaria inactivos
  const sqlProfesoresPrimaria = `
    SELECT "DNI_Profesor_Primaria" as dni
    FROM "T_Profesores_Primaria"
    WHERE "Estado" = false
  `;

  const profesoresPrimariaInactivos = await query(sqlProfesoresPrimaria);
  profesoresPrimariaInactivos.rows.forEach((row: any) => {
    personalInactivo.push({
      dni: row.dni,
      rol: RolesSistema.ProfesorPrimaria,
      tablaMensualEntrada: "t_Control_Entrada_Mensual_Profesores_Primaria",
      tablaMensualSalida: "t_Control_Salida_Mensual_Profesores_Primaria",
      campoId: "Id_C_E_M_P_Profesores_Primaria",
      campoDNI: "DNI_Profesor_Primaria",
    });
  });

  // 3. Profesores de secundaria inactivos
  const sqlProfesoresSecundaria = `
    SELECT "DNI_Profesor_Secundaria" as dni
    FROM "T_Profesores_Secundaria"
    WHERE "Estado" = false
  `;

  const profesoresSecundariaInactivos = await query(sqlProfesoresSecundaria);
  profesoresSecundariaInactivos.rows.forEach((row: any) => {
    personalInactivo.push({
      dni: row.dni,
      rol: RolesSistema.ProfesorSecundaria,
      tablaMensualEntrada: "t_Control_Entrada_Mensual_Profesores_Secundaria",
      tablaMensualSalida: "t_Control_Salida_Mensual_Profesores_Secundaria",
      campoId: "Id_C_E_M_P_Profesores_Secundaria",
      campoDNI: "DNI_Profesor_Secundaria",
    });
  });

  // 4. Personal administrativo inactivo
  const sqlPersonalAdministrativo = `
    SELECT "DNI_Personal_Administrativo" as dni
    FROM "T_Personal_Administrativo"
    WHERE "Estado" = false
  `;

  const personalAdministrativoInactivo = await query(sqlPersonalAdministrativo);
  personalAdministrativoInactivo.rows.forEach((row: any) => {
    personalInactivo.push({
      dni: row.dni,
      rol: RolesSistema.PersonalAdministrativo,
      tablaMensualEntrada: "t_Control_Entrada_Mensual_Personal_Administrativo",
      tablaMensualSalida: "t_Control_Salida_Mensual_Personal_Administrativo",
      campoId: "Id_C_E_M_P_Administrativo",
      campoDNI: "DNI_Personal_Administrativo",
    });
  });

  return personalInactivo;
}
