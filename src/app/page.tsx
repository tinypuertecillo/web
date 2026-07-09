'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Layers, MapPin, Calendar, Compass, Shield, Wind, Flame, Coffee } from 'lucide-react';
import contentData from '../../web_content_sync.json';

const BentoBlock = ({ block, previewMode }: { block: any; previewMode?: string }) => {
  const currentMode = previewMode || 'desktop';
  let finalCol = block.col || 1;
  let finalRow = block.row || 1;
  let finalSpan = block.span || '1x1';

  if (currentMode === 'tablet') {
    if (block.tCol !== undefined) finalCol = block.tCol;
    if (block.tRow !== undefined) finalRow = block.tRow;
    if (block.tSpan !== undefined) finalSpan = block.tSpan;
  } else if (currentMode === 'mobile') {
    if (block.mCol !== undefined) finalCol = block.mCol;
    if (block.mRow !== undefined) finalRow = block.mRow;
    if (block.mSpan !== undefined) {
      finalSpan = block.mSpan;
    } else {
      const [w, h] = (block.span || '12x8').split('x').map((n: string) => parseInt(n) || 12);
      finalSpan = `48x${h}`;
    }
  }

  const cardRef = React.useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const [mSpanW, mSpanH] = (block.mSpan || `${block.mCol ? (block.span || '1x1').split('x')[0] : 48}x${(block.span || '1x1').split('x')[1] || 8}`).split('x').map((n: string) => parseInt(n) || 1);
  const [tSpanW, tSpanH] = (block.tSpan || block.span || '1x1').split('x').map((n: string) => parseInt(n) || 1);
  const images = block.gallery && block.gallery.length > 0 ? block.gallery : [block.image].filter(Boolean);
  const [spanW, spanH] = finalSpan.split('x').map((n: string) => parseInt(n) || 1);

  const isImage = block.type === 'image' || !block.type;
  const isText = block.type === 'text';
  const isBoth = block.type === 'both';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('cocina')) return <Coffee className="w-5 h-5 text-secondary" />;
    if (l.includes('mobiliario')) return <Compass className="w-5 h-5 text-secondary" />;
    if (l.includes('climatización') || l.includes('pasiva')) return <Wind className="w-5 h-5 text-secondary" />;
    if (l.includes('seguridad')) return <Shield className="w-5 h-5 text-secondary" />;
    return null;
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        gridColumn: `var(--final-col) / span var(--final-span-w)`,
        gridRow: `var(--final-row) / span var(--final-span-h)`,
        '--final-col': finalCol,
        '--final-row': finalRow,
        '--final-span-w': spanW,
        '--final-span-h': spanH,
        '--t-col': block.tCol || block.col || 1,
        '--t-row': block.tRow || block.row || 1,
        '--t-span-w': tSpanW,
        '--t-span-h': tSpanH,
        '--m-col': block.mCol || 1,
        '--m-row': block.mRow || 1,
        '--m-span-w': mSpanW,
        '--m-span-h': mSpanH,
        position: 'relative',
        borderRadius: block.borderRadius || '12px',
        backgroundColor: block.bgColor || 'rgba(255,255,255,0.03)',
        overflow: 'hidden',
        border: block.bgColor && block.bgColor !== 'transparent' ? 'none' : '1px solid rgba(29, 27, 22, 0.05)',
        boxShadow: isHovered ? '0 20px 40px rgba(29, 27, 22, 0.05)' : 'none',
        margin: '8px',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      } as any}
      className="bento-block-mobile group"
    >
      {/* Spotlight highlight */}
      {isHovered && (isBoth || isText) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            pointerEvents: 'none',
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(150, 72, 40, 0.05), transparent 50%)`,
            opacity: 1,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Image rendering */}
      {(isImage || isBoth) && images[0] && (
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
          <img
            src={images[0]}
            alt={block.label}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            style={{
              opacity: isBoth ? 0.35 : 1,
              filter: isBoth ? 'brightness(0.6) contrast(1.1)' : 'none'
            }}
          />
          {isBoth && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-1" />
          )}
        </div>
      )}

      {/* Text rendering */}
      {(isText || isBoth) && (
        <div
          className={`absolute inset-0 z-10 flex flex-col justify-end p-8 md:p-10 pointer-events-none`}
          style={{
            color: block.textColor || '#1d1b16',
            textAlign: block.textAlign || 'left',
            alignItems: block.textAlign === 'center' ? 'center' : (block.textAlign === 'right' ? 'flex-end' : 'flex-start')
          }}
        >
          {block.label && !isBoth && (
            <span className="text-secondary font-label font-bold tracking-widest text-xs uppercase mb-3 block">
              {block.label}
            </span>
          )}
          
          {block.blockTitle && (
            <h3
              className={`font-serif leading-tight tracking-tight mb-4 ${isBoth ? 'text-white text-3xl' : 'text-primary text-4xl'}`}
              style={{ color: block.textColor }}
            >
              {block.blockTitle}
            </h3>
          )}
          
          {block.blockParagraph && (
            <p
              className={`font-body text-base leading-relaxed max-w-xl ${isBoth ? 'text-white/80' : 'text-on-surface-variant'}`}
              style={{ color: block.textColor ? `${block.textColor}dd` : undefined, whiteSpace: 'pre-line' }}
            >
              {block.blockParagraph}
            </p>
          )}

          {block.buttonText && (
            <button className="mt-8 bg-primary-container text-on-primary px-8 py-3 rounded-DEFAULT font-label font-semibold tracking-wide hover:opacity-90 transition-all pointer-events-auto shadow-md">
              {block.buttonText}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default function Home() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [content, setContent] = useState<any>(contentData);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateMode = () => {
        if (window.innerWidth < 768) setPreviewMode('mobile');
        else if (window.innerWidth < 1024) setPreviewMode('tablet');
        else setPreviewMode('desktop');
      };
      updateMode();
      window.addEventListener('resize', updateMode);
      return () => window.removeEventListener('resize', updateMode);
    }
  }, []);

  const heroContent = useMemo(() => content?.hero || {}, [content]);
  const introContent = useMemo(() => content?.introduction || null, [content]);
  const masterSection = useMemo(() => {
    const source = content?.sections;
    if (Array.isArray(source)) {
      return source.find((s: any) => s.id === 'infinite_grid') || source[0];
    }
    return null;
  }, [content]);

  return (
    <div className="bg-surface text-on-surface font-sans selection:bg-secondary-fixed selection:text-on-secondary-fixed min-h-screen flex flex-col">
      {/* Top scroll progress bar */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #964828, #163428)',
          transformOrigin: '0%',
          zIndex: 2000,
          scaleX
        }}
      />

      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#fff9ef]/80 dark:bg-[#1d1b16]/80 backdrop-blur-xl border-b border-outline-variant/10 transition-all duration-300">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-8 py-6 w-full">
          <a className="text-2xl font-serif tracking-tighter text-[#163428] dark:text-[#f3ede4] hover:opacity-80 transition-all duration-300" href="#">
            Tiny Puertecillo
          </a>
          <div className="hidden md:flex items-center space-x-10">
            <a className="text-[#163428] dark:text-[#fff9ef] border-b-2 border-[#964828] pb-1 font-label text-sm tracking-wide" href="#">Inicio</a>
            <a className="text-[#1d1b16]/70 dark:text-[#f3ede4]/70 hover:text-[#163428] transition-colors font-label text-sm tracking-wide" href="#lienzo">Las Tiny</a>
            <a className="text-[#1d1b16]/70 dark:text-[#f3ede4]/70 hover:text-[#163428] transition-colors font-label text-sm tracking-wide" href="#contacto">Contacto</a>
          </div>
          <button className="bg-primary-container text-on-primary px-8 py-3 rounded-DEFAULT font-label font-semibold tracking-wide hover:opacity-90 transition-all">
            Reservar
          </button>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        {heroContent && !heroContent.hidden && (
          <section className="relative min-h-screen flex items-end pb-24 px-8 overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img
                alt="Tiny Puertecillo Hero"
                className="w-full h-full object-cover"
                src={heroContent.background_image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001f14]/80 via-[#001f14]/30 to-transparent"></div>
            </div>
            <div className="relative z-10 max-w-7xl mx-auto w-full">
              <div className="max-w-3xl">
                <motion.h1
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="text-white font-serif text-6xl md:text-8xl leading-tight tracking-tight mb-6"
                >
                  {heroContent.title1}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="text-white/90 font-body text-xl md:text-2xl leading-relaxed max-w-xl"
                >
                  {heroContent.paragraph1}
                </motion.p>
              </div>
            </div>
          </section>
        )}

        {/* Introduction Section */}
        {introContent && (
          <section className="py-32 px-8 bg-[#f9f3ea] dark:bg-[#1d1b16]/40 transition-colors duration-300">
            <div className="max-w-4xl mx-auto text-left">
              {introContent.label && (
                <span className="text-secondary font-label font-bold tracking-widest text-xs uppercase mb-4 block">
                  {introContent.label}
                </span>
              )}
              {introContent.title && (
                <h2 className="font-serif text-primary text-5xl md:text-7xl leading-tight tracking-tight mb-8">
                  {introContent.title}
                </h2>
              )}
              {introContent.paragraph && (
                <p className="font-sans text-on-surface-variant text-lg md:text-xl leading-relaxed max-w-3xl">
                  {introContent.paragraph}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Grilla Infinita Section */}
        <section id="lienzo" className="py-24" style={{ backgroundColor: masterSection?.bgColor || 'transparent' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div
              className="bento-grid-mobile"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(48, 1fr)',
                gridAutoRows: '15px',
                gap: '0px',
                maxWidth: '100%',
                margin: '0 auto'
              }}
            >
              {masterSection?.blocks?.map((block: any, idx: number) => (
                <BentoBlock
                  key={block.id || idx}
                  block={block}
                  previewMode={previewMode}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contacto" className="w-full py-16 px-8 bg-[#f3ede4] dark:bg-[#163428] border-t border-outline-variant/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-7xl mx-auto w-full">
          <div className="space-y-6">
            <p className="text-lg font-serif italic text-[#163428] dark:text-[#f9f3ea]">Tiny Puertecillo</p>
            <p className="text-[#1d1b16] dark:text-[#f9f3ea] font-label text-sm opacity-70">
              Experiencias arquitectónicas en el borde costero chileno.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <p className="font-label text-xs uppercase tracking-widest text-[#163428] dark:text-[#f9f3ea] mb-2">Legal &amp; Social</p>
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-60 hover:opacity-100 transition-opacity underline decoration-[#964828] underline-offset-4 font-label text-sm" href="#">Privacidad</a>
              <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-60 hover:opacity-100 transition-opacity font-label text-sm" href="#">Términos</a>
              <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-60 hover:opacity-100 transition-opacity font-label text-sm" href="#">Sustentabilidad</a>
            </div>
          </div>
          <div className="flex flex-col md:items-end justify-between">
            <p className="text-xs font-label all-caps tracking-widest text-[#1d1b16] dark:text-[#f9f3ea] opacity-60">
              © 2026 Tiny Puertecillo SpA. Architectural Retreats.
            </p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @media (max-width: 768px) {
          .bento-grid-mobile {
            grid-template-columns: repeat(48, 1fr) !important;
            gap: 0px !important;
          }
          .bento-block-mobile {
            grid-column: var(--final-col) / span var(--final-span-w) !important;
            grid-row: var(--final-row) / span var(--final-span-h) !important;
            aspect-ratio: auto !important;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .bento-block-mobile {
            --final-col: var(--t-col) !important;
            --final-row: var(--t-row) !important;
            --final-span-w: var(--t-span-w) !important;
            --final-span-h: var(--t-span-h) !important;
          }
        }
        @media (max-width: 768px) {
          .bento-block-mobile {
            --final-col: var(--m-col) !important;
            --final-row: var(--m-row) !important;
            --final-span-w: var(--m-span-w) !important;
            --final-span-h: var(--m-span-h) !important;
          }
        }
      `}</style>
    </div>
  );
}
