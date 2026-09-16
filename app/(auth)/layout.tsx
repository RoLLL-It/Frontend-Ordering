'use client';

import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md mx-auto">{children}</div>
    </div>
  );
}

