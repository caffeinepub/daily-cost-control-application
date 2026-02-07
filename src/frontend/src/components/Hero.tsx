import AnnouncementBanner from './AnnouncementBanner';

export default function Hero() {
  return (
    <section className="relative w-full">
      <AnnouncementBanner />
      <div className="relative w-full h-[400px] overflow-hidden">
        <img 
          src="/assets/generated/hero-banner.dim_1200x400.png" 
          alt="FTTLR Hero Banner" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/20 flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
                Fellowship of Table Tennis Loving Rotarians
              </h1>
              <p className="text-lg md:text-xl text-white/90 drop-shadow-md">
                Join us every Sunday for competitive matches, skill development, and community building through the sport we love.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


