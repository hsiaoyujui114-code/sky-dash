import React, { useEffect, useRef } from 'react';
import { ShipConfig } from './types';

interface Props {
  ship: ShipConfig;
  size: number;
}

export const ShipPreviewCanvas: React.FC<Props> = ({ ship, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ship.draw(ctx, ship.width, ship.height, ship.baseColor, false, false);
        ctx.restore();
      }
    }
  }, [ship]);

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />;
};
