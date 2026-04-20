'use client';

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ArrowRight,
  Check,
  Menu,
  Play,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { Instrument_Serif, Inter } from 'next/font/google';
import Link from 'next/link';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: '400',
  variable: '--font-display',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Demo', href: '#demo' },
  { label: 'Pricing', href: '#pricing' },
];

const heroLineWords = [
  ['Drop', 'a', 'PDF.'],
  ['Master', 'it', 'forever.'],
];

const socialLogos = ['IIT Delhi', 'IIM', 'MIT', 'Oxford', 'NUS'];

const demoFrames = [
  {
    title: 'Upload',
    text: 'Drop your chapter PDF and choose a deck title.',
    label: 'PDF Upload Screen',
  },
  {
    title: 'Ingestion',
    text: 'Extracting concepts, definitions, and relationships.',
    label: 'AI Processing',
  },
  {
    title: 'Deck Ready',
    text: '12 high-quality cards generated in one pass.',
    label: 'Generated Deck',
  },
  {
    title: 'Practice',
    text: 'Flip cards, recall actively, and grade confidence.',
    label: 'Card Review',
  },
  {
    title: 'Mastery',
    text: 'Track what is due, shaky, and fully retained.',
    label: 'Dashboard',
  },
];

const testimonials = [
  {
    quote:
      'Before FlashMind, I kept re-reading the same chapter and still blanked in exams. Now I retain definitions and derivations for weeks.',
    name: 'Ananya Rao',
    meta: 'IIT Delhi · Mechanical Engineering',
    rotate: -3,
  },
  {
    quote:
      'The spaced reviews are perfectly timed. I spend less time studying, but I walk into finals with far more confidence.',
    name: 'Lucas Meyer',
    meta: 'Oxford · Biochemistry',
    rotate: 2.5,
  },
  {
    quote:
      'I used to make cards by hand for hours. Uploading lecture notes and getting a deck in seconds changed my semester.',
    name: 'Mei Lin Tan',
    meta: 'NUS · Data Science',
    rotate: -2,
  },
];

const sectionTransition = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1] as const,
};

const staggerGroup = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const revealChild = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: sectionTransition,
  },
};

type RevealProps = {
  children: ReactNode;
  className?: string;
  amount?: number;
};

function Reveal({ children, className, amount = 0.2 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={sectionTransition}
    >
      {children}
    </motion.div>
  );
}

type MetricCounterProps = {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
};

function MetricCounter({ value, suffix = '', prefix = '', label }: MetricCounterProps) {
  const counterRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(counterRef, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) {
      return;
    }

    const hasDecimals = !Number.isInteger(value);
    const controls = animate(0, value, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (latest) => {
        const formatter = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: hasDecimals ? 1 : 0,
          maximumFractionDigits: hasDecimals ? 1 : 0,
        });
        setDisplay(formatter.format(latest));
      },
    });

    return () => {
      controls.stop();
    };
  }, [inView, value]);

  return (
    <div ref={counterRef} className="rounded-2xl border border-[var(--fm-line)] bg-white/95 px-5 py-4 shadow-[0_14px_30px_rgba(13,13,13,0.05)]">
      <p className="font-[var(--font-display)] text-3xl leading-none text-[var(--fm-text)] md:text-4xl">
        {prefix}
        {display}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-[var(--fm-muted)]">{label}</p>
    </div>
  );
}

function HeroMockup() {
  const fanCards = [
    {
      title: 'Concept Card',
      content: 'What does Bayes theorem update?',
      x: -62,
      y: 108,
      rotate: -10,
      delay: 0.38,
      zIndex: 2,
      driftRotate: -0.9,
    },
    {
      title: 'Worked Example',
      content: 'Find posterior probability after evidence.',
      x: 0,
      y: 84,
      rotate: 0,
      delay: 0.52,
      zIndex: 5,
      driftRotate: 0.4,
    },
    {
      title: 'Edge Case',
      content: 'When does prior dominate posterior?',
      x: 62,
      y: 108,
      rotate: 10,
      delay: 0.62,
      zIndex: 3,
      driftRotate: 0.9,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 52 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.35 }}
      className="relative mx-auto mt-12 w-full max-w-5xl rounded-[34px] border border-[var(--fm-line)] bg-white px-5 pb-7 pt-7 shadow-[0_34px_72px_rgba(13,13,13,0.08)] md:px-8"
    >
      <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_50%_18%,rgba(245,243,239,0.7),rgba(255,255,255,0)_56%)]" />
      <div className="relative grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border border-[var(--fm-line)] bg-[var(--fm-surface)] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fm-muted)]">
              Ingestion Engine
            </p>
            <Sparkles className="h-4 w-4 text-[var(--fm-indigo)]" />
          </div>
          <div className="relative mt-5 h-44 rounded-2xl border border-[var(--fm-line)] bg-white">
            <motion.div
              className="absolute left-1/2 top-5 h-20 w-28 -translate-x-1/2 rounded-xl border border-[var(--fm-line)] bg-[#FFFDF7] p-3 shadow-[0_12px_24px_rgba(13,13,13,0.08)]"
              animate={{ y: [-24, 0, 0], scale: [1, 1.02, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' }}
            >
              <div className="h-1.5 w-12 rounded-full bg-[var(--fm-indigo)]/25" />
              <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--fm-line)]" />
              <div className="mt-1.5 h-1.5 w-4/5 rounded-full bg-[var(--fm-line)]" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--fm-muted)]">PDF</p>
            </motion.div>
            <div className="absolute bottom-7 left-1/2 h-2 w-40 -translate-x-1/2 rounded-full bg-[var(--fm-line)]" />
            <div className="absolute bottom-9 left-1/2 h-4 w-44 -translate-x-1/2 rounded-xl border border-[var(--fm-line)] bg-white" />
          </div>
          <p className="mt-4 text-sm text-[var(--fm-muted)]">
            Parsing chapter structure, extracting key concepts, and generating adaptive prompts.
          </p>
        </div>
        <div className="relative min-h-[340px] overflow-hidden rounded-3xl border border-[var(--fm-line)] bg-gradient-to-b from-white to-[var(--fm-surface)] p-5 [perspective:1200px] md:min-h-[370px] md:p-6">
          <div className="relative mx-auto h-[290px] w-full max-w-[320px] md:h-[320px] md:max-w-[360px]">
            {fanCards.map((card, index) => (
              <motion.div
                key={card.title}
                className="absolute left-1/2 top-10 h-36 w-40 -translate-x-1/2 md:h-40 md:w-44"
                initial={{ x: 0, y: 30, rotate: 0, opacity: 0, scale: 0.96 }}
                animate={{ x: card.x, y: card.y, rotate: card.rotate, opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 80,
                  damping: 15,
                  delay: card.delay,
                }}
                style={{ zIndex: card.zIndex ?? index + 1 }}
              >
                <motion.div
                  className="fm-paper-texture h-full rounded-2xl border border-[var(--fm-line)] bg-white p-3.5 shadow-[0_16px_34px_rgba(13,13,13,0.12)] md:p-4"
                  animate={{ y: [0, -4, 0], rotate: [0, card.driftRotate, 0] }}
                  transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: card.delay + 1.05 }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fm-indigo)]/80">
                    {card.title}
                  </p>
                  <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--fm-text)] md:mt-3 md:text-sm">{card.content}</p>
                </motion.div>
              </motion.div>
            ))}

            <motion.div
              className="absolute left-1/2 top-1 z-10 h-36 w-48 -translate-x-1/2 [perspective:1000px] md:h-40 md:w-52"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: [0, 0, 180, 180, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="absolute inset-0 rounded-2xl border border-[var(--fm-line)] bg-white p-4 [backface-visibility:hidden]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fm-muted)]">Front</p>
                  <p className="mt-3 text-[13px] leading-relaxed text-[var(--fm-text)] md:mt-4 md:text-sm">
                    Why does active recall beat passive re-reading?
                  </p>
                </div>
                <div className="absolute inset-0 rounded-2xl border border-[var(--fm-line)] bg-[#FDFCFA] p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fm-muted)]">Back</p>
                  <p className="mt-3 text-[13px] leading-relaxed text-[var(--fm-text)] md:mt-4 md:text-sm">
                    Recall strengthens retrieval pathways, while re-reading mostly improves familiarity.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HowStepVisual({ step }: { step: 1 | 2 | 3 }) {
  if (step === 1) {
    return (
      <div className="relative h-40 rounded-2xl border border-[var(--fm-line)] bg-white">
        <div className="absolute bottom-5 left-1/2 h-2 w-40 -translate-x-1/2 rounded-full bg-[var(--fm-line)]" />
        <div className="absolute bottom-7 left-1/2 h-3 w-44 -translate-x-1/2 rounded-xl border border-[var(--fm-line)] bg-[var(--fm-surface)]" />
        <motion.div
          className="absolute left-1/2 top-4 h-20 w-28 -translate-x-1/2 rounded-xl border border-[var(--fm-line)] bg-[#FFFDF8] p-3 shadow-[0_12px_24px_rgba(13,13,13,0.08)]"
          animate={{ y: [-28, -2, -2], scale: [1, 1.02, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="h-1.5 w-16 rounded-full bg-[var(--fm-indigo)]/25" />
          <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--fm-line)]" />
          <div className="mt-1.5 h-1.5 w-4/5 rounded-full bg-[var(--fm-line)]" />
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--fm-muted)]">Chapter.pdf</p>
        </motion.div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="relative h-40 rounded-2xl border border-[var(--fm-line)] bg-white p-4">
        <div className="space-y-3">
          {[0, 1, 2].map((line) => (
            <motion.div
              key={line}
              className="rounded-xl border border-[var(--fm-line)] bg-[var(--fm-surface)] px-3 py-2"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, delay: line * 0.16 }}
            >
              <motion.div
                className="h-2 rounded-full bg-[var(--fm-indigo)]/25"
                animate={{ width: ['0%', '100%', '100%'] }}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.1, delay: line * 0.25 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-40 rounded-2xl border border-[var(--fm-line)] bg-white p-4">
      <div className="absolute inset-x-4 top-4 h-24 [perspective:1000px]">
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: [0, 180, 180, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute inset-0 rounded-xl border border-[var(--fm-line)] bg-[var(--fm-surface)] p-3 [backface-visibility:hidden]">
            <p className="text-xs text-[var(--fm-muted)]">Front</p>
            <p className="mt-2 text-sm text-[var(--fm-text)]">What is synaptic consolidation?</p>
          </div>
          <div className="absolute inset-0 rounded-xl border border-[var(--fm-line)] bg-white p-3 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-xs text-[var(--fm-muted)]">Back</p>
            <p className="mt-2 text-sm text-[var(--fm-text)]">Stabilization of memory after learning.</p>
          </div>
        </motion.div>
      </div>
      <div className="absolute inset-x-4 bottom-4 h-2 rounded-full bg-[var(--fm-line)]">
        <motion.div
          className="h-full rounded-full bg-[var(--fm-indigo)]"
          animate={{ width: ['16%', '92%', '16%'] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingMode, setBillingMode] = useState<'monthly' | 'annual'>('monthly');
  const [isInteractiveCardFlipped, setIsInteractiveCardFlipped] = useState(false);

  const demoSectionRef = useRef<HTMLElement | null>(null);
  const demoTrackRef = useRef<HTMLDivElement | null>(null);
  const demoViewportRef = useRef<HTMLDivElement | null>(null);
  const [demoTrackDistance, setDemoTrackDistance] = useState(0);

  const { scrollYProgress: demoProgress } = useScroll({
    target: demoSectionRef,
    offset: ['start start', 'end end'],
  });

  const snapProgress = useTransform(demoProgress, (value) => {
    const steps = demoFrames.length - 1;
    const snapped = Math.round(value * steps) / steps;
    return Number.isFinite(snapped) ? snapped : 0;
  });
  const demoOffset = useTransform(snapProgress, (value) => -demoTrackDistance * value);
  const demoOffsetSpring = useSpring(demoOffset, {
    stiffness: 115,
    damping: 24,
    mass: 0.6,
  });

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const resizeHandler = () => {
      if (!demoTrackRef.current || !demoViewportRef.current) {
        return;
      }
      const distance = Math.max(
        demoTrackRef.current.scrollWidth - demoViewportRef.current.clientWidth,
        0,
      );
      setDemoTrackDistance(distance);
    };

    resizeHandler();
    window.addEventListener('resize', resizeHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  const themeVariables = {
    '--fm-white': '#FFFFFF',
    '--fm-bg': '#FAFAF8',
    '--fm-bg-soft': '#F5F3EF',
    '--fm-surface': '#F8F6F2',
    '--fm-text': '#0D0D0D',
    '--fm-text-soft': '#1A1A1A',
    '--fm-muted': '#5E5A57',
    '--fm-line': '#E8E3DA',
    '--fm-indigo': '#5B4FE8',
  } as CSSProperties;

  return (
    <div
      className={`${instrumentSerif.variable} ${inter.variable} bg-[var(--fm-bg)] text-[var(--fm-text)]`}
      style={themeVariables}
    >
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        .fm-paper-texture {
          background-image:
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 248, 243, 0.96)),
            repeating-linear-gradient(
              180deg,
              transparent,
              transparent 22px,
              rgba(232, 227, 218, 0.5) 22px,
              rgba(232, 227, 218, 0.5) 23px
            );
        }

        .fm-logo-track {
          animation: fm-marquee 48s linear infinite;
        }

        .group:hover .fm-logo-track {
          animation-play-state: paused;
        }

        .fm-cta-sheen::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-130%);
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.45) 40%,
            rgba(255, 255, 255, 0) 82%
          );
          transition: transform 700ms ease;
        }

        .fm-cta-sheen:hover::after {
          transform: translateX(130%);
        }

        @keyframes fm-marquee {
          0% {
            transform: translateX(0%);
          }

          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      <motion.header
        className="fixed inset-x-0 top-4 z-50 px-4"
        initial={false}
        animate={{ scale: isScrolled ? 0.985 : 1 }}
        transition={{ type: 'spring', stiffness: 230, damping: 28 }}
      >
        <nav
          className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border px-5 transition-all duration-300 md:px-7 ${
            isScrolled
              ? 'border-[var(--fm-line)] bg-white/86 py-2.5 shadow-[0_16px_38px_rgba(13,13,13,0.08)] backdrop-blur-md'
              : 'border-[var(--fm-line)] bg-white/95 py-3 shadow-[0_10px_26px_rgba(13,13,13,0.05)]'
          }`}
        >
          <a href="#" className="flex items-center gap-2 text-[var(--fm-text)]">
            <Zap className="h-4 w-4 text-[var(--fm-indigo)]" />
            <span className="font-[var(--font-display)] text-xl italic md:text-2xl">FlashMind</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative text-sm font-medium text-[var(--fm-text-soft)] after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-[var(--fm-indigo)] after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="hidden md:block">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/login"
                className="block rounded-full bg-[var(--fm-indigo)] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(91,79,232,0.32)]"
              >
                Try Free
              </Link>
            </motion.div>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--fm-line)] text-[var(--fm-text)] md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-[var(--fm-text)]/20 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              className="fixed right-0 top-0 z-50 h-full w-[82%] max-w-sm border-l border-[var(--fm-line)] bg-[var(--fm-bg)] p-6 md:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
              <div className="flex items-center justify-between">
                <p className="font-[var(--font-display)] text-2xl italic">FlashMind</p>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--fm-line)]"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-10 space-y-6">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-lg text-[var(--fm-text-soft)]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-10 block w-full rounded-full bg-[var(--fm-indigo)] px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_10px_18px_rgba(91,79,232,0.32)]"
                >
                  Try Free
                </Link>
              </motion.div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <main>
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-16 pt-36 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(245,243,239,0.78),rgba(255,255,255,0)_54%)]" />
          <div className="relative mx-auto w-full max-w-7xl">
            <motion.div
              className="mx-auto max-w-4xl text-center"
              initial="hidden"
              animate="show"
              variants={staggerGroup}
            >
              <motion.p
                variants={revealChild}
                className="inline-flex items-center rounded-full border border-[var(--fm-line)] bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--fm-muted)]"
              >
                Built for Deep Learning
              </motion.p>
              <h1 className="mt-6 font-[var(--font-display)] text-[clamp(3.25rem,10vw,7rem)] leading-[0.95] text-[var(--fm-text)]">
                {heroLineWords.map((line, lineIndex) => (
                  <span key={line.join('-')} className="block">
                    {line.map((word, wordIndex) => {
                      const totalIndex = lineIndex * 3 + wordIndex;
                      return (
                        <motion.span
                          key={`${word}-${totalIndex}`}
                          className="mr-[0.25em] inline-block"
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.16 + totalIndex * 0.06 }}
                        >
                          {word}
                        </motion.span>
                      );
                    })}
                  </span>
                ))}
              </h1>
              <motion.p
                variants={revealChild}
                className="mx-auto mt-7 max-w-3xl text-balance text-lg leading-relaxed text-[var(--fm-muted)] md:text-xl"
              >
                FlashMind turns any chapter, lecture, or notes into a smart flashcard deck powered by AI
                and spaced repetition science.
              </motion.p>
              <motion.div
                variants={revealChild}
                className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--fm-indigo)] px-7 py-3 text-base font-semibold text-white shadow-[0_14px_26px_rgba(91,79,232,0.35)]"
                >
                  Upload your first PDF
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--fm-line)] bg-white px-7 py-3 text-base font-semibold text-[var(--fm-text-soft)]"
                >
                  <Play className="h-4 w-4" />
                  Watch demo
                </motion.button>
              </motion.div>
            </motion.div>

            <HeroMockup />

            <Reveal className="mx-auto mt-12 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
              <MetricCounter value={94} suffix="%" label="Retention rate after 4 weeks" />
              <MetricCounter value={2.3} suffix="M" label="Cards created by students" />
              <MetricCounter value={60} suffix="s" label="Average time to first deck" />
            </Reveal>
          </div>
        </section>

        <section className="border-y border-[var(--fm-line)] bg-[#F0EEE9] px-4 py-6 md:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 md:flex-row md:gap-8">
            <p className="text-sm uppercase tracking-[0.12em] text-[var(--fm-muted)]">Trusted by students at</p>
            <div className="group relative w-full overflow-hidden">
              <div className="fm-logo-track flex min-w-max items-center gap-10 whitespace-nowrap py-2">
                {[...socialLogos, ...socialLogos, ...socialLogos].map((logo, index) => (
                  <span
                    key={`${logo}-${index}`}
                    className="text-base font-medium tracking-[0.02em] text-[var(--fm-text-soft)]"
                  >
                    {logo}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 md:px-8">
          <Reveal className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1fr_auto_1fr]">
            <motion.article
              className="rounded-3xl border border-[var(--fm-line)] bg-[#F7F5F1] p-8"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={sectionTransition}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fm-muted)]">The old way</p>
              <h2 className="mt-5 max-w-xl text-2xl leading-tight text-[var(--fm-text-soft)] md:text-3xl">
                You read the chapter. You highlight. You re-read. Three days later - gone.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--fm-muted)] md:text-base">
                Passive study feels productive while you do it. But familiarity is not memory. That is why the
                content fades when the exam asks for recall.
              </p>
            </motion.article>
            <motion.div
              className="mx-auto hidden w-px overflow-hidden rounded-full bg-[var(--fm-line)] lg:block"
              initial={{ height: 0 }}
              whileInView={{ height: '100%' }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            >
              <motion.div
                className="h-full w-full origin-top bg-[var(--fm-indigo)]/40"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
              />
            </motion.div>
            <motion.article
              className="rounded-3xl border border-[var(--fm-line)] bg-white p-8 shadow-[0_20px_45px_rgba(13,13,13,0.05)]"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ ...sectionTransition, delay: 0.05 }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fm-indigo)]">
                The FlashMind way
              </p>
              <h2 className="mt-5 max-w-xl font-[var(--font-display)] text-3xl leading-tight text-[var(--fm-text)] md:text-4xl">
                You upload the PDF. The AI builds your deck. You practice what you are weak on. The knowledge sticks.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--fm-muted)] md:text-base">
                You stop guessing what to review. FlashMind schedules each card by mastery, so your effort goes where
                it actually changes outcomes.
              </p>
            </motion.article>
          </Reveal>
        </section>

        <section id="how-it-works" className="scroll-mt-24 px-4 py-20 md:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Reveal>
              <h2 className="text-center font-[var(--font-display)] text-4xl leading-tight text-[var(--fm-text)] md:text-6xl">
                From PDF to mastery in 3 steps
              </h2>
            </Reveal>
            <motion.div
              className="mt-10 space-y-6"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={{
                hidden: {},
                show: {
                  transition: {
                    staggerChildren: 0.15,
                  },
                },
              }}
            >
              {[
                {
                  step: 1 as const,
                  title: 'Drop your PDF',
                  copy: 'Drag your notes or chapter PDF into FlashMind. The ingestion model reads structure, not just text.',
                },
                {
                  step: 2 as const,
                  title: 'AI builds your deck',
                  copy: 'Questions are generated concept by concept, with definitions, examples, and edge cases included.',
                },
                {
                  step: 3 as const,
                  title: 'Practice and master',
                  copy: 'Flip cards, rate recall confidence, and let spaced repetition schedule the next perfect review.',
                },
              ].map((item) => (
                <motion.article
                  key={item.step}
                  className="relative overflow-hidden rounded-[30px] border border-[var(--fm-line)] bg-white p-8 shadow-[0_16px_32px_rgba(13,13,13,0.05)] md:p-10"
                  variants={revealChild}
                >
                  <p className="pointer-events-none absolute right-4 top-2 font-[var(--font-display)] text-[100px] leading-none text-[var(--fm-indigo)]/[0.07] md:text-[140px]">
                    0{item.step}
                  </p>
                  <div className="grid items-center gap-6 md:grid-cols-[1.2fr_1fr]">
                    <div>
                      <h3 className="font-[var(--font-display)] text-3xl text-[var(--fm-text)] md:text-4xl">{item.title}</h3>
                      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--fm-muted)]">{item.copy}</p>
                    </div>
                    <HowStepVisual step={item.step} />
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 px-4 py-20 md:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Reveal>
              <h2 className="text-center font-[var(--font-display)] text-4xl leading-tight text-[var(--fm-text)] md:text-6xl">
                Everything a great teacher would give you
              </h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-6 md:auto-rows-fr md:grid-cols-4">
              <motion.article
                className="group relative overflow-hidden rounded-3xl border border-[var(--fm-line)] bg-white p-6 shadow-[0_14px_26px_rgba(13,13,13,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(13,13,13,0.08)] md:col-span-2"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={sectionTransition}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fm-indigo)]">
                  Intelligent Ingestion
                </p>
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--fm-muted)]">
                  Not 10 shallow cards. The AI reads like a teacher - extracting key concepts, definitions,
                  relationships, edge cases, and worked examples.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <motion.div
                      key={idx}
                      className="rounded-xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-3"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.45, delay: idx * 0.1 }}
                    >
                      <motion.div
                        className="h-2 rounded-full bg-[var(--fm-indigo)]/25"
                        animate={{ width: ['14%', '95%', '95%'] }}
                        transition={{ duration: 1.9, repeat: Infinity, repeatDelay: 0.9, delay: idx * 0.2 }}
                      />
                      <p className="mt-2 text-xs text-[var(--fm-muted)]">Card {idx + 1} generated</p>
                    </motion.div>
                  ))}
                </div>
              </motion.article>

              <motion.article
                className="group rounded-3xl border border-[var(--fm-line)] bg-white p-6 shadow-[0_14px_26px_rgba(13,13,13,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(13,13,13,0.08)]"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ ...sectionTransition, delay: 0.04 }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fm-indigo)]">
                  Spaced Repetition (SM-2)
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--fm-muted)]">
                  Cards you know fade. Cards you struggle with keep coming back. Backed by 50 years of memory
                  science.
                </p>
                <div className="mt-6 h-28 rounded-2xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-3">
                  <svg viewBox="0 0 220 90" className="h-full w-full">
                    <motion.path
                      d="M8 74 C 44 65, 78 48, 122 28 C 160 14, 188 12, 212 10"
                      fill="none"
                      stroke="var(--fm-indigo)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeDasharray="300"
                      initial={{ strokeDashoffset: 300 }}
                      whileInView={{ strokeDashoffset: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 1.4, ease: 'easeOut' }}
                    />
                    <circle cx="122" cy="28" r="3.5" fill="var(--fm-indigo)" />
                    <circle cx="188" cy="12" r="3.5" fill="var(--fm-indigo)" />
                  </svg>
                </div>
              </motion.article>

              <motion.article
                className="group rounded-3xl border border-[var(--fm-line)] bg-white p-6 shadow-[0_14px_26px_rgba(13,13,13,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(13,13,13,0.08)]"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ ...sectionTransition, delay: 0.08 }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fm-indigo)]">
                  Mastery Tracking
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--fm-muted)]">
                  See exactly what you have nailed, what is shaky, and what is due next. Feel progress, not anxiety.
                </p>
                <div className="mt-6 flex items-center justify-center">
                  <svg viewBox="0 0 120 120" className="h-28 w-28">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="var(--fm-line)" strokeWidth="10" />
                    <motion.circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke="var(--fm-indigo)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="302"
                      initial={{ strokeDashoffset: 302 }}
                      whileInView={{ strokeDashoffset: 84 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 1.4, ease: 'easeOut' }}
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                </div>
              </motion.article>

              <motion.article
                className="group rounded-3xl border border-[var(--fm-line)] bg-white p-6 shadow-[0_14px_26px_rgba(13,13,13,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(13,13,13,0.08)]"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ ...sectionTransition, delay: 0.12 }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fm-indigo)]">Deck Library</p>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--fm-muted)]">
                  Dozens of decks, beautifully organized. Search, filter, and pick up exactly where you left off.
                </p>
                <div className="mt-6 h-28 overflow-x-hidden rounded-2xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-3">
                  <motion.div
                    className="flex gap-2"
                    animate={{ x: [0, -56, 0] }}
                    transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {['Biology', 'Calculus', 'Economics', 'Physics'].map((deck) => (
                      <div
                        key={deck}
                        className="min-w-[80px] shrink-0 rounded-lg border border-[var(--fm-line)] bg-white px-3 py-4 text-center text-xs text-[var(--fm-text-soft)]"
                      >
                        {deck}
                      </div>
                    ))}
                  </motion.div>
                </div>
              </motion.article>

              <motion.article
                className="group rounded-3xl border border-[var(--fm-line)] bg-white p-6 shadow-[0_14px_26px_rgba(13,13,13,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(13,13,13,0.08)] md:col-span-2"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ ...sectionTransition, delay: 0.16 }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fm-indigo)]">Card Flip Delight</p>
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--fm-muted)]">
                  Click to flip this live card. Recall first, then check the answer.
                </p>
                <button
                  type="button"
                  onClick={() => setIsInteractiveCardFlipped((prev) => !prev)}
                  className="mt-6 block w-full rounded-2xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-4 text-left [perspective:1400px]"
                  aria-label="Flip flashcard"
                >
                  <motion.div
                    className="relative h-52 w-full [transform-style:preserve-3d]"
                    animate={{ rotateY: isInteractiveCardFlipped ? 180 : 0 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <div className="absolute inset-0 rounded-2xl border border-[var(--fm-line)] bg-white p-6 [backface-visibility:hidden]">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--fm-muted)]">Front</p>
                      <p className="mt-6 font-[var(--font-display)] text-3xl leading-snug text-[var(--fm-text)] md:text-4xl">
                        What is the discriminant of a quadratic equation?
                      </p>
                    </div>
                    <div className="absolute inset-0 rounded-2xl border border-[var(--fm-line)] bg-[#FFFEFC] p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--fm-muted)]">Back</p>
                      <p className="mt-6 font-[var(--font-display)] text-3xl leading-snug text-[var(--fm-text)] md:text-4xl">
                        b² - 4ac. It determines the nature of roots.
                      </p>
                    </div>
                  </motion.div>
                </button>
              </motion.article>
            </div>
          </div>
        </section>

        <section id="demo" ref={demoSectionRef} className="relative h-[280vh] scroll-mt-24 bg-[#F7F5F1] px-4 py-20 md:px-8">
          <div className="sticky top-20 mx-auto w-full max-w-7xl">
            <Reveal>
              <h2 className="text-center font-[var(--font-display)] text-4xl leading-tight text-[var(--fm-text)] md:text-6xl">
                See it in action
              </h2>
            </Reveal>
            <div ref={demoViewportRef} className="mx-auto mt-10 max-w-6xl overflow-hidden rounded-[30px] border border-[var(--fm-line)] bg-white p-4 md:p-6">
              <motion.div ref={demoTrackRef} className="flex gap-4" style={{ x: demoOffsetSpring }}>
                {demoFrames.map((frame, index) => (
                  <article
                    key={frame.title}
                    className="w-[82vw] shrink-0 rounded-2xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-5 md:w-[44vw]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fm-indigo)]">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--fm-text)]">{frame.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[var(--fm-muted)]">
                      {frame.text}
                    </p>
                    <div className="mt-5 rounded-xl border border-[var(--fm-line)] bg-white p-4">
                      {index === 0 ? (
                        <div className="space-y-3">
                          <div className="h-2 w-24 rounded-full bg-[var(--fm-line)]" />
                          <div className="h-20 rounded-lg border border-dashed border-[var(--fm-line)] bg-[var(--fm-bg-soft)]" />
                        </div>
                      ) : null}
                      {index === 1 ? (
                        <div className="space-y-3">
                          <p className="text-xs text-[var(--fm-muted)]">Extracting concepts...</p>
                          <div className="h-2 rounded-full bg-[var(--fm-line)]">
                            <motion.div
                              className="h-full rounded-full bg-[var(--fm-indigo)]"
                              animate={{ width: ['12%', '84%', '100%'] }}
                              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          </div>
                        </div>
                      ) : null}
                      {index === 2 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {Array.from({ length: 6 }).map((_, cardIndex) => (
                            <motion.div
                              key={`demo-card-${cardIndex}`}
                              className="h-14 rounded-lg border border-[var(--fm-line)] bg-[var(--fm-bg-soft)]"
                              initial={{ opacity: 0, y: 8 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true, amount: 0.8 }}
                              transition={{ duration: 0.35, delay: cardIndex * 0.08 }}
                            />
                          ))}
                        </div>
                      ) : null}
                      {index === 3 ? (
                        <div className="[perspective:1000px]">
                          <motion.div
                            className="relative h-24 rounded-lg border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] [transform-style:preserve-3d]"
                            animate={{ rotateY: [0, 180, 180, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--fm-text)] [backface-visibility:hidden]">
                              Front
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--fm-text)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                              Back
                            </div>
                          </motion.div>
                        </div>
                      ) : null}
                      {index === 4 ? (
                        <div className="space-y-3">
                          {['Mastered', 'Shaky', 'Due today'].map((row, rowIndex) => (
                            <div key={row}>
                              <div className="mb-1 flex items-center justify-between text-xs text-[var(--fm-muted)]">
                                <span>{row}</span>
                                <span>{rowIndex === 0 ? '62%' : rowIndex === 1 ? '23%' : '15%'}</span>
                              </div>
                              <div className="h-2 rounded-full bg-[var(--fm-line)]">
                                <motion.div
                                  className="h-full rounded-full bg-[var(--fm-indigo)]/80"
                                  initial={{ width: 0 }}
                                  whileInView={{
                                    width: rowIndex === 0 ? '62%' : rowIndex === 1 ? '23%' : '15%',
                                  }}
                                  viewport={{ once: true, amount: 0.7 }}
                                  transition={{ duration: 0.8, delay: rowIndex * 0.15 }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.11em] text-[var(--fm-muted)]">{frame.label}</p>
                  </article>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 md:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1fr_1.1fr]">
            <Reveal>
              <blockquote className="font-[var(--font-display)] text-4xl leading-tight text-[var(--fm-text)] md:text-6xl">
                The students who remember are not the ones who study more. They are the ones who practice at exactly
                the right time.
              </blockquote>
            </Reveal>
            <Reveal>
              <div className="rounded-3xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-6">
                <svg viewBox="0 0 560 260" className="h-auto w-full">
                  <motion.path
                    d="M18 210 C 120 122, 212 78, 542 40"
                    fill="none"
                    stroke="rgba(91,79,232,0.18)"
                    strokeWidth="2"
                    strokeDasharray="8 8"
                    initial={{ opacity: 0.6 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.5 }}
                  />
                  <motion.path
                    d="M18 210 C 120 208, 212 214, 542 240"
                    fill="none"
                    stroke="var(--fm-text)"
                    strokeOpacity="0.2"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="1000"
                    initial={{ strokeDashoffset: 1000 }}
                    whileInView={{ strokeDashoffset: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                  <motion.path
                    d="M18 210 C 90 183, 165 168, 248 142 C 304 124, 380 94, 542 40"
                    fill="none"
                    stroke="var(--fm-indigo)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="1000"
                    initial={{ strokeDashoffset: 1000 }}
                    whileInView={{ strokeDashoffset: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                  />
                  {[130, 235, 350, 450].map((x, idx) => (
                    <g key={x}>
                      <motion.line
                        x1={x}
                        y1={48}
                        x2={x}
                        y2={220}
                        stroke="var(--fm-indigo)"
                        strokeOpacity="0.22"
                        strokeDasharray="4 6"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ delay: 0.5 + idx * 0.12 }}
                      />
                      <motion.circle
                        cx={x}
                        cy={180 - idx * 24}
                        r="5"
                        fill="var(--fm-indigo)"
                        initial={{ scale: 0, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 17, delay: 0.55 + idx * 0.12 }}
                      />
                    </g>
                  ))}
                </svg>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--fm-muted)]">
                  FlashMind uses SM-2 scheduling in plain terms: cards you answer confidently are pushed farther out;
                  uncertain cards return sooner. You spend less time guessing and more time reinforcing what matters.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-4 py-20 md:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Reveal>
              <h2 className="font-[var(--font-display)] text-4xl leading-tight text-[var(--fm-text)] md:text-6xl">
                Students feel the difference fast
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <motion.article
                  key={testimonial.name}
                  className="rounded-3xl border border-[var(--fm-line)] bg-[#FFFEFB] p-6 shadow-[0_12px_26px_rgba(13,13,13,0.05)]"
                  initial={{ opacity: 0, y: 24, rotate: testimonial.rotate }}
                  whileInView={{ opacity: 1, y: 0, rotate: testimonial.rotate }}
                  viewport={{ once: true, amount: 0.2 }}
                  whileHover={{ rotate: 0, y: -4 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 21 }}
                >
                  <p className="font-[var(--font-display)] text-2xl leading-snug text-[var(--fm-text)]">“{testimonial.quote}”</p>
                  <p className="mt-6 text-base font-semibold text-[var(--fm-text-soft)]">{testimonial.name}</p>
                  <p className="mt-1 text-sm text-[var(--fm-muted)]">{testimonial.meta}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-4 py-20 md:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <Reveal>
              <h2 className="text-center font-[var(--font-display)] text-4xl leading-tight text-[var(--fm-text)] md:text-6xl">
                Simple pricing for serious study
              </h2>
            </Reveal>
            <div className="mt-8 flex justify-center">
              <div className="inline-flex rounded-full bg-[#ECE8DF] p-1">
                {([
                  { key: 'monthly', label: 'Monthly' },
                  { key: 'annual', label: 'Annual (save 25%)' },
                ] as const).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setBillingMode(option.key)}
                    className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                      billingMode === option.key ? 'text-[var(--fm-text)]' : 'text-[var(--fm-muted)]'
                    }`}
                  >
                    {billingMode === option.key ? (
                      <motion.span
                        layoutId="billing-indicator"
                        className="absolute inset-0 -z-10 rounded-full bg-white shadow-[0_8px_20px_rgba(13,13,13,0.08)]"
                        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                      />
                    ) : null}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <motion.article
                className="rounded-3xl border border-[var(--fm-line)] bg-white p-7"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={sectionTransition}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--fm-muted)]">Free</p>
                <p className="mt-4 font-[var(--font-display)] text-5xl text-[var(--fm-text)]">$0</p>
                <p className="mt-1 text-sm text-[var(--fm-muted)]">No card required</p>
                <ul className="mt-6 space-y-3 text-sm text-[var(--fm-text-soft)]">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--fm-indigo)]" />3 decks
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--fm-indigo)]" />50 cards per deck
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--fm-indigo)]" />Core spaced repetition
                  </li>
                </ul>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-8 w-full rounded-full border border-[var(--fm-line)] px-5 py-3 font-semibold text-[var(--fm-text-soft)]"
                >
                  Start free
                </motion.button>
              </motion.article>

              <motion.article
                className="relative rounded-3xl border border-[var(--fm-indigo)] bg-white p-7 shadow-[0_20px_40px_rgba(91,79,232,0.12)]"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ ...sectionTransition, delay: 0.05 }}
              >
                <p className="inline-flex rounded-full border border-[var(--fm-indigo)]/30 bg-[var(--fm-indigo)]/10 px-3 py-1 font-[var(--font-display)] text-sm italic text-[var(--fm-indigo)]">
                  Most Popular
                </p>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--fm-muted)]">Pro</p>
                <p className="mt-4 font-[var(--font-display)] text-5xl text-[var(--fm-text)]">
                  ${billingMode === 'monthly' ? '12' : '9'}
                </p>
                <p className="mt-1 text-sm text-[var(--fm-muted)]">
                  {billingMode === 'monthly' ? 'per month' : 'per month · billed yearly'}
                </p>
                <ul className="mt-6 space-y-3 text-sm text-[var(--fm-text-soft)]">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--fm-indigo)]" />Unlimited decks and cards
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--fm-indigo)]" />AI deck re-generation
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--fm-indigo)]" />Advanced mastery analytics
                  </li>
                </ul>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-8 w-full rounded-full bg-[var(--fm-indigo)] px-5 py-3 font-semibold text-white"
                >
                  Go Pro
                </motion.button>
              </motion.article>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-24 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,243,239,0.95),rgba(250,250,248,1)_72%)]" />
          <motion.svg
            viewBox="0 0 600 600"
            className="absolute h-[680px] w-[680px] text-[var(--fm-indigo)]/12"
            animate={{ rotate: 360 }}
            transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
          >
            <circle cx="300" cy="300" r="130" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="300" cy="300" r="190" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="300" cy="300" r="250" fill="none" stroke="currentColor" strokeWidth="1" />
          </motion.svg>
          <div className="relative mx-auto w-full max-w-4xl text-center">
            <Reveal>
              <h2 className="font-[var(--font-display)] text-5xl leading-tight text-[var(--fm-text)] md:text-7xl">
                Your next exam. Your best exam.
              </h2>
            </Reveal>
            <Reveal>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--fm-muted)] md:text-xl">
                Upload a PDF and build your first deck in under 60 seconds. Free forever, no card required.
              </p>
            </Reveal>
            <Reveal>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="fm-cta-sheen relative mt-10 inline-flex overflow-hidden rounded-full bg-[var(--fm-indigo)] px-9 py-4 text-base font-semibold text-white shadow-[0_18px_34px_rgba(91,79,232,0.34)]"
              >
                Upload your first PDF
              </motion.button>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--fm-line)] bg-[var(--fm-bg)] px-4 py-10 md:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--fm-indigo)]" />
            <span className="font-[var(--font-display)] text-2xl italic">FlashMind</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--fm-muted)]">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
          <div className="space-y-1 text-sm text-[var(--fm-muted)] md:text-right">
            <p>© {new Date().getFullYear()} FlashMind</p>
            <p className="font-[var(--font-display)] italic">Memory is a skill. Train it.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
