'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState, type MouseEvent, type ReactNode } from 'react';

interface WobbleCardProps {
  children: ReactNode;
  containerClassName?: string;
  className?: string;
}

export function WobbleCard({
  children,
  containerClassName,
  className,
}: WobbleCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = event;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (clientX - (rect.left + rect.width / 2)) / 20;
    const y = (clientY - (rect.top + rect.height / 2)) / 20;
    setMousePosition({ x, y });
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setMousePosition({ x: 0, y: 0 });
      }}
      style={{
        transform: isHovering
          ? `translate3d(${mousePosition.x}px, ${mousePosition.y}px, 0) scale3d(1.02, 1.02, 1)`
          : 'translate3d(0px, 0px, 0) scale3d(1, 1, 1)',
        transition: 'transform 0.1s ease-out',
      }}
      className={cn(
        'relative mx-auto w-full overflow-hidden rounded-2xl bg-card',
        containerClassName
      )}
    >
      <div
        className="relative h-full overflow-hidden sm:mx-0 sm:rounded-2xl"
        style={{
          boxShadow:
            '0 10px 32px rgba(0, 0, 0, 0.12), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        }}
      >
        <motion.div
          style={{
            transform: isHovering
              ? `translate3d(${-mousePosition.x}px, ${-mousePosition.y}px, 0) scale3d(1.03, 1.03, 1)`
              : 'translate3d(0px, 0px, 0) scale3d(1, 1, 1)',
            transition: 'transform 0.1s ease-out',
          }}
          className={cn('h-full px-4 py-10 sm:px-10 sm:py-20', className)}
        >
          <Noise />
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}

function Noise() {
  return (
    <div
      className="pointer-events-none absolute inset-0 h-full w-full scale-[1.2] transform opacity-10 [mask-image:radial-gradient(#fff,transparent,75%)]"
      style={{
        backgroundImage: 'url(/noise.webp)',
        backgroundSize: '30%',
      }}
    />
  );
}
