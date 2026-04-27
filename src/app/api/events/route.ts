import { NextRequest, NextResponse } from "next/server";
import { requireAuth, type AuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

const clients = new Set<ReadableStreamDefaultController>();
const userConnections = new Map<number, number>();

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const userId = (authResult as AuthUser).id;
    const currentConns = userConnections.get(userId) || 0;

    if (currentConns >= 2) {
      return NextResponse.json(
        { error: "Limite de conexões simultâneas atingido" },
        { status: 429 }
      );
    }

    userConnections.set(userId, currentConns + 1);

    const stream = new ReadableStream({
      start(controller) {
        clients.add(controller);
        
        // Send initial keep-alive
        controller.enqueue(new TextEncoder().encode("retry: 10000\n\n"));
        
        // Heartbeat every 15s
        const interval = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
          } catch (e) {
            clearInterval(interval);
            clients.delete(controller);
            const c = userConnections.get(userId) || 1;
            userConnections.set(userId, Math.max(0, c - 1));
          }
        }, 15000);

        req.signal.addEventListener("abort", () => {
          clearInterval(interval);
          clients.delete(controller);
          const c = userConnections.get(userId) || 1;
          userConnections.set(userId, Math.max(0, c - 1));
        });
      },
      cancel() {
        // Stream canceled
        const c = userConnections.get(userId) || 1;
        userConnections.set(userId, Math.max(0, c - 1));
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering for SSE
      },
    });
  } catch (error) {
    logger.error("Erro no stream de eventos", { error: String(error) });
    return NextResponse.json({ error: "Erro no stream" }, { status: 500 });
  }
}

// Internal helper to broadcast to all connected clients
export function broadcast(type: string, data: any = {}) {
  const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);
  
  clients.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (e) {
      clients.delete(controller);
    }
  });
}
