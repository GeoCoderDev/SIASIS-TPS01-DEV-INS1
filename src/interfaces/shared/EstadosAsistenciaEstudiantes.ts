import { ModoRegistro } from "./ModoRegistroPersonal";

export enum EstadosAsistencia {
  Temprano = "A",
  Tarde = "T",
  Falta = "F",
  Inactivo = "-",
  Feriado = ModoRegistro.Entrada,
  Vacaciones = "V",
}
