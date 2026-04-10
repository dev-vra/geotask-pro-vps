import { NextRequest, NextResponse } from "next/server";

const clients = new Set<ReadableStreamDefaultController>();

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      
      // Send initial keep-alive
      controller.enqueue(new TextEncoder().encode("retry: 10000\n\n"));
      
      // Heartbeat every 15s to keep connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch (e) {
          clearInterval(interval);
          clients.delete(controller);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clients.delete(controller);
      });
    },
    cancel() {
      // Stream canceled by consumer
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
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
