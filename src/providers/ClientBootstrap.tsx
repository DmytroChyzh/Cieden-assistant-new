"use client";

import { useLayoutEffect } from 'react';
import { initMediaStreamTracker } from '@/src/utils/mediaStreamTracker';

export function ClientBootstrap(): null {
  useLayoutEffect(() => {
    initMediaStreamTracker();
  }, []);
  return null;
}


