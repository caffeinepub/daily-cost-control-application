import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© 2025. Built with</span>
            <Heart className="h-4 w-4 text-primary fill-primary" />
            <span>using</span>
            <a 
              href="https://caffeine.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              caffeine.ai
            </a>
          </div>
          
          <div className="flex items-center gap-2">
            <img src="/assets/generated/rotary-tt-emblem.dim_150x150.png" alt="Rotary TT" className="h-8 w-8" />
            <span className="text-sm text-muted-foreground">Fellowship of Table Tennis Loving Rotarians</span>
          </div>
        </div>
      </div>
    </footer>
  );
}


