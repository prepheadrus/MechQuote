/**
 * ML Service Provider
 * Auto-starts ML service and training scheduler
 */

'use client';

import React, { useEffect } from 'react';

export function MLServiceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log('[ML Service] Provider initialized');

    // Check and train on app start (via API)
    fetch('/api/ml/auto-train')
      .then(res => res.json())
      .then(result => {
        console.log('[ML Service] Initial training check:', result.reason);
      })
      .catch(err => {
        console.error('[ML Service] Training check failed:', err);
      });

    // Schedule nightly training at 3 AM
    const scheduleTraining = () => {
      const now = new Date();
      const next3AM = new Date(now);
      next3AM.setHours(3, 0, 0, 0);
      if (now > next3AM) {
        next3AM.setDate(next3AM.getDate() + 1);
      }

      const msUntil3AM = next3AM.getTime() - now.getTime();

      console.log(`[ML Service] Next training scheduled in ${Math.round(msUntil3AM / 1000 / 60)} minutes`);

      setTimeout(() => {
        fetch('/api/ml/auto-train')
          .then(res => res.json())
          .then(result => {
            console.log('[ML Service] Scheduled training:', result.reason);
          })
          .catch(err => {
            console.error('[ML Service] Scheduled training failed:', err);
          });

        // Schedule next day
        scheduleTraining();
      }, msUntil3AM);
    };

    scheduleTraining();
  }, []);

  return <>{children}</>;
}
