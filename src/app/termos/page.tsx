import Link from "next/link";

export const metadata = { title: "Termos de Uso — LOKAT OS" };

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="text-xs text-indigo-600 hover:underline">← Voltar</Link>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-8 text-xs text-amber-700">
          <strong>Versão preliminar (v1.0)</strong> — Este documento está em revisão jurídica. Versão final disponível em breve.
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2">Termos de Uso</h1>
        <p className="text-xs text-gray-400 mb-8">LOKAT OS · Versão 1.0 · Vigência a partir de 2026</p>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-gray-900 mb-2">1. Aceitação</h2>
            <p>Ao criar uma conta ou usar o LOKAT OS, você concorda com estes Termos de Uso. Se não concordar, não use a plataforma.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">2. Sobre a plataforma</h2>
            <p>O LOKAT OS é um sistema operacional de marketing digital que oferece ferramentas de gestão de conteúdo, relatórios, aprovações, diagnóstico e relacionamento com clientes. A plataforma é operada pela Lokat.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">3. Conta e responsabilidade</h2>
            <p>Você é responsável pela segurança da sua conta e por todas as ações realizadas sob suas credenciais. Não compartilhe sua senha. Informe imediatamente qualquer uso não autorizado.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">4. Dados dos clientes</h2>
            <p>Ao cadastrar dados de terceiros (clientes finais, empresas), você declara ter autorização para isso. A Lokat não se responsabiliza pelo uso indevido de dados inseridos pelos usuários.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">5. Propriedade intelectual</h2>
            <p>Conteúdos criados dentro da plataforma pertencem ao usuário ou cliente que os criou. A Lokat retém os direitos sobre o software, interface e marca LOKAT OS.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">6. Planos e pagamentos</h2>
            <p>Os planos pagos serão descritos na página de planos. O não pagamento pode resultar em suspensão da conta. Cancelamentos podem ser feitos a qualquer momento.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">7. Alterações</h2>
            <p>Estes termos podem ser atualizados. Notificaremos usuários sobre mudanças relevantes. O uso continuado após notificação implica aceite.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">8. Contato</h2>
            <p>Dúvidas: <a href="mailto:contato@lokat.app" className="text-indigo-600 hover:underline">contato@lokat.app</a></p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <Link href="/privacidade" className="text-xs text-indigo-600 hover:underline">
            Ver Política de Privacidade →
          </Link>
        </div>
      </div>
    </div>
  );
}
