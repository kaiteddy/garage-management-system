'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Loader2, Factory } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { SevenZapViewer } from '@/components/partsouq/sevenzap-viewer';

interface SevenZapButtonProps {
  vin: string;
  make?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function SevenZapButton({
  vin,
  make,
  variant = 'outline',
  size = 'sm',
  className
}: SevenZapButtonProps) {
  const [showViewer, setShowViewer] = useState(false);

  // Removed excessive console logging for performance

  const handleSevenZapClick = () => {
    console.log('🔵 [7ZAP-BUTTON] Button clicked!', { vin, make });

    if (!vin) {
      console.log('❌ [7ZAP-BUTTON] No VIN provided');
      toast({
        title: "No VIN Available",
        description: "VIN is required to search 7zap parts catalog",
        variant: "destructive"
      });
      return;
    }

    setShowViewer(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleSevenZapClick}
        className={`gap-1 ${className || ''}`}
        title={`Search 7zap OEM catalog for VIN: ${vin}`}
      >
        <Factory className="h-3 w-3" />
        7zap
      </Button>

      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              7zap OEM Parts Catalog
            </DialogTitle>
          </DialogHeader>
          <SevenZapViewer
            vin={vin}
            onClose={() => setShowViewer(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
