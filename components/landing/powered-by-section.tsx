'use client';

import { motion } from 'framer-motion';
import { Spotlight } from '@/components/aceternity/spotlight';
import { poweredByContent } from '@/lib/landing/content';

// OpenAI Logo (official SVG)
function OpenAILogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 260"
      className={className}
      fill="currentColor"
    >
      <path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" />
    </svg>
  );
}

// Google Gemini Logo (official gradient star)
function GeminiLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 28 28"
      className={className}
      fill="none"
    >
      <defs>
        <radialGradient
          id="gemini-gradient-a"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="rotate(18.55 -9.903 32.31) scale(39.5865)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9168C0" />
          <stop offset=".16" stopColor="#5684D1" />
          <stop offset=".4" stopColor="#1BA1E3" />
          <stop offset=".71" stopColor="#38BFD8" />
          <stop offset=".8" stopColor="#4CD4AA" />
          <stop offset=".91" stopColor="#91E894" />
          <stop offset="1" stopColor="#FCF3D0" />
        </radialGradient>
        <radialGradient
          id="gemini-gradient-b"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="rotate(18.55 -9.903 32.31) scale(39.5865)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9168C0" />
          <stop offset=".16" stopColor="#5684D1" />
          <stop offset=".4" stopColor="#1BA1E3" />
          <stop offset=".71" stopColor="#38BFD8" />
          <stop offset=".8" stopColor="#4CD4AA" />
          <stop offset=".91" stopColor="#91E894" />
          <stop offset="1" stopColor="#FCF3D0" />
        </radialGradient>
      </defs>
      <path
        fill="url(#gemini-gradient-a)"
        d="M14 28c0-7.732-6.268-14-14-14 7.732 0 14-6.268 14-14 0 7.732 6.268 14 14 14-7.732 0-14 6.268-14 14z"
      />
    </svg>
  );
}

// Pinecone Logo (official)
function PineconeLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 288"
      className={className}
      fill="currentColor"
    >
      <path d="M108.634 254.436c9.08 0 16.44 7.361 16.44 16.442s-7.36 16.44-16.44 16.44s-16.442-7.36-16.442-16.44s7.361-16.442 16.442-16.442m91.216-29.998l16.247 4.814L203.2 272.78a8.47 8.47 0 0 1-8.7 6.046l-3.983-.273l-.098.08l-41.39-2.904l1.152-16.906l27.808 1.887l-18.205-26.262l13.926-9.656l18.229 26.295zm-176.837-30.09l16.903 1.197l-1.98 27.804L64.15 205.12l9.677 13.91l-26.248 18.248l26.792 7.895l-4.79 16.255l-43.732-12.885a8.47 8.47 0 0 1-6.058-8.726zM132.15 170.67l30.508 36.832l-13.75 11.389l-18.156-21.92l-5.886 33.702l-17.587-3.074l5.892-33.755l-24.442 14.412l-9.063-15.383l41.079-24.2a8.93 8.93 0 0 1 11.405 1.997m85.354-24.71l15.239-8.292l22.2 40.805a8.675 8.675 0 0 1-1.926 10.69l-3.141 2.714l-32.05 27.893l-11.386-13.09l21.548-18.747l-32.095-5.781l3.078-17.074l32.073 5.779zM37.782 103.298l11.48 13.008l-21.251 18.743l32.156 5.614l-2.98 17.091l-32.192-5.618l13.827 24.998l-15.18 8.398l-22.558-40.776a8.675 8.675 0 0 1 1.85-10.703zm108.694-13.42l30.404 36.734l-13.753 11.384l-18.152-21.93l-5.886 33.712l-17.587-3.074l5.872-33.624l-24.349 14.274l-9.027-15.403l37.4-21.929l.038-.142l.165.021l3.485-2.032a8.93 8.93 0 0 1 11.39 2.01m39.18-18.065l6.65-16.024l43.012 17.85a8.675 8.675 0 0 1 5.218 9.517l-.716 3.982l-7.345 41.78l-17.086-3.01l4.924-27.968l-28.537 15.772l-8.386-15.188l28.591-15.784zm-81.939-31.577l.74 17.334l-28.414 1.214l21.43 24.49l-13.056 11.424L62.95 70.173l-5.001 28l-17.078-3.054l8.184-45.759a8.674 8.674 0 0 1 8.17-7.139l4.02-.18l.09-.065zm58.121-36.965l30.267 36.965l-13.814 11.31l-17.964-21.943l-6.059 33.668l-17.57-3.162l6.068-33.743l-24.526 14.34l-9.007-15.415L150.428 1.22a8.93 8.93 0 0 1 11.41 2.052" />
    </svg>
  );
}

const logoComponents = {
  openai: OpenAILogo,
  gemini: GeminiLogo,
  pinecone: PineconeLogo,
};

export function PoweredBySection() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-background py-20">
      <Spotlight
        className="-top-40 left-1/4 md:-top-20"
        fill="hsl(var(--primary) / 0.15)"
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            {poweredByContent.title}
          </p>
          <p className="mb-12 text-lg text-muted-foreground">
            {poweredByContent.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {poweredByContent.techs.map((tech, idx) => {
              const Logo = logoComponents[tech.logo as keyof typeof logoComponents];
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="group flex flex-col items-center gap-4"
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-b from-muted/50 to-muted p-4 shadow-lg ring-1 ring-border transition-all duration-300 group-hover:ring-primary/50 group-hover:shadow-xl group-hover:shadow-primary/10">
                    <Logo className="h-12 w-12 text-foreground transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{tech.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tech.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
