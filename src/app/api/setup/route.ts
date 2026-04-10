import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message:
      "Setup is now managed by Prisma Migrations. Run 'npx prisma migrate dev' to setup the database.",
  });
}
