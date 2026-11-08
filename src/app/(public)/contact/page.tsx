import React from "react";
import { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ContactForm } from "./ContactForm";
import { BRAND } from "@/constants/theme";

export const metadata: Metadata = {
  title: "Contact ORBINOVA | Healthcare Support & Institutional Inquiries",
  description:
    "Get in touch with the ORBINOVA team for institutional onboarding, technical assistance, or healthcare intelligence platform inquiries.",
};

export default function ContactPage() {
  return (
    <div className="space-y-10 sm:space-y-16 py-8 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-inter">
      {/* 1. Header Banner */}
      <section className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto" data-aos="fade-up">
        <Badge variant="primary" size="sm">
          Get in Touch
        </Badge>
        <h1 className="font-poppins text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Contact ORBINOVA Support
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Have questions regarding institutional verification, healthcare facility integration, or
          platform capabilities? Our team is available to assist your organization.
        </p>
      </section>

      {/* 2. Grid with Info Cards + Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Contact Channels */}
        <div className="lg:col-span-5 space-y-6" data-aos="fade-right">
          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-6">
            <h2 className="font-poppins font-bold text-lg text-slate-900 border-b border-slate-100 pb-3">
              Direct Channels
            </h2>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Email Inquiries</span>
                  <a href={`mailto:${BRAND.supportEmail}`} className="text-primary-600 hover:underline">
                    {BRAND.supportEmail}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Regional Reach</span>
                  <p className="text-slate-500">
                    Active across major healthcare clusters in Lagos, Abuja, Port Harcourt, Kano, and nationwide.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Support Coverage</span>
                  <p className="text-slate-500">
                    Monday to Friday, 8:00 AM – 6:00 PM (WAT). Urgent clinical triage monitors operate 24/7.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-200 font-poppins">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Medical Emergency Advice Notice</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              If a patient requires immediate blood transfusion in an active emergency, please proceed immediately to the nearest accredited hospital emergency department or registered blood transfusion facility.
            </p>
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-xs" data-aos="fade-left" data-aos-delay="150">
          <div className="mb-6">
            <h2 className="font-poppins font-bold text-xl text-slate-900">
              Send Us a Message
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill out the form below and we will respond to your email.
            </p>
          </div>

          <ContactForm />
        </div>
      </div>
    </div>
  );
}
