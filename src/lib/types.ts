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
  mostrar: boolean; // aparece no painel? (false = fora do painel inteiro)
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

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "master" | "cliente";
  created_at: string;
};

export type UsuarioComEmpresas = Profile & {
  empresas: { id: string; nome: string }[];
};

export type Pasta = {
  id: string;
  empresa_id: string;
  parent_id: string | null;
  nome: string;
  ordem: number;
  created_at: string;
};

export type CategoriaDoc = "mapeamento" | "fechamento" | "documento";

export type Documento = {
  id: string;
  empresa_id: string;
  pasta_id: string | null;
  categoria: CategoriaDoc;
  titulo: string;
  ano: number | null;
  mes: number | null;
  storage_path: string;
  mime: string | null;
  tamanho_bytes: number | null;
  created_by: string;
  created_at: string;
};

export type Fechamento = {
  id: string;
  empresa_id: string;
  ano: number;
  mes: number;
  resumo: string;
  documento_id: string | null;
  status: "rascunho" | "publicado";
  created_at: string;
  updated_at: string;
};
