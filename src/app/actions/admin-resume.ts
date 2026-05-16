"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  about: z.string().max(5000).optional().or(z.literal("")),
  jobLove: z.string().max(5000).optional().or(z.literal("")),
  hobbies: z.string().max(5000).optional().or(z.literal("")),
});

export async function updateResume(input: unknown) {
  const session = await auth();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    const data = schema.parse(input);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        about: data.about?.trim() || null,
        jobLove: data.jobLove?.trim() || null,
        hobbies: data.hobbies?.trim() || null,
      },
    });
    revalidatePath("/admin/profile");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
