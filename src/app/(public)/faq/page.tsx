import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { ShieldCheck, HelpCircle, Heart, Building2, Lock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FAQAccordion, FAQItem } from "@/components/public/FAQAccordion";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | ORBINOVA Healthcare Intelligence",
  description:
    "Find answers to common questions about ORBINOVA, our donor coordination platform, AI-assisted imaging tools, and healthcare privacy standards.",
};

const GENERAL_FAQS: FAQItem[] = [
  {
    id: "gen-1",
    question: "What is ORBINOVA?",
    answer:
      "ORBINOVA is an Integrated Healthcare Intelligence Platform connecting healthcare institutions, medical professionals, blood donation networks, and intelligent diagnostic technologies. It encompasses two primary solutions: ORBINOVA Donor (donor coordination and blood matching) and ORBINOVA Imaging (AI-assisted medical image analysis).",
  },
  {
    id: "gen-2",
    question: "Is ORBINOVA a healthcare provider or diagnostic authority?",
    answer:
      "No. ORBINOVA provides clinical decision support and logistical coordination technologies. We do not independently diagnose patients or provide standalone medical treatments. All medical screenings, diagnostic conclusions, and treatment choices remain under the direction of qualified medical professionals.",
  },
  {
    id: "gen-3",
    question: "How are the modules accessed?",
    answer:
      "ORBINOVA Donor and ORBINOVA Imaging are independently deployed web applications. Authorized institutional staff and eligible users access them through verified external portals connected from this main website.",
  },
];

const DONOR_FAQS: FAQItem[] = [
  {
    id: "don-1",
    question: "Who can become a voluntary blood donor?",
    answer:
      "Generally, healthy individuals aged between 18 and 65 years, weighing at least 50 kg, and free from acute infections or blood-borne conditions can register. Final eligibility is always evaluated by clinical staff at the donation site prior to each donation.",
  },
  {
    id: "don-2",
    question: "How does donor matching work?",
    answer:
      "When a hospital creates a blood request, our server-side engine hard-filters candidate donors for compatible ABO/Rh blood groups, active eligibility, and 'Available' status. It then ranks candidates based on proximity to the facility and clinical urgency, notifying top-ranked candidates in balanced batches.",
  },
  {
    id: "don-3",
    question: "Can I control my availability?",
    answer:
      "Yes. You can switch your availability status between 'Available', 'Busy', and 'Temporarily Unavailable' directly from your donor dashboard at any time. When unavailable, you will not receive donation requests.",
  },
  {
    id: "don-4",
    question: "How do donors receive requests, and can I decline?",
    answer:
      "Eligible donors receive in-app notifications detailing the requesting facility, blood group, required urgency, and deadline. You can freely accept or decline. Declining carries no penalty and allows the system to immediately notify the next eligible donor.",
  },
  {
    id: "don-5",
    question: "What happens after I accept a request?",
    answer:
      "When you accept, the hospital is notified of your response. You proceed to the facility during the agreed window where staff will perform standard clinical screening before blood collection. Once collected, the hospital records your donation, and your donor profile is credited with a verified donation record.",
  },
  {
    id: "don-6",
    question: "Does SmartDonor determine whether I am medically eligible to donate?",
    answer:
      "No. SmartDonor tracks basic self-reported criteria and standard 90-day recovery intervals between donations. Definitive medical eligibility, hemoglobin testing, and pre-donation vitals are determined solely by medical personnel at the donation facility.",
  },
  {
    id: "don-7",
    question: "How do I deactivate my account?",
    answer:
      "You can deactivate your donor account at any time from your Profile & Account Settings. Deactivating your account immediately stops all matching notifications and archives your profile.",
  },
];

const HOSPITAL_FAQS: FAQItem[] = [
  {
    id: "hosp-1",
    question: "How do hospitals and blood banks use SmartDonor?",
    answer:
      "Verified organizations use the Organization Portal to submit emergency and routine blood requests, trigger 4-factor donor matching, monitor real-time donor responses, track blood stock inventory, and record completed donations.",
  },
  {
    id: "hosp-2",
    question: "Can hospitals see private donor information?",
    answer:
      "No. Hospitals cannot search a public donor directory or access private contact coordinates. Hospital staff only receive contact access for a specific donor after that donor has voluntarily accepted their blood request.",
  },
  {
    id: "hosp-3",
    question: "How are healthcare facilities verified on SmartDonor?",
    answer:
      "Every hospital and blood bank registration undergoes administrative verification to confirm their clinical registration before active portal privileges are granted.",
  },
];

const PRIVACY_FAQS: FAQItem[] = [
  {
    id: "priv-1",
    question: "Is my personal information publicly searchable?",
    answer:
      "No. SmartDonor does not maintain any public directory of donors. Your name, email, telephone number, exact address, and blood group are never visible to unauthenticated users, web crawlers, or search engines.",
  },
  {
    id: "priv-2",
    question: "How is data protected on the platform?",
    answer:
      "All data is encrypted in transit and protected at rest via Supabase PostgreSQL Row Level Security (RLS) policies. Role-based authorization ensures each user and organization accesses strictly their own authorized records.",
  },
];

export default function FAQPage() {
  return (
    <div className="space-y-12 sm:space-y-24 py-8 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-inter">
      {/* 1. Top Header */}
      <section className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto" data-aos="fade-up">
        <Badge variant="primary" size="sm">
          Support & Knowledge Base
        </Badge>
        <h1 className="font-poppins text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Everything you need to know about SmartDonor, voluntary blood donation, healthcare matching, and our privacy standards.
        </p>
      </section>

      {/* 2. General FAQs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <HelpCircle className="w-5 h-5 text-primary-600" />
          <h2 className="font-poppins font-bold text-xl text-slate-900">
            General Platform Questions
          </h2>
        </div>
        <FAQAccordion items={GENERAL_FAQS} defaultOpenId="gen-1" />
      </section>

      {/* 3. Donor FAQs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Heart className="w-5 h-5 fill-blood-600 text-blood-600" />
          <h2 className="font-poppins font-bold text-xl text-slate-900">
            For Voluntary Blood Donors
          </h2>
        </div>
        <FAQAccordion items={DONOR_FAQS} />
      </section>

      {/* 4. Hospital FAQs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Building2 className="w-5 h-5 text-primary-600" />
          <h2 className="font-poppins font-bold text-xl text-slate-900">
            For Hospitals & Blood Banks
          </h2>
        </div>
        <FAQAccordion items={HOSPITAL_FAQS} />
      </section>

      {/* 5. Privacy & Security FAQs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Lock className="w-5 h-5 text-emerald-600" />
          <h2 className="font-poppins font-bold text-xl text-slate-900">
            Privacy, Security & Data Protection
          </h2>
        </div>
        <FAQAccordion items={PRIVACY_FAQS} />
      </section>

      {/* 6. Contact Banner */}
      <section className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-4 shadow-xs">
        <h3 className="font-poppins font-bold text-lg text-slate-900">
          Have a question not listed here?
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Our technical and support team is ready to assist healthcare providers and voluntary donors across Nigeria.
        </p>
        <div>
          <Link href="/contact">
            <Button variant="primary" size="md" className="font-semibold">
              Contact Support
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
