"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "../Reveal";

const subjects = [
  "General Inquiry",
  "Technical Support",
  "Billing Question",
  "Partnership",
  "Other",
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(subjects[0]);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setName("");
    setEmail("");
    setSubject(subjects[0]);
    setMessage("");
  };

  const inputClass =
    "w-full rounded-xl border border-[#e5e7eb] bg-surface px-4 py-3 text-[16px] text-navy placeholder:text-muted-light outline-none transition-colors focus:border-brand";
  const labelClass =
    "block text-[14px] font-semibold uppercase tracking-[0.7px] text-navy";

  return (
    <section className="bg-[#f8f9fa]">
      <div className="mx-auto max-w-[1440px] px-6 py-20 sm:px-16">
        <Reveal y={40} className="mx-auto max-w-[560px]">
          <div className="rounded-3xl border border-border bg-white p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] sm:p-12">
            <div className="flex items-center gap-3">
              <Image src="/contact/send-icon.svg" alt="" width={24} height={24} />
              <h2 className="text-[22px] font-bold text-navy sm:text-[24px]">
                Send Us a Message
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className={labelClass} htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass} htmlFor="email">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@contractor.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass} htmlFor="subject">
                  Subject
                </label>
                <select
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputClass}
                >
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass} htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can our team assist your operations today?"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="mt-2 flex h-[60px] items-center justify-center rounded-xl bg-brand text-[18px] font-bold text-white shadow-[0_10px_15px_-3px_rgba(0,193,133,0.2),0_4px_6px_-4px_rgba(0,193,133,0.2)] transition-colors hover:bg-brand-dark"
              >
                Send Message
              </motion.button>

              <AnimatePresence>
                {submitted && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-center text-[14px] font-medium text-brand"
                  >
                    Thanks — we&apos;ll be in touch soon.
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
