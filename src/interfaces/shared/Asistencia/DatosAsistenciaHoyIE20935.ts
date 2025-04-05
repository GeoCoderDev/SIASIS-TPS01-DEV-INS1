import { NivelEducativo } from "../NivelEducativo";

import {
  T_Comunicados,
  T_Personal_Administrativo,
  T_Profesores_Primaria,
  T_Profesores_Secundaria,
} from "@prisma/client";

export interface HorarioTomaAsistencia {
  Inicio: Date;
  Fin: Date;
}

export interface HorarioLaboral {
  Entrada: Date;
  Salida: Date;
}

export type PersonalAdministrativoParaTomaDeAsistencia = Pick<
  T_Personal_Administrativo,
  | "DNI_Personal_Administrativo"
  | "Genero"
  | "Nombres"
  | "Apellidos"
  | "Cargo"
  | "Google_Drive_Foto_ID"
  | "Horario_Laboral_Entrada"
  | "Horario_Laboral_Salida"
>;

export type ProfesoresPrimariaParaTomaDeAsistencia = Pick<
  T_Profesores_Primaria,
  | "DNI_Profesor_Primaria"
  | "Genero"
  | "Nombres"
  | "Apellidos"
  | "Google_Drive_Foto_ID"
>;

export type ProfesorTutorSecundariaParaTomaDeAsistencia = Pick<
  T_Profesores_Secundaria,
  | "DNI_Profesor_Secundaria"
  | "Nombres"
  | "Apellidos"
  | "Genero"
  | "Google_Drive_Foto_ID"
> & {
  Hora_Entrada_Dia_Actual: Date;
  Hora_Salida_Dia_Actual: Date;
};

export interface DatosAsistenciaHoyIE20935 {
  DiaEvento: boolean;
  FechaUTC: Date;
  FechaLocalPeru: Date;

  DentroAñoEscolar: boolean;
  FueraVacionesMedioAño: boolean;

  ComunicadosParaMostrarHoy: T_Comunicados[];

  ListaDePersonalesAdministrativos: PersonalAdministrativoParaTomaDeAsistencia[];

  ListaDeProfesoresPrimaria: ProfesoresPrimariaParaTomaDeAsistencia[];

  ListaDeProfesoresSecundaria: ProfesorTutorSecundariaParaTomaDeAsistencia[];

  HorariosLaboraresGenerales: {
    TomaAsistenciaRangoTotalPersonales: HorarioTomaAsistencia;
    TomaAsistenciaProfesorPrimaria: HorarioTomaAsistencia;
    TomaAsistenciaAuxiliares: HorarioTomaAsistencia;
  };

  HorariosEscolares: Record<NivelEducativo, HorarioTomaAsistencia>;
}
