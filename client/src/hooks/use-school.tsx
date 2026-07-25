import { useEffect, useState, useCallback } from "react";
import { db, type School } from "@/lib/db";

const SCHOOL_ID = 1;

export function useSchool() {
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const s = await db.schools.get(SCHOOL_ID);
    setSchool(s ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isConfigured = !!school?.configured;

  const saveSchool = async (data: Omit<School, "id" | "configured">) => {
    await db.schools.put({ ...data, id: SCHOOL_ID, configured: true });
    await refresh();
  };

  return { school, isConfigured, isLoading, saveSchool, refresh };
}