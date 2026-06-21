import React from 'react';
import Lottie from 'lottie-react';
import animationData from '../assets/sublexify_icon_anim.json';

export default function Mascot({ width = 260, height = 260 }: { width?: number; height?: number }) {
  return (
    <div style={{ width, height, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Lottie animationData={animationData} loop={true} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
