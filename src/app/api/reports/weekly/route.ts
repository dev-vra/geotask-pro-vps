/**
 * Rota legacy mantida para compatibilidade.
 * O novo endpoint completo é POST /api/ai/analyze
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      message:
        "Esta rota foi substituída. Use POST /api/ai/analyze com o body { analyses, customMessage, periodDays }.",
      newEndpoint: "/api/ai/analyze",
    },
    { status: 301 },
  );
}
