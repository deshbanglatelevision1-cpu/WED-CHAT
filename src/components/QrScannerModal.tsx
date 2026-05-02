import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

interface QrScannerModalProps {
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ onClose, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Small delay to ensure the container is rendered
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            scanner.clear().then(() => {
              onScan(decodedText);
            }).catch(err => {
              console.error("Failed to clear scanner", err);
              onScan(decodedText);
            });
          },
          (errorMessage) => {
            // Ignore common scan failures (no offset found, etc.)
          }
        );

        scannerRef.current = scanner;
      } catch (err: any) {
        console.error("Scanner init error:", err);
        setError("Could not start camera. Please ensure you have granted camera permissions.");
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Cleanup error", err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-bg-panel border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-premium-blue/20 rounded-full flex items-center justify-center mb-3">
              <Camera className="text-premium-blue" size={24} />
            </div>
            <h3 className="text-xl font-bold">Scan QR Code</h3>
            <p className="text-xs text-gray-400 mt-1">Point your camera at a friend's Nameweb QR code</p>
          </div>

          <div className="w-full aspect-square bg-black/40 rounded-2xl overflow-hidden relative border border-white/5 shadow-inner">
            <div id="qr-reader" className="w-full h-full"></div>
            
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-sm">
                <AlertCircle className="text-master-red mb-2" size={32} />
                <p className="text-sm text-white font-medium">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
                >
                  Reload Page
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-white/5 w-full flex justify-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Nameweb Secure Scanner</p>
          </div>
        </div>
      </div>
      
      <style>{`
        #qr-reader {
          border: none !important;
        }
        #qr-reader__scan_region {
          background: transparent !important;
        }
        #qr-reader__dashboard {
          padding: 1rem !important;
          background: rgba(0,0,0,0.3) !important;
        }
        #qr-reader__dashboard_section_csr button {
          background: #2196F3 !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          margin-top: 10px !important;
        }
        #qr-reader__camera_selection {
          background: #121212 !important;
          color: white !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          padding: 4px !important;
          border-radius: 4px !important;
          font-size: 12px !important;
        }
      `}</style>
    </div>
  );
};
