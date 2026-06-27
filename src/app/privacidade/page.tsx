import Link from "next/link";

export const metadata = { title: "Política de Privacidade — LOKAT OS" };

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="text-xs text-indigo-600 hover:underline">← Voltar</Link>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-8 text-xs text-amber-700">
          <strong>Versão preliminar (v1.0)</strong> — Este documento está em revisão jurídica. Versão final disponível em breve.
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2">Política de Privacidade</h1>
        <p className="text-xs text-gray-400 mb-8">LOKAT OS · Versão 1.0 · Vigência a partir de 2026</p>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-gray-900 mb-2">1. Dados que coletamos</h2>
            <p>Coletamos apenas os dados necessários para operar a plataforma: nome, e-mail, dados da empresa, informações de onboarding e logs de uso da plataforma.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">2. Como usamos seus dados</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Autenticação e segurança da conta</li>
              <li>Personalização da experiência na plataforma</li>
              <li>Comunicações sobre a conta e o serviço</li>
              <li>Melhoria contínua da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">3. Compartilhamento</h2>
            <p>Não vendemos seus dados. Compartilhamos apenas com parceiros técnicos necessários para operar o serviço (como Supabase para banco de dados) e apenas o necessário para essa operação.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">4. Cookies e rastreamento</h2>
            <p>Usamos cookies de sessão para autenticação. Não usamos cookies de rastreamento de terceiros para publicidade.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">5. Seus direitos (LGPD)</h2>
            <p>Você tem direito a: acesso, correção, exclusão e portabilidade dos seus dados. Para exercer qualquer direito, contate-nos.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">6. Retenção</h2>
            <p>Mantemos seus dados enquanto a conta estiver ativa. Após exclusão, dados são removidos em até 90 dias, exceto quando obrigação legal exigir retenção.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">7. Segurança</h2>
            <p>Utilizamos criptografia em trânsito (HTTPS) e autenticação segura via Supabase Auth. Senhas nunca são armazenadas em texto puro.</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">8. Contato</h2>
            <p>DPO / Responsável: <a href="mailto:privacidade@lokat.app" className="text-indigo-600 hover:underline">privacidade@lokat.app</a></p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <Link href="/termos" className="text-xs text-indigo-600 hover:underline">
            ← Ver Termos de Uso
          </Link>
        </div>
      </div>
    </div>
  );
}
