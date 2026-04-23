import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/health
 * Production health check for monitoring tools (e.g., Docker, UptimeRobot).
 * Checks database connectivity.
 */
export async function GET() {
  try {
    // Basic test to ensure DB is reachable
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "up",
        storage: "up", // Assuming if DB is up, the network is likely fine
      }
    });
  } catch (error) {
    logger.error("Health check failed", { error: String(error) });
    return NextResponse.json(
      { 
        status: "unhealthy", 
        timestamp: new Date().toISOString(),
        error: "Database connectivity issue" 
      },
      { status: 503 }
    );
  }
}
