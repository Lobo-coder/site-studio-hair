/** Nomes iguais às colunas do banco: sem camada de tradução. */

export interface Settings {
  nome_negocio: string;
  slogan: string;
  hero_titulo: string;
  hero_subtitulo: string;
  sobre: string;
  whatsapp: string;
  instagram: string;
  endereco: string;
  mapa_url: string;
  aviso_agendamento: string;
  intervalo_minutos: number;
  passo_minutos: number;
  antecedencia_horas: number;
  janela_dias: number;
  timezone: string;
  rotulo_recurso: string;
  msg_agendamento: string;
  msg_lembrete: string;
}

/** Uma agenda independente: uma profissional, uma quadra, uma sala. */
export interface Resource {
  id: string;
  nome: string;
  ativo: boolean;
  ordem: number;
}

export interface Service {
  id: string;
  nome: string;
  descricao: string;
  preco_centavos: number;
  duracao_minutos: number;
  ativo: boolean;
  ordem: number;
  /** Recursos que fazem este serviço. */
  recursos: string[];
}

/** O que o site público pode ver de um serviço. */
export type PublicService = Pick<Service, "id" | "nome" | "descricao" | "preco_centavos" | "duracao_minutos">;

export interface BusinessHour {
  dia_semana: number;
  atende: boolean;
  abre: string;
  fecha: string;
  pausa_inicio: string | null;
  pausa_fim: string | null;
}

export interface Block {
  id: string;
  /** null = vale para todos os recursos */
  recurso_id: string | null;
  inicio: string;
  fim: string;
  motivo: string;
}

export type AppointmentStatus = "agendado" | "concluido" | "cancelado" | "faltou";

export interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  servico_nome: string;
  preco_centavos: number;
  duracao_minutos: number;
  observacao: string;
  origem: "site" | "painel";
  recurso_nome: string;
  cliente_nome: string;
  cliente_whatsapp: string;
}
