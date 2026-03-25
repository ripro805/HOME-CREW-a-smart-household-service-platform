import { Link } from 'react-router-dom';
import {
  BoltIcon,
  CheckBadgeIcon,
  ClockIcon,
  HomeModernIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useScrollReveal } from '../hooks/useScrollReveal';

const values = [
  {
    title: 'Trusted Professionals',
    text: 'Every booking is matched with vetted home service experts who value punctuality, respect, and consistent quality.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Fast Response',
    text: 'From urgent repairs to scheduled deep cleaning, we keep response times short so your home stays on track.',
    icon: ClockIcon,
  },
  {
    title: 'Simple Booking',
    text: 'Clear pricing, quick service discovery, and smooth order tracking help families book with confidence.',
    icon: BoltIcon,
  },
];

const highlights = [
  {
    title: 'Home Cleaning',
    text: 'Routine, deep, and move-in cleaning packages tailored for busy households.',
    icon: SparklesIcon,
  },
  {
    title: 'Repair & Maintenance',
    text: 'Electric, plumbing, AC, and appliance fixes handled by skilled technicians.',
    icon: WrenchScrewdriverIcon,
  },
  {
    title: 'Family-Focused Support',
    text: 'Helpful coordination for apartments, family homes, and residential communities.',
    icon: HomeModernIcon,
  },
  {
    title: 'Care You Can Count On',
    text: 'Reliable service windows, transparent updates, and post-service peace of mind.',
    icon: CheckBadgeIcon,
  },
];

const stats = [
  { value: '10k+', label: 'service bookings supported' },
  { value: '98%', label: 'customers reporting satisfaction' },
  { value: '24/7', label: 'booking access from any device' },
];

const About = () => {
  const heroRef = useScrollReveal();
  const valuesRef = useScrollReveal();
  const storyRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.24),_transparent_34%),linear-gradient(135deg,#f8fafc_0%,#ecfeff_48%,#ffffff_100%)] px-6 py-16 md:px-10 md:py-24">
        <div className="bg-orb-1 -top-16 -left-16 h-72 w-72 bg-teal-300 opacity-20" />
        <div className="bg-orb-2 -bottom-20 right-0 h-80 w-80 bg-cyan-200 opacity-30" />

        <div ref={heroRef} className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="reveal-left">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-100 px-4 py-2 text-sm font-semibold text-teal-700">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
              About Us
            </span>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-900 md:text-6xl">
              Discover the care, speed, and trust behind every HomeCrew visit
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              HomeCrew was built for modern households that need dependable cleaning, repair, and maintenance support without the usual hassle.
              We connect families with trusted professionals and keep the whole experience simple from booking to completion.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/services" className="btn btn-primary btn-lg">
                Explore Services
              </Link>
              <Link to="/contact" className="btn btn-outline btn-lg">
                Contact Our Team
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`reveal rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur delay-${index + 1}`}
                >
                  <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal-right">
            <div className="relative mx-auto max-w-xl">
              <div className="absolute -left-6 top-8 hidden h-40 w-40 rounded-[2rem] bg-teal-500/15 blur-2xl md:block" />
              <div className="absolute -right-8 bottom-0 hidden h-44 w-44 rounded-full bg-cyan-300/30 blur-2xl md:block" />

              <div className="grid gap-5 sm:grid-cols-[1.05fr_0.95fr]">
                <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-teal-900 to-cyan-800 p-8 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.65)]">
                  <div className="mb-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                    <UserGroupIcon className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-100">HomeCrew promise</p>
                  <h2 className="mt-4 text-3xl font-black leading-tight">Reliable household help, designed around real family schedules.</h2>
                  <p className="mt-5 text-sm leading-7 text-slate-200">
                    We keep service discovery, booking, support, and follow-up in one place so homeowners can spend less time coordinating and more time living.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="rounded-[2rem] border border-teal-100 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-600">What we do</p>
                    <div className="mt-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <SparklesIcon className="mt-1 h-6 w-6 text-teal-600" />
                        <p className="text-sm leading-6 text-slate-600">Cleaning visits that leave every room refreshed and guest-ready.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <WrenchScrewdriverIcon className="mt-1 h-6 w-6 text-teal-600" />
                        <p className="text-sm leading-6 text-slate-600">Repairs and upkeep to protect comfort, safety, and daily convenience.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2rem] bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white shadow-[0_24px_50px_-30px_rgba(6,182,212,0.55)]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                        <PhoneIcon className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.22em] text-cyan-50">Need help now?</p>
                        <a href="tel:+8801700000000" className="mt-1 block text-2xl font-black text-white no-underline">
                          +880 1700-000000
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={valuesRef} className="px-6 py-16 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="reveal mb-10 max-w-3xl">
            <span className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-600">Why households choose us</span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-5xl">A service experience built around trust, clarity, and convenience</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              The demo design was adapted for HomeCrew so the story now reflects professional home services instead of event management.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {values.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className={`reveal rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)] delay-${index + 1}`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-2xl font-black text-slate-900">{item.title}</h3>
                  <p className="mt-4 text-base leading-7 text-slate-600">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section ref={storyRef} className="bg-white px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="reveal-left rounded-[2.25rem] bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-8 text-white shadow-[0_35px_90px_-40px_rgba(15,23,42,0.7)] md:p-10">
            <span className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-100">Our mission</span>
            <h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
              Make home care easier to access, easier to trust, and easier to repeat.
            </h2>
            <p className="mt-6 text-base leading-8 text-slate-200">
              We believe household services should feel organized and dependable. That means clear categories, honest pricing, skilled providers, and a platform that helps customers book with confidence.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-4 rounded-2xl bg-white/5 p-4">
                <ShieldCheckIcon className="mt-1 h-7 w-7 flex-shrink-0 text-teal-200" />
                <div>
                  <h3 className="text-lg font-bold">Safer service coordination</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">We focus on reliable professionals and transparent communication before, during, and after service.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl bg-white/5 p-4">
                <HomeModernIcon className="mt-1 h-7 w-7 flex-shrink-0 text-teal-200" />
                <div>
                  <h3 className="text-lg font-bold">Everyday household impact</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">From routine upkeep to urgent fixes, our work is designed to support real life at home.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="reveal-right">
            <div className="grid gap-5 sm:grid-cols-2">
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className={`rounded-[2rem] border border-slate-200 bg-slate-50 p-7 shadow-[0_16px_35px_-30px_rgba(15,23,42,0.35)] animate-fade-in-up`}
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 text-xl font-black text-slate-900">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 rounded-[2rem] border border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50 p-6">
              <Link to="/contact" className="btn btn-primary btn-lg">
                Contact Now
              </Link>
              <a href="tel:+8801700000000" className="inline-flex items-center gap-3 text-lg font-bold text-slate-900 no-underline">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
                  <PhoneIcon className="h-6 w-6" />
                </span>
                +880 1700-000000
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
