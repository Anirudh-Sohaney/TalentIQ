"use server";

import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCheckinTime } from "@/lib/checkinTime";

export async function submitCheckinServer(data: {
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  major: string;
}, formData: FormData) {
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const email = data.email.trim();
  const university = data.university.trim();
  const major = data.major.trim();

  if (!firstName || !lastName || !email || !university || !major) {
    return { success: false, error: "Please complete all required fields." };
  }

  if (firstName.length > 100 || lastName.length > 100 || email.length > 255 || university.length > 200 || major.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please check the information you entered." };
  }

  const checkinTime = getCheckinTime();
  const { error: schemaError } = await supabaseAdmin
    .from("responses")
    .select("university,major,checkin_time")
    .limit(0);

  if (schemaError) {
    if (["PGRST204", "42703"].includes(schemaError.code) || /university|major|checkin_time/i.test(schemaError.message)) {
      return { success: false, error: "Check-in is temporarily unavailable: required responses columns have not been added to Supabase yet." };
    }
    return { success: false, error: "Could not check the response table. Please try again." };
  }

  const resume = formData.get("resume");

  if (!(resume instanceof File) || resume.size === 0) {
    return { success: false, error: "Please select a resume to upload." };
  }

  if (resume.size > 8 * 1024 * 1024) {
    return { success: false, error: "Resume must be 8 MB or smaller." };
  }

  const extension = resume.name.split(".").pop()?.toLowerCase();
  const contentType = extension === "pdf"
    ? "application/pdf"
    : extension === "docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : null;

  if (!contentType || (resume.type && resume.type !== contentType)) {
    return { success: false, error: "Resume must be a PDF or DOCX file." };
  }

  const signature = new Uint8Array(await resume.slice(0, 4).arrayBuffer());
  const isPdf = extension === "pdf" && signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46;
  const isDocx = extension === "docx" && signature[0] === 0x50 && signature[1] === 0x4b;

  if (!isPdf && !isDocx) {
    return { success: false, error: "The selected resume does not match its file type." };
  }

  const responseId = randomUUID();
  const resumePath = `${responseId}/resume.${extension}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("resumes")
    .upload(resumePath, Buffer.from(await resume.arrayBuffer()), {
      contentType,
      metadata: {
        university,
        major,
        initials: `${firstName[0]}${lastName[0]}`.toUpperCase(),
        checkin_time: checkinTime.central,
        checkin_time_utc: checkinTime.utc,
      },
      upsert: false,
    });

  if (uploadError) {
    console.error("Resume upload failed:", uploadError);
    return { success: false, error: "Resume upload failed. Please try again." };
  }

  const response = {
    id: responseId,
    first_name: firstName,
    last_name: lastName,
    email,
    checkin_time: checkinTime.utc,
    resume_url: supabaseAdmin.storage.from("resumes").getPublicUrl(resumePath).data.publicUrl,
  };

  const { error: insertError } = await supabaseAdmin
    .from("responses")
    .insert({ ...response, university, major });

  if (insertError) {
    await supabaseAdmin.storage.from("resumes").remove([resumePath]);
    if (["PGRST204", "42703"].includes(insertError.code) && /university|major|checkin_time/i.test(insertError.message)) {
      return { success: false, error: "Required columns are missing from Supabase responses. Apply the database migrations before checking in." };
    }
    return { success: false, error: insertError.message };
  }

  return { success: true };
}
