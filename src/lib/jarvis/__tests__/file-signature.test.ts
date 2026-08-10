/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/jarvis/__tests__/file-signature.test.ts
 * Sprint MVP Dogfood Security + Voice Closure V0.1 (P1 #2, Fase 27-28/33-36)
 * — assinatura (magic bytes) real, nunca metadata declarada pelo cliente.
 */
import {
  isValidPdfSignature, isValidPngSignature, isValidJpegSignature, isDecodableAsBoundedText,
  isValidWebmSignature, isValidOggSignature, isValidWavSignature, isValidMp3Signature, isValidMp4Signature,
  checkAudioSignature, tryGetWavDurationSeconds,
} from "../file-signature";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — invalid PDF signature is rejected");
{
  const fakePdf = Buffer.from("this is not a pdf at all, just text pretending to be one");
  assert(isValidPdfSignature(fakePdf) === false, "texto arbitrário não passa como PDF");
  const realPdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from([1, 2, 3])]);
  assert(isValidPdfSignature(realPdf) === true, "cabeçalho %PDF- real é aceito");
}

console.log("[test] 2 — invalid image signature is rejected (PNG e JPEG)");
{
  const fakePng = Buffer.from("GIF89a-this-is-actually-a-gif-not-a-png");
  assert(isValidPngSignature(fakePng) === false, "GIF disfarçado de PNG é rejeitado");
  const realPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0]);
  assert(isValidPngSignature(realPng) === true, "assinatura PNG real é aceita");

  const fakeJpeg = Buffer.from("not a jpeg");
  assert(isValidJpegSignature(fakeJpeg) === false, "texto arbitrário não passa como JPEG");
  const realJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  assert(isValidJpegSignature(realJpeg) === true, "assinatura JPEG real (FF D8 FF) é aceita");
}

console.log("[test] 3 — CSV/TXT: texto real decodificável é aceito, binário disfarçado é rejeitado");
{
  const realCsv = Buffer.from("nome,valor\nProduto A,100\nProduto B,200\n", "utf8");
  assert(isDecodableAsBoundedText(realCsv, 20_000) === true, "CSV real com texto legível é aceito");

  const binaryDisguisedAsCsv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x0e, 0x0f, 0x10, 0x11, 0x00, 0x01, 0x02, 0x03]);
  assert(isDecodableAsBoundedText(binaryDisguisedAsCsv, 20_000) === false, "binário arbitrário (alta proporção de bytes de controle) é rejeitado mesmo com extensão .csv");

  const empty = Buffer.alloc(0);
  assert(isDecodableAsBoundedText(empty, 20_000) === false, "buffer vazio é rejeitado");
}

console.log("[test] 4 — unsupported MIME: nenhum checador de assinatura existe -> retorna null (nunca finge validar)");
{
  const buffer = Buffer.from("qualquer coisa");
  assert(checkAudioSignature(buffer, "video/mp4") === null, "video/mp4 não é um tipo de áudio suportado -- não tem checador, retorna null explicitamente");
}

console.log("[test] 5 — valid supported audio payloads accept (WebM/OGG/WAV/MP3/MP4 reais)");
{
  const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0]);
  assert(isValidWebmSignature(webm) === true, "cabeçalho EBML real (WebM) é aceito");
  assert(checkAudioSignature(webm, "audio/webm") === true, "checkAudioSignature confirma WebM real");

  const ogg = Buffer.concat([Buffer.from("OggS"), Buffer.from([0, 0, 0])]);
  assert(isValidOggSignature(ogg) === true, "cabeçalho OggS real é aceito");

  const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WAVE")]);
  assert(isValidWavSignature(wav) === true, "cabeçalho RIFF/WAVE real é aceito");

  const mp3IdTag = Buffer.concat([Buffer.from("ID3"), Buffer.from([3, 0, 0, 0])]);
  assert(isValidMp3Signature(mp3IdTag) === true, "tag ID3 real é aceita como MP3");
  const mp3FrameSync = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
  assert(isValidMp3Signature(mp3FrameSync) === true, "frame sync real (FF Ex/Fx) é aceito como MP3");

  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftyp"), Buffer.from("isom")]);
  assert(isValidMp4Signature(mp4) === true, "box ftyp real (offset 4) é aceito como MP4");
}

console.log("[test] 6 — invalid signature for declared type is rejected (payload não bate com o mime declarado)");
{
  const actuallyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(checkAudioSignature(actuallyPng, "audio/webm") === false, "bytes de um PNG real, mas declarado como audio/webm -- assinatura não bate, rejeitado");
}

console.log("[test] 7 — WAV duration: derivável com segurança a partir do próprio header (único formato aceito onde isso é possível sem parser pesado)");
{
  // Header RIFF/WAVE mínimo: byteRate no offset 28, dataSize no offset 40.
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.write("WAVE", 8, "ascii");
  header.writeUInt32LE(44100 * 2, 28); // byteRate: 44100 Hz * 2 bytes/amostra (mono 16-bit)
  header.writeUInt32LE(44100 * 2 * 10, 40); // dataSize equivalente a 10 segundos
  const duration = tryGetWavDurationSeconds(header);
  assert(duration !== null, "duração é derivável para WAV real");
  assert(Math.abs((duration ?? 0) - 10) < 0.01, "duração calculada bate com o header (10s)");
}

console.log("[test] 8 — WAV duration: não finge derivar de um payload que não é WAV");
{
  const notWav = Buffer.from("this is not a wav file at all");
  assert(tryGetWavDurationSeconds(notWav) === null, "payload não-WAV retorna null -- nunca inventa duração");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
