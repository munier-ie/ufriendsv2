import React from 'react';
import logoImg from '../../assets/logo.png';

export default function Logo({ className = 'w-12 h-12', alt = 'Ufriends Logo', ...props }) {
  return (
    <img
      src={logoImg}
      alt={alt}
      className={`object-contain ${className}`}
      {...props}
    />
  );
}
