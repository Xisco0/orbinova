"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  defaultOpenId?: string;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  items,
  defaultOpenId,
}) => {
  const [openIds, setOpenIds] = useState<Set<string>>(
    new Set(defaultOpenId ? [defaultOpenId] : [items[0]?.id].filter(Boolean))
  );

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3 font-inter">
      {items.map((item) => {
        const isOpen = openIds.has(item.id);

        return (
          <div
            key={item.id}
            className={cn(
              "rounded-xl border transition-all duration-200 bg-white overflow-hidden",
              isOpen ? "border-primary-300 shadow-sm" : "border-slate-200 hover:border-slate-300"
            )}
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
              id={`faq-question-${item.id}`}
            >
              <span className="font-poppins font-semibold text-sm sm:text-base text-slate-900">
                {item.question}
              </span>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200",
                  isOpen ? "transform rotate-180 text-primary-600" : ""
                )}
                aria-hidden="true"
              />
            </button>

            {isOpen && (
              <div
                id={`faq-answer-${item.id}`}
                role="region"
                aria-labelledby={`faq-question-${item.id}`}
                className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in duration-150"
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
