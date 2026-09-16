'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Layers, MapPin, Calendar, Compass, Shield, Wind, Flame, Coffee, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import contentData from '../../web_content_sync.json';

const AIRBNB_URL = 'https://www.airbnb.cl/rooms/1702295511791817167';
const BOOKING_URL = 'https://www.booking.com/hotel/cl/tiny-puertecillo-entre-el-bosque-y-el-mar.es.html?aid=2311236&label=es-cl-booking-desktop-LVoANQ22b9Q1GvFzlorfdQS652829001271%3Apl%3Ata%3Ap1%3Ap2%3Aac%3Aap%3Aneg%3Afi%3Atikwd-65526620%3Alp1003316%3Ali%3Adec%3Adm';

const BentoBlock = ({ block, previewMode, onOpenGallery }: { block: any; previewMode?: string; onOpenGallery?: (images: string[], index: number) => void }) => {
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
  const isMosaic = block.type === 'mosaic';
  const mosaicLayout = block.mosaicLayout || 'hero';
  const mosaicSmall = images.slice(1, 5);
  const mosaicRemaining = images.length - 1 - mosaicSmall.length;
  const stripShown = images.slice(0, 5);
  const stripRemaining = images.length - stripShown.length;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  if (currentMode === 'mobile') {
    if (isMosaic && images.length > 0 && mosaicLayout === 'strip') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full overflow-hidden mb-5"
          style={{ borderRadius: block.borderRadius || '20px', backgroundColor: block.bgColor || '#f3ede4' }}
        >
          {block.label && (
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <span className="text-secondary font-label font-bold tracking-widest text-xs uppercase">{block.label}</span>
              <span className="font-label text-xs opacity-50">{images.length} fotos</span>
            </div>
          )}
          <div
            className="flex gap-3 overflow-x-auto pb-5 pl-5 pr-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}
          >
            {images.map((src: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => onOpenGallery && onOpenGallery(images, i)}
                className="relative shrink-0 snap-start overflow-hidden rounded-2xl"
                style={{ width: '70%', aspectRatio: '4 / 5' }}
              >
                <img src={src} alt={`${block.label || 'Galería'} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
            <div className="shrink-0 w-2" />
          </div>
        </motion.div>
      );
    }
    if (isMosaic && images.length > 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full overflow-hidden mb-5"
          style={{ borderRadius: block.borderRadius || '20px', backgroundColor: block.bgColor || '#f3ede4' }}
        >
          {block.label && (
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <span className="text-secondary font-label font-bold tracking-widest text-xs uppercase">{block.label}</span>
              <span className="font-label text-xs opacity-50">{images.length} fotos</span>
            </div>
          )}
          <div className="px-5 pb-5">
            <button
              type="button"
              onClick={() => onOpenGallery && onOpenGallery(images, 0)}
              className="w-full overflow-hidden rounded-2xl block mb-3"
              style={{ aspectRatio: '16 / 10' }}
            >
              <img src={images[0]} alt={block.label || 'Interior'} className="w-full h-full object-cover" />
            </button>
            {mosaicSmall.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {mosaicSmall.map((src: string, i: number) => {
                  const isLast = i === mosaicSmall.length - 1 && mosaicRemaining > 0;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onOpenGallery && onOpenGallery(images, i + 1)}
                      className="relative overflow-hidden rounded-lg"
                      style={{ aspectRatio: '1 / 1' }}
                    >
                      <img src={src} alt={`${block.label || 'Interior'} ${i + 2}`} className="w-full h-full object-cover" />
                      {isLast && (
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                          <span className="text-white font-label font-semibold text-sm">+{mosaicRemaining}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      );
    }
    const hasText = Boolean(block.label || block.blockTitle || block.blockParagraph || block.buttonText);
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full overflow-hidden mb-5"
        style={{
          borderRadius: block.borderRadius || '20px',
          backgroundColor: hasText ? (block.bgColor || '#f3ede4') : 'transparent',
        }}
      >
        {(isImage || isBoth) && images[0] && (
          <div className="w-full" style={{ aspectRatio: '4 / 3' }}>
            <img
              src={images[0]}
              alt={block.label}
              className="w-full h-full object-cover"
              style={{
                borderRadius: hasText
                  ? `${block.borderRadius || '20px'} ${block.borderRadius || '20px'} 0 0`
                  : (block.borderRadius || '20px')
              }}
            />
          </div>
        )}
        {hasText && (
          <div
            className="px-6 py-6"
            style={{ color: block.textColor || '#1d1b16', textAlign: block.textAlign || 'left' }}
          >
            {block.label && (
              <span className="text-secondary font-label font-bold tracking-widest text-xs uppercase mb-2 block">
                {block.label}
              </span>
            )}
            {block.blockTitle && (
              <h3
                className="font-serif leading-tight tracking-tight mb-3 text-2xl"
                style={{ color: block.textColor }}
              >
                {block.blockTitle}
              </h3>
            )}
            {block.blockParagraph && (
              <p
                className="font-body text-base leading-relaxed"
                style={{ color: block.textColor ? `${block.textColor}dd` : undefined, whiteSpace: 'pre-line' }}
              >
                {block.blockParagraph}
              </p>
            )}
            {block.buttonText && (
              <div
                className="mt-6 flex flex-col sm:flex-row gap-3"
                style={{ justifyContent: block.textAlign === 'center' ? 'center' : (block.textAlign === 'right' ? 'flex-end' : 'flex-start') }}
              >
                {block.buttonLink ? (
                  <a
                    href={block.buttonLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-center bg-primary-container text-on-primary px-8 py-3 rounded-DEFAULT font-label font-semibold tracking-wide hover:opacity-90 transition-all shadow-md"
                  >
                    {block.buttonText}
                  </a>
                ) : (
                  <button className="bg-primary-container text-on-primary px-8 py-3 rounded-DEFAULT font-label font-semibold tracking-wide hover:opacity-90 transition-all shadow-md">
                    {block.buttonText}
                  </button>
                )}
                {block.buttonText2 && block.buttonLink2 && (
                  <a
                    href={block.buttonLink2}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="secondary-cta-btn inline-block text-center px-8 py-3 rounded-DEFAULT font-label font-semibold tracking-wide transition-all"
                    style={{
                      border: `2px solid ${block.textColor || '#163428'}`,
                      color: block.textColor || '#163428',
                      '--secondary-cta-bg': block.textColor || '#163428',
                      '--secondary-cta-fg': block.bgColor || '#fff9ef'
                    } as any}
                  >
                    {block.buttonText2}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

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

      {/* Mosaic gallery rendering */}
      {isMosaic && images.length > 0 && (
        <div className="absolute inset-0 w-full h-full flex flex-col p-3">
          {block.label && (
            <div className="flex items-center justify-between px-2 pb-2 shrink-0">
              <span className="text-secondary font-label font-bold tracking-widest text-xs uppercase">{block.label}</span>
              <span className="font-label text-xs text-on-surface-variant opacity-60">{images.length} fotos</span>
            </div>
          )}
          {mosaicLayout === 'strip' ? (
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              <div className="flex-[1.15] flex gap-2 min-h-0">
                {stripShown.slice(0, 2).map((src: string, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onOpenGallery && onOpenGallery(images, i)}
                    className="relative flex-1 h-full overflow-hidden rounded-2xl group/mosaic"
                  >
                    <img
                      src={src}
                      alt={`${block.label || 'Terraza'} ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/mosaic:scale-105"
                    />
                  </button>
                ))}
              </div>
              {stripShown.length > 2 && (
                <div className="flex-1 flex gap-2 min-h-0">
                  {stripShown.slice(2, 5).map((src: string, i: number) => {
                    const realIndex = i + 2;
                    const isLast = realIndex === stripShown.length - 1 && stripRemaining > 0;
                    return (
                      <button
                        key={realIndex}
                        type="button"
                        onClick={() => onOpenGallery && onOpenGallery(images, realIndex)}
                        className="relative flex-1 h-full overflow-hidden rounded-xl group/mosaic"
                      >
                        <img
                          src={src}
                          alt={`${block.label || 'Terraza'} ${realIndex + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/mosaic:scale-105"
                        />
                        {isLast && (
                          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                            <span className="text-white font-label font-semibold text-lg">+{stripRemaining}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex gap-2 min-h-0">
              <button
                type="button"
                onClick={() => onOpenGallery && onOpenGallery(images, 0)}
                className="relative flex-[1.1] h-full overflow-hidden rounded-2xl group/mosaic"
              >
                <img
                  src={images[0]}
                  alt={block.label || 'Interior'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/mosaic:scale-105"
                />
              </button>
              {mosaicSmall.length > 0 && (
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 h-full">
                  {mosaicSmall.map((src: string, i: number) => {
                    const isLast = i === mosaicSmall.length - 1 && mosaicRemaining > 0;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onOpenGallery && onOpenGallery(images, i + 1)}
                        className="relative overflow-hidden rounded-xl group/mosaic"
                      >
                        <img
                          src={src}
                          alt={`${block.label || 'Interior'} ${i + 2}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/mosaic:scale-105"
                        />
                        {isLast && (
                          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                            <span className="text-white font-label font-semibold text-lg">+{mosaicRemaining}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
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
          className={`absolute inset-0 z-10 flex flex-col pointer-events-none`}
          style={{
            color: block.textColor || '#1d1b16',
            textAlign: block.textAlign || 'left',
            alignItems: block.textAlign === 'center' ? 'center' : (block.textAlign === 'right' ? 'flex-end' : 'flex-start'),
            justifyContent: block.textVerticalAlign === 'center' ? 'center' : (block.textVerticalAlign === 'top' ? 'flex-start' : 'flex-end'),
            padding: block.textPadding || '40px'
          }}
        >
          {block.label && !isBoth && (
            <span className="text-secondary font-label font-bold tracking-widest text-xs uppercase mb-3 block">
              {block.label}
            </span>
          )}

          {block.blockTitle && (
            <h3
              className={`font-serif tracking-tight mb-4 ${isBoth ? 'text-white' : 'text-primary'}`}
              style={{
                color: block.textColor,
                fontSize: block.titleSize || (isBoth ? '30px' : '36px'),
                lineHeight: block.titleLineHeight || '1.2',
                textTransform: (block.textTransform as any) || 'none'
              }}
            >
              {block.blockTitle}
            </h3>
          )}

          {block.blockParagraph && (
            <p
              className={`font-body ${isBoth ? 'text-white/80' : 'text-on-surface-variant'}`}
              style={{
                color: block.textColor ? `${block.textColor}dd` : undefined,
                whiteSpace: 'pre-line',
                fontSize: block.paragraphSize || '16px',
                lineHeight: block.lineHeight || '1.6',
                fontWeight: block.fontWeight || undefined,
                maxWidth: block.textMaxWidth || '36rem'
              }}
            >
              {block.blockParagraph}
            </p>
          )}

          {block.buttonText && (
            <div
              className="mt-8 flex flex-wrap gap-4 pointer-events-auto"
              style={{ justifyContent: block.textAlign === 'center' ? 'center' : (block.textAlign === 'right' ? 'flex-end' : 'flex-start') }}
            >
              {block.buttonLink ? (
                <a
                  href={block.buttonLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-primary-container text-on-primary px-8 py-3 rounded-DEFAULT font-label font-semibold tracking-wide hover:opacity-90 transition-all shadow-md"
                >
                  {block.buttonText}
                </a>
              ) : (
                <button className="bg-primary-container text-on-primary px-8 py-3 rounded-DEFAULT font-label font-semibold tracking-wide hover:opacity-90 transition-all shadow-md">
                  {block.buttonText}
                </button>
              )}
              {block.buttonText2 && block.buttonLink2 && (
                <a
                  href={block.buttonLink2}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-cta-btn inline-block px-8 py-3 rounded-DEFAULT font-label font-semibold tracking-wide transition-all"
                  style={{
                    border: `2px solid ${block.textColor || '#163428'}`,
                    color: block.textColor || '#163428',
                    '--secondary-cta-bg': block.textColor || '#163428',
                    '--secondary-cta-fg': block.bgColor || '#fff9ef'
                  } as any}
                >
                  {block.buttonText2}
                </a>
              )}
            </div>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') {
        setLightbox((l) => (l ? { ...l, index: (l.index + 1) % l.images.length } : l));
      }
      if (e.key === 'ArrowLeft') {
        setLightbox((l) => (l ? { ...l, index: (l.index - 1 + l.images.length) % l.images.length } : l));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightbox]);

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
        <div className="flex justify-between items-center max-w-7xl mx-auto px-5 md:px-8 py-3 md:py-4 w-full">
          <a className="hover:opacity-80 transition-all duration-300 block shrink-0" href="#">
            <img src="/logo/logo_negro.png" alt="Tiny Puertecillo" className="h-12 md:h-16 w-auto block dark:hidden" />
            <img src="/logo/logo_blanco.png" alt="Tiny Puertecillo" className="h-12 md:h-16 w-auto hidden dark:block" />
          </a>
          <div className="hidden md:flex items-center space-x-10">
            <a className="text-[#163428] dark:text-[#fff9ef] border-b-2 border-[#964828] pb-1 font-label text-sm tracking-wide" href="#">Inicio</a>
            <a className="text-[#1d1b16]/70 dark:text-[#f3ede4]/70 hover:text-[#163428] dark:hover:text-[#fff9ef] transition-colors font-label text-sm tracking-wide pb-1 border-b-2 border-transparent hover:border-[#964828]/50" href="#lienzo">Las Tiny</a>
            <a className="text-[#1d1b16]/70 dark:text-[#f3ede4]/70 hover:text-[#163428] dark:hover:text-[#fff9ef] transition-colors font-label text-sm tracking-wide pb-1 border-b-2 border-transparent hover:border-[#964828]/50" href="#contacto">Contacto</a>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-3">
              <a
                href={AIRBNB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary-container text-on-primary px-5 lg:px-6 py-2.5 rounded-DEFAULT font-label font-semibold tracking-wide text-sm hover:opacity-90 transition-all inline-block whitespace-nowrap"
              >
                Airbnb
              </a>
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-[#163428] dark:border-[#fff9ef] text-[#163428] dark:text-[#fff9ef] px-5 lg:px-6 py-2 rounded-DEFAULT font-label font-semibold tracking-wide text-sm hover:bg-[#163428] hover:text-white dark:hover:bg-[#fff9ef] dark:hover:text-[#163428] transition-all inline-block whitespace-nowrap"
              >
                Booking.com
              </a>
            </div>
            <button
              className="md:hidden p-2 text-[#1d1b16] dark:text-[#f9f3ea]"
              aria-label="Abrir menú"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden overflow-hidden bg-[#fff9ef] dark:bg-[#1d1b16] border-t border-outline-variant/10"
            >
              <div className="flex flex-col px-5 py-5 gap-5">
                <div className="flex flex-col gap-3">
                  <a
                    href={AIRBNB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary-container text-on-primary text-center px-6 py-3 rounded-DEFAULT font-label font-semibold tracking-wide text-sm hover:opacity-90 transition-all"
                  >
                    Reservar en Airbnb
                  </a>
                  <a
                    href={BOOKING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-2 border-[#163428] dark:border-[#fff9ef] text-[#163428] dark:text-[#fff9ef] text-center px-6 py-3 rounded-DEFAULT font-label font-semibold tracking-wide text-sm hover:bg-[#163428] hover:text-white dark:hover:bg-[#fff9ef] dark:hover:text-[#163428] transition-all"
                  >
                    Reservar en Booking.com
                  </a>
                </div>
                <div className="flex flex-col gap-4 border-t border-outline-variant/10 pt-4">
                  <a onClick={() => setMobileMenuOpen(false)} className="text-[#163428] dark:text-[#fff9ef] font-label text-base tracking-wide" href="#">Inicio</a>
                  <a onClick={() => setMobileMenuOpen(false)} className="text-[#1d1b16]/80 dark:text-[#f3ede4]/80 font-label text-base tracking-wide" href="#lienzo">Las Tiny</a>
                  <a onClick={() => setMobileMenuOpen(false)} className="text-[#1d1b16]/80 dark:text-[#f3ede4]/80 font-label text-base tracking-wide" href="#contacto">Contacto</a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                  className="text-white font-serif text-4xl sm:text-5xl md:text-8xl leading-[1.1] md:leading-tight tracking-tight mb-6"
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
          <div className="w-full max-w-none px-4 md:px-8">
            <div
              className="bento-grid-mobile"
              style={previewMode === 'mobile' ? {
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '100%',
                margin: '0 auto'
              } : {
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
                  onOpenGallery={(imgs, index) => setLightbox({ images: imgs, index })}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contacto" className="w-full pt-16 pb-8 px-8 bg-[#f3ede4] dark:bg-[#163428] border-t border-outline-variant/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-7xl mx-auto w-full items-start text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-5">
            <img
              src="/logo/logo_negro_clean.png"
              alt="Tiny Puertecillo Logo"
              className="h-20 w-auto object-contain dark:invert"
            />
            <p className="text-[#1d1b16] dark:text-[#f9f3ea] font-label text-sm opacity-70 max-w-xs leading-relaxed">
              Experiencias arquitectónicas en el borde costero chileno.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4">
            <p className="font-label text-xs uppercase tracking-widest text-[#163428] dark:text-[#f9f3ea] opacity-80">Legal &amp; Social</p>
            <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-3">
              <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-70 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all underline decoration-[#964828]/50 underline-offset-4 font-label text-sm" href="#">Privacidad</a>
              <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-70 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all underline decoration-[#964828]/50 underline-offset-4 font-label text-sm" href="#">Términos</a>
              <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-70 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all underline decoration-[#964828]/50 underline-offset-4 font-label text-sm" href="#">Sustentabilidad</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto w-full mt-12 pt-6 border-t border-[#1d1b16]/10 dark:border-[#f9f3ea]/10">
          <p className="text-xs font-label tracking-widest text-[#1d1b16] dark:text-[#f9f3ea] opacity-50 text-center uppercase">
            © 2026 Tiny Puertecillo SpA. Architectural Retreats.
          </p>
        </div>
      </footer>

      {/* Gallery Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[3000] bg-black/90 flex items-center justify-center p-4 md:p-10"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
              className="absolute top-5 right-5 text-white/80 hover:text-white p-2 z-10"
              aria-label="Cerrar"
            >
              <X className="w-8 h-8" />
            </button>
            {lightbox.images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((l) => (l ? { ...l, index: (l.index - 1 + l.images.length) % l.images.length } : l));
                }}
                className="absolute left-2 md:left-8 text-white/80 hover:text-white p-3 z-10"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
              </button>
            )}
            <motion.img
              key={lightbox.index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              src={lightbox.images[lightbox.index]}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            {lightbox.images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((l) => (l ? { ...l, index: (l.index + 1) % l.images.length } : l));
                }}
                className="absolute right-2 md:right-8 text-white/80 hover:text-white p-3 z-10"
                aria-label="Siguiente"
              >
                <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
              </button>
            )}
            {lightbox.images.length > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/70 font-label text-sm tracking-wide">
                {lightbox.index + 1} / {lightbox.images.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media (min-width: 769px) and (max-width: 1024px) {
          .bento-block-mobile {
            --final-col: var(--t-col) !important;
            --final-row: var(--t-row) !important;
            --final-span-w: var(--t-span-w) !important;
            --final-span-h: var(--t-span-h) !important;
          }
        }
        .secondary-cta-btn:hover {
          background-color: var(--secondary-cta-bg);
          color: var(--secondary-cta-fg);
        }
      `}</style>
    </div>
  );
}
