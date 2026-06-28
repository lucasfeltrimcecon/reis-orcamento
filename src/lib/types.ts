export type Empresa = {
  id: string;
  nome: string;
  slug: string;
  created_at: string;
  created_by: string;
};

export type Area = {
  id: string;
  empresa_id: string;
  nome: string;
  ordem: number;
  created_at: string;
};

export type EmpresaComContagem = Empresa & {
  total_areas: number;
};

export type OrcamentoArea = {
  area: Area;
  valores: number[]; // 12 posições, Jan..Dez
  total: number;
};
