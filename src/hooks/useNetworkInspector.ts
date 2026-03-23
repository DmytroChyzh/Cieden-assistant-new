'use client';

import { useEffect } from 'react';

export function useNetworkInspector() {
  useEffect(() => {
    console.log('🔍 Network Inspector Active - Monitoring connections...');
    const win = window as Window & {
      webkitRTCPeerConnection?: typeof RTCPeerConnection;
    };

    // Store original constructors
    const OriginalWebSocket = window.WebSocket;
    const OriginalRTCPeerConnection = window.RTCPeerConnection || win.webkitRTCPeerConnection;

    // Override WebSocket to log connections
    window.WebSocket = new Proxy(OriginalWebSocket, {
      construct(target, args) {
        const url = args[0];
        const protocols = args[1];

        console.log('🌐 WebSocket Connection Attempt:', {
          url,
          protocols,
          timestamp: new Date().toISOString(),
          stack: new Error().stack?.split('\n').slice(2, 5).join('\n')
        });

        const ws = Reflect.construct(target, args) as WebSocket;

        // Track connection events
        const originalOnopen = ws.onopen;
        const originalOnclose = ws.onclose;
        const originalOnerror = ws.onerror;
        const originalOnmessage = ws.onmessage;

        ws.onopen = function(event) {
          console.log('✅ WebSocket OPENED:', {
            url,
            readyState: ws.readyState,
            protocol: ws.protocol,
            extensions: ws.extensions
          });
          if (originalOnopen) originalOnopen.call(this, event);
        };

        ws.onclose = function(event) {
          console.log('🔴 WebSocket CLOSED:', {
            url,
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          if (originalOnclose) originalOnclose.call(this, event);
        };

        ws.onerror = function(event) {
          console.error('❌ WebSocket ERROR:', {
            url,
            error: event
          });
          if (originalOnerror) originalOnerror.call(this, event);
        };

        // Log first few messages to understand protocol
        let messageCount = 0;
        ws.onmessage = function(event) {
          if (messageCount < 5) {
            console.log('📨 WebSocket Message:', {
              url,
              messageNumber: messageCount + 1,
              dataType: typeof event.data,
              dataSize: event.data.length || event.data.size || 'N/A',
              preview: typeof event.data === 'string'
                ? event.data.substring(0, 100) + (event.data.length > 100 ? '...' : '')
                : 'Binary data'
            });
            messageCount++;
          }
          if (originalOnmessage) originalOnmessage.call(this, event);
        };

        return ws;
      }
    });

    // Override RTCPeerConnection to detect WebRTC usage
    if (OriginalRTCPeerConnection) {
      window.RTCPeerConnection = new Proxy(OriginalRTCPeerConnection, {
        construct(target, args) {
          console.log('🎥 WebRTC PeerConnection Created:', {
            config: args[0],
            timestamp: new Date().toISOString(),
            stack: new Error().stack?.split('\n').slice(2, 5).join('\n')
          });

          const pc = Reflect.construct(target, args) as RTCPeerConnection;

          // Track connection state changes
          pc.oniceconnectionstatechange = function() {
            console.log('🎥 WebRTC ICE State:', pc.iceConnectionState);
          };

          pc.onconnectionstatechange = function() {
            console.log('🎥 WebRTC Connection State:', pc.connectionState);
          };

          return pc;
        }
      });
    }

    // Also monitor XHR/Fetch for API calls
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = args[0].toString();
      if (url.includes('elevenlabs')) {
        console.log('🔗 ElevenLabs API Call:', {
          url,
          method: args[1]?.method || 'GET',
          timestamp: new Date().toISOString()
        });
      }
      return originalFetch(...(args as Parameters<typeof fetch>));
    };

    // Cleanup function
    return () => {
      console.log('🔍 Network Inspector - Cleaning up...');
      window.WebSocket = OriginalWebSocket;
      if (OriginalRTCPeerConnection) {
        window.RTCPeerConnection = OriginalRTCPeerConnection;
      }
      window.fetch = originalFetch;
    };
  }, []);
}