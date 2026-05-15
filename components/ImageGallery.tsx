import React, { useState, useEffect } from 'react';

interface ImageGalleryProps {
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, initialIndex = 0, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

    // Navegação por teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') handlePrevious();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setIsZoomed(false);
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        setIsZoomed(false);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isZoomed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomPosition({ x, y });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-white text-2xl">photo_library</span>
                    <div>
                        <p className="text-white font-bold">Galeria de Imagens</p>
                        <p className="text-white/60 text-sm">
                            {currentIndex + 1} de {images.length}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsZoomed(!isZoomed)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title={isZoomed ? 'Desativar Zoom' : 'Ativar Zoom'}
                    >
                        <span className="material-symbols-outlined">
                            {isZoomed ? 'zoom_out' : 'zoom_in'}
                        </span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Fechar (ESC)"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            {/* Main Image */}
            <div className="flex-1 flex items-center justify-center p-4 relative">
                {/* Previous Button */}
                {images.length > 1 && (
                    <button
                        onClick={handlePrevious}
                        className="absolute left-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-110 active:scale-95"
                        title="Anterior (←)"
                    >
                        <span className="material-symbols-outlined text-3xl">chevron_left</span>
                    </button>
                )}

                {/* Image Container */}
                <div
                    className={`relative max-w-full max-h-full flex items-center justify-center ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                        }`}
                    onClick={() => setIsZoomed(!isZoomed)}
                    onMouseMove={handleMouseMove}
                >
                    <img
                        src={images[currentIndex]}
                        alt={`Imagem ${currentIndex + 1}`}
                        className={`max-w-full max-h-[calc(100vh-200px)] object-contain transition-all duration-300 ${isZoomed ? 'scale-150' : 'scale-100'
                            }`}
                        style={
                            isZoomed
                                ? {
                                    transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                                }
                                : {}
                        }
                    />
                </div>

                {/* Next Button */}
                {images.length > 1 && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-110 active:scale-95"
                        title="Próxima (→)"
                    >
                        <span className="material-symbols-outlined text-3xl">chevron_right</span>
                    </button>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="p-4 bg-black/50 backdrop-blur-sm overflow-x-auto">
                    <div className="flex gap-2 justify-center min-w-max mx-auto">
                        {images.map((img, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setCurrentIndex(index);
                                    setIsZoomed(false);
                                }}
                                className={`relative shrink-0 rounded-lg overflow-hidden transition-all ${index === currentIndex
                                        ? 'ring-4 ring-primary scale-110'
                                        : 'opacity-60 hover:opacity-100 hover:scale-105'
                                    }`}
                            >
                                <img
                                    src={img}
                                    alt={`Thumbnail ${index + 1}`}
                                    className="w-20 h-20 object-cover"
                                />
                                {index === currentIndex && (
                                    <div className="absolute inset-0 bg-primary/20"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="p-2 bg-black/30 text-center">
                <p className="text-white/60 text-xs">
                    Use as setas ← → para navegar • ESC para fechar • Clique para zoom
                </p>
            </div>
        </div>
    );
};

export default ImageGallery;
