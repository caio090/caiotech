/**
 * XLSX import/export is documented as blocked for this sprint, not silently
 * skipped.
 *
 * The only actively-published npm package for reading/writing the XLSX
 * binary format is `xlsx` (SheetJS community build). As of this sprint it
 * carries two unpatched high-severity advisories with no fix available on
 * the npm registry:
 *   - Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
 *   - ReDoS (GHSA-5pgg-2g8v-p4x9)
 * SheetJS's own patched builds (0.20.2+) are distributed only via their own
 * CDN, not npm — installing from a non-registry source changes the
 * project's supply-chain trust model and wasn't authorized for this sprint.
 *
 * Given this feature parses user-uploaded, untrusted files, shipping a
 * known-vulnerable parser was judged unsafe. CSV and JSON — both plain text,
 * hand-rollable without a binary-format library — are fully functional
 * instead (see ./csv.ts and this module's JSON path in importer.ts).
 */
export const XLSX_BLOCKED_REASON =
  "Importação/exportação em XLSX está bloqueada nesta sprint: o único pacote XLSX publicado no npm (xlsx/SheetJS) tem duas vulnerabilidades de alta severidade sem correção disponível (Prototype Pollution e ReDoS), inseguras para processar arquivos enviados por usuários. Use CSV ou JSON.";
