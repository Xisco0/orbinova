"use server";

export interface ContactFormData {
  fullName: string;
  email: string;
  organization?: string;
  category: string;
  subject: string;
  message: string;
}

export interface ContactActionResult {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
}

export async function submitContactInquiryAction(
  data: ContactFormData
): Promise<ContactActionResult> {
  const errors: Record<string, string> = {};

  // Server-side validation
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.fullName = "Please enter your full name.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!data.category) {
    errors.category = "Please select an inquiry category.";
  }

  if (!data.subject || data.subject.trim().length < 4) {
    errors.subject = "Subject must be at least 4 characters long.";
  }

  if (!data.message || data.message.trim().length < 15) {
    errors.message = "Message must be at least 15 characters long.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Please correct the highlighted errors in the form.",
      errors,
    };
  }

  try {
    // In production, log or dispatch inquiry to support queue
    console.log("[Contact Action] Inquiry received:", {
      name: data.fullName.trim(),
      email: data.email.trim(),
      organization: data.organization?.trim() || "N/A",
      category: data.category,
      subject: data.subject.trim(),
      messageLength: data.message.trim().length,
      receivedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message:
        "Thank you for contacting SmartDonor. Your inquiry has been received, and our support team will respond to your email shortly.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: "An unexpected error occurred while sending your message. Please try again later.",
    };
  }
}
