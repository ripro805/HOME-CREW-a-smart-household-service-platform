import { useMemo, useState } from 'react';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import { useScrollReveal } from '../hooks/useScrollReveal';

const initialForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  message: '',
};

const contactCards = [
  {
    title: 'Call Now!',
    text: '+880 1700-000000',
    href: 'tel:+8801700000000',
    icon: PhoneIcon,
  },
  {
    title: 'E-mail Us!',
    text: 'support@homecrew.com',
    href: 'mailto:support@homecrew.com',
    icon: EnvelopeIcon,
  },
  {
    title: 'Our Location!',
    text: 'House 45, Service Avenue, Dhaka',
    href: 'https://maps.google.com/?q=Dhaka',
    icon: MapPinIcon,
  },
];

const Contact = () => {
  const sectionRef = useScrollReveal();
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const serviceTopic = useMemo(() => {
    const message = formData.message.toLowerCase();
    if (message.includes('clean')) return 'cleaning';
    if (message.includes('repair') || message.includes('fix')) return 'repair';
    if (message.includes('plumbing')) return 'plumbing';
    if (message.includes('electric')) return 'electrical support';
    return 'household service';
  }, [formData.message]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setSubmitted(false);
    setServerError('');
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) nextErrors.lastName = 'Last name is required.';

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!phoneDigits) {
      nextErrors.phone = 'Phone number is required.';
    } else if (phoneDigits.length < 8) {
      nextErrors.phone = 'Enter a valid phone number.';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!formData.message.trim()) {
      nextErrors.message = 'Please write a short message.';
    } else if (formData.message.trim().length < 12) {
      nextErrors.message = 'Message should be at least 12 characters.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitted(false);
      return;
    }

    try {
      setSubmitting(true);
      setServerError('');
      await api.post('/contact/', {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
      });
      setSubmitted(true);
      setFormData(initialForm);
    } catch (error) {
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Sorry, your message could not be sent right now. Please try again.';
      setSubmitted(false);
      setServerError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName = (name) =>
    `input-fancy w-full rounded-[1.4rem] border bg-white px-6 py-5 text-base text-slate-800 placeholder:text-slate-400 ${
      errors[name] ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200'
    }`;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 md:px-8 md:py-14">
      <section ref={sectionRef} className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_35px_90px_-55px_rgba(15,23,42,0.45)]">
        <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
          <div className="reveal-left relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 px-8 py-10 text-white md:px-12 md:py-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.35),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.26),_transparent_30%)]" />
            <div className="relative z-10">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-teal-100">
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  Contact Us
                </span>
                <h1 className="mt-6 text-4xl font-black leading-tight md:text-5xl">
                  Let&apos;s plan the right help for your home.
                </h1>
                <p className="mt-5 text-base leading-8 text-slate-200">
                  Tell us what kind of household support you need and the HomeCrew team will guide you toward the right service, timing, and next steps.
                </p>
              </div>

              <div className="mt-8 grid gap-5">
                {contactCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <a
                      key={card.title}
                      href={card.href}
                      target={card.href.startsWith('https://') ? '_blank' : undefined}
                      rel={card.href.startsWith('https://') ? 'noreferrer' : undefined}
                      className={`reveal flex items-start gap-4 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-white no-underline backdrop-blur-sm delay-${index + 1}`}
                    >
                      <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-100">
                        <Icon className="h-7 w-7" />
                      </span>
                      <span>
                        <span className="block text-2xl font-black">{card.title}</span>
                        <span className="mt-1 block text-base leading-7 text-slate-200">{card.text}</span>
                      </span>
                    </a>
                  );
                })}
              </div>

              <div className="reveal mt-8 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-6 w-6 text-teal-100" />
                  <p className="text-lg font-bold">Support Hours</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Saturday to Thursday, 9:00 AM to 9:00 PM
                  <br />
                  Emergency request coordination available for urgent home issues.
                </p>
              </div>
            </div>
          </div>

          <div className="reveal-right bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-8 py-10 md:px-12 md:py-14">
            <div className="max-w-3xl">
              <span className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-600">Get in touch</span>
              <h2 className="mt-3 text-4xl font-black leading-tight text-slate-900 md:text-6xl">
                Start your next household service request today
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Share a few details and we&apos;ll help you with {serviceTopic}, scheduling questions, or choosing the best HomeCrew service for your space.
              </p>

              <form onSubmit={handleSubmit} className="mt-10">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="reveal">
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First Name"
                      className={inputClassName('firstName')}
                    />
                    {errors.firstName && <p className="mt-2 text-sm text-red-500">{errors.firstName}</p>}
                  </div>

                  <div className="reveal delay-1">
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last Name"
                      className={inputClassName('lastName')}
                    />
                    {errors.lastName && <p className="mt-2 text-sm text-red-500">{errors.lastName}</p>}
                  </div>

                  <div className="reveal delay-2">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Mobile Number"
                      className={inputClassName('phone')}
                    />
                    {errors.phone && <p className="mt-2 text-sm text-red-500">{errors.phone}</p>}
                  </div>

                  <div className="reveal delay-3">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="E-mail Address"
                      className={inputClassName('email')}
                    />
                    {errors.email && <p className="mt-2 text-sm text-red-500">{errors.email}</p>}
                  </div>
                </div>

                <div className="reveal delay-4 mt-5">
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows="7"
                    placeholder="Write your message here..."
                    className={`${inputClassName('message')} resize-none`}
                  />
                  {errors.message && <p className="mt-2 text-sm text-red-500">{errors.message}</p>}
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button type="submit" disabled={submitting} className="btn btn-primary btn-xl">
                    {submitting ? 'Sending...' : 'Send A Message'}
                  </button>
                  {submitted && (
                    <p className="rounded-full bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">
                      Thanks! Your message has been sent to the admin inbox.
                    </p>
                  )}
                  {serverError && (
                    <p className="rounded-full bg-red-50 px-5 py-3 text-sm font-semibold text-red-600">
                      {serverError}
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
