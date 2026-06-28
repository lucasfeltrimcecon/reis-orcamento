import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Entrar · Controle Orçamentário Reis",
};

export default function LoginPage() {
  return (
    <main
      className="flex-1 grid place-items-center px-6 py-16"
      style={{
        background:
          "linear-gradient(135deg, var(--navy) 0%, var(--navy-2) 60%, #0a4f8f 100%)",
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white px-9 py-10 shadow-2xl">
        <div className="mb-5 grid h-13 w-13 place-items-center rounded-2xl bg-[var(--navy)] text-2xl font-extrabold text-white">
          R
        </div>

        <h1 className="text-xl font-extrabold tracking-tight text-[var(--navy)]">
          Controle Orçamentário
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Reis Aceleradora de Negócios
        </p>

        <div className="mt-7">
          <LoginForm />
        </div>

        <p className="mt-5 text-center text-xs font-semibold text-[var(--muted)]">
          Esqueci minha senha
        </p>
      </div>
    </main>
  );
}
