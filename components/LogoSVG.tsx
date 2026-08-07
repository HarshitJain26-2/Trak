import React from 'react';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';

interface LogoSVGProps {
  width?: number;
  height?: number;
  glow?: boolean;
}

export const LogoSVG: React.FC<LogoSVGProps> = ({ width = 160, height = 160, glow = false }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200" fill="none">
      <Defs>
        {/* Futuristic Gradient for main arrow body */}
        <LinearGradient id="logoArrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#00D9FF" />
          <Stop offset="50%" stopColor="#39FF88" />
          <Stop offset="100%" stopColor="#A8FF60" />
        </LinearGradient>

        {/* Dark Teal Swoop Gradient */}
        <LinearGradient id="logoSwoopGrad" x1="0%" y1="100%" x2="70%" y2="20%">
          <Stop offset="0%" stopColor="#073B4C" stopOpacity="0.9" />
          <Stop offset="60%" stopColor="#00A896" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#00D9FF" stopOpacity="1" />
        </LinearGradient>

        {/* Glow Filter */}
        {glow && (
          <Filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <FeGaussianBlur stdDeviation="4" result="blur" />
            <FeMerge>
              <FeMergeNode in="blur" />
              <FeMergeNode in="SourceGraphic" />
            </FeMerge>
          </Filter>
        )}
      </Defs>

      {/* Main Base Dark Swoop */}
      <Path
        d="M 50 115 C 32 155, 68 188, 110 180 C 145 172, 168 132, 150 95 C 138 70, 115 50, 90 35 C 75 26, 52 22, 30 35 C 18 42, 28 65, 55 60 C 72 57, 102 62, 118 85 C 132 105, 122 140, 95 152 C 72 162, 48 145, 50 115 Z"
        fill="url(#logoSwoopGrad)"
        filter={glow ? 'url(#neonGlow)' : undefined}
      />

      {/* Dynamic Main Green-Cyan Arrow */}
      <Path
        d="M 45 105 C 55 148, 88 165, 118 142 C 145 120, 142 80, 112 55 C 88 35, 60 28, 40 38 M 70 85 L 175 25 L 140 85 L 115 65 Z"
        fill="url(#logoArrowGrad)"
        filter={glow ? 'url(#neonGlow)' : undefined}
      />

      {/* Upward Arrowhead Tip Sharp Outline */}
      <Path
        d="M 125 70 L 178 22 L 142 88 L 128 68 Z"
        fill="#A8FF60"
      />

      {/* Three Orbiting Trajectory Dots along upper arrow ridge */}
      <Circle cx="88" cy="46" r="6" fill="#39FF88" />
      <Circle cx="112" cy="34" r="7" fill="#39FF88" />
      <Circle cx="138" cy="24" r="8" fill="#A8FF60" />
    </Svg>
  );
};

export default LogoSVG;
