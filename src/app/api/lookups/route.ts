import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [cities, contracts, sectors, roles, taskTypes] = await Promise.all([
      prisma.city.findMany({
        include: { neighborhoods: true },
        orderBy: { name: "asc" },
      }),
      prisma.contract.findMany({ orderBy: { name: "asc" } }),
      prisma.sector.findMany({ orderBy: { name: "asc" } }),
      prisma.role.findMany({ orderBy: { name: "asc" } }),
      prisma.taskType.findMany({ orderBy: { name: "asc" } }),
    ]);

    console.log(
      `[API Lookups] Found ${contracts.length} contracts, ${cities.length} cities`,
    );

    const citiesNeighborhoods = cities.reduce(
      (acc, city) => {
        acc[city.name] = city.neighborhoods.map((n) => n.name).sort();
        return acc;
      },
      {} as Record<string, string[]>,
    );

    // New nested mapping: Contract -> City -> Neighborhood[]
    const contractCitiesNeighborhoods: Record<string, Record<string, string[]>> = {};
    contracts.forEach(c => {
      contractCitiesNeighborhoods[c.name] = {};
    });

    cities.forEach(city => {
      const mappedContractsForCity = new Set<number>();
      city.neighborhoods.forEach(n => {
        if (n.contract_id) mappedContractsForCity.add(n.contract_id);
      });

      contracts.forEach(contract => {
        // A city is in a contract if it has at least one mapped neighborhood to it,
        // or if it has NO mapped neighborhoods at all (global city).
        const isCityInContract = mappedContractsForCity.size === 0 || mappedContractsForCity.has(contract.id);
        
        if (isCityInContract) {
          contractCitiesNeighborhoods[contract.name][city.name] = [];
          city.neighborhoods.forEach(n => {
            if (n.contract_id === contract.id || n.contract_id === null) {
              contractCitiesNeighborhoods[contract.name][city.name].push(n.name);
            }
          });
          contractCitiesNeighborhoods[contract.name][city.name].sort();
        }
      });
    });

    const response = NextResponse.json({
      contracts: contracts.map((c) => c.name),
      cities_neighborhoods: citiesNeighborhoods,
      contract_cities_neighborhoods: contractCitiesNeighborhoods,
      sectors: sectors,
      roles: roles,
      task_types: taskTypes,
    });
    response.headers.set("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return response;
  } catch (error) {
    console.error("Error fetching lookups:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch lookups",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
