import type { Record, Rally } from "@/entities/record";

export const createRally = async (
  params: { recordId: string; setIndex: number; rallyIndex: number },
  recording: Rally,
  record: Record
) => {
  const { recordId, setIndex, rallyIndex: rallyIndex } = params;
  try {
    const res = await fetch(
      `/api/records/${recordId}/sets/rallies?si=${setIndex}&ri=${rallyIndex}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recording),
      }
    );
    if (!res.ok) throw new Error("Network response was not ok");
    const rallies = await res.json();
    record.sets[setIndex].rallies = rallies;
    return record;
  } catch (error) {
    console.error("[CREAT Rally]", error);
  }
};
