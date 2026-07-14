# Open Source License Matrix

**Data:** 2026-07-13

## Matriz de Licença

| Motor | Repo | Licença | Tipo | SaaS Comercial | Incorporar Código | Serviço Externo | Decisão |
|---|---|---|---|---|---|---|---|
| LidoJS | lidojs/canva-clone | NULL (sem licença) | N/A | ❌ Todos direitos reservados | ❌ Proibido | N/A | `architecture_reference` |
| CE.SDK | imgly/canva-clone-react-cesdk | Comercial (SDK) / AGPL (exemplo) | Proprietária | ✅ Com licença paga | ✅ Via SDK licenciado | N/A | `commercial_sdk_candidate` |
| Chatwoot | chatwoot/chatwoot | MIT (core) + Enterprise | Permissiva | ✅ Uso livre | ❌ Não necessário | ✅ Via API | `external_service` |
| Postiz | gitroomhq/postiz-app | AGPL-3.0 | Copyleft forte | ⚠️ Restrições de rede | ❌ Proibido | ✅ Via API/SDK | `external_service_candidate` |

---

## Notas de Compatibilidade

### LidoJS — `NULL`
- Sem arquivo LICENSE no repositório.
- GitHub API retorna `"license": null`.
- Por padrão legal, todos os direitos são reservados ao autor.
- **Consequência:** Não pode ser copiado, modificado ou distribuído sem permissão explícita do autor.
- **Ação necessária:** Contatar mantenedor para negociar licença de uso comercial.

### CE.SDK — Comercial
- O SDK `@cesdk/cesdk-js` é produto comercial da img.ly.
- O repositório de exemplo usa AGPL-3.0, mas isso não licencia o SDK.
- Planos: Free (marca d'água), Trial, Paid (produção).
- **Ação necessária:** Contrato comercial com img.ly antes de uso em produção.

### Chatwoot — MIT
- MIT é a licença mais permissiva para uso comercial.
- Features Enterprise (SSO avançado, whitelist, etc.) requerem plano Enterprise.
- O core é open source e pode ser auto-hospedado gratuitamente.
- **Conclusão:** Compatível com LOKAT OS como serviço externo.

### Postiz — AGPL-3.0
- AGPL requer que modificações sejam publicadas se o software for usado via rede.
- **Regra de ouro:** Não incorporar código Postiz no LOKAT OS.
- Usar apenas via API REST + SDK `@postiz/node`.
- O LOKAT OS permanece proprietário pois não inclui código Postiz.
- **Conclusão:** Compatível como serviço externo, desde que o código não seja incorporado.

---

## Checklist de Validação

Antes de ativar qualquer motor:

- [ ] LidoJS: Contato com autor + acordo por escrito
- [ ] CE.SDK: Contrato com img.ly + chave de licença
- [ ] Chatwoot: VPS provisionada + instância configurada + API key gerada
- [ ] Postiz: VPS provisionada + instância configurada + API key gerada

---

## V1
- Nenhum desses motores é necessário para o V1 atual.

## V2
- EditorOS (CE.SDK ou outro aprovado): fase pós-licença.
- CRM Inbox (Chatwoot): fase pós-infraestrutura.
- Social Scheduler (Postiz): fase pós-infraestrutura.
