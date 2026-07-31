(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bridges = require("../bridges.ts") as typeof import("../bridges");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const opportunity: import("../bridges").ProductCampaignOpportunity = {
  workspaceId: "workspace_demo",
  productId: "product_demo",
  productName: "Produto de exemplo",
  reason: "inventory_rotation",
  evidence: ["estoque parado há 60 dias"],
  margin: 0.35,
  stock: 120,
  salesVelocity: 2,
  confidence: "calculated",
  detectedAt: "2026-07-30T12:00:00Z",
  suggestedCampaignType: "promocao_relampago",
  missingData: [],
};

console.log("\n[test 32] ProductOpportunity");
{
  assert(opportunity.workspaceId === "workspace_demo" && opportunity.productId === "product_demo", "ProductCampaignOpportunity é construível com todos os campos do contrato");
  assert(opportunity.reason === "inventory_rotation", "reason usa um valor do union ProductOpportunityReason");
}

console.log("\n[test 33] CommercialCampaignBrief");
{
  const brief = bridges.buildCampaignBriefFromOpportunity(opportunity, "campaign_001");
  assert(brief.productId === opportunity.productId, "buildCampaignBriefFromOpportunity preserva o productId da oportunidade");
  assert(brief.source === "product_campaign_bridge", "brief gerado pela ponte é marcado com source=product_campaign_bridge");
  assert(brief.stockLimit === opportunity.stock, "stockLimit vem do estoque real da oportunidade, não inventado");
}

console.log("\n[test 34] Campaign ID preservado");
{
  const brief = bridges.buildCampaignBriefFromOpportunity(opportunity, "campaign_xyz");
  assert(brief.campaignId === "campaign_xyz", "campaignId passado explicitamente é preservado sem alteração");
  const guided = bridges.buildGuidedCreativeBrief(brief);
  assert(guided.campaignId === "campaign_xyz", "GuidedCreativeBrief preserva o mesmo campaignId ao longo da ponte Campanha -> REC OS");
  assert(guided.approvalRequired === true, "briefing guiado sempre exige aprovação (não pula etapa)");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
