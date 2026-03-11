// Debug utility to test microphone access and audio levels

export async function testMicrophoneAccess() {
  console.log('🎤 Testing microphone access...');

  try {
    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    console.log('✅ Microphone access granted');
    console.log('🎤 Audio tracks:', stream.getAudioTracks());

    // Create audio context to analyze audio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    microphone.connect(analyser);
    analyser.fftSize = 256;

    // Monitor audio levels for 5 seconds
    let maxLevel = 0;
    const checkInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      maxLevel = Math.max(maxLevel, average);

      if (average > 10) {
        console.log('🔊 Audio detected! Level:', average);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('📊 Test complete. Max audio level detected:', maxLevel);

      if (maxLevel < 10) {
        console.warn('⚠️ No significant audio detected. Check if microphone is muted or not working.');
      }

      // Clean up
      stream.getTracks().forEach(track => track.stop());
      microphone.disconnect();
      audioContext.close();
    }, 5000);

    return {
      success: true,
      stream,
      tracks: stream.getAudioTracks().map(t => ({
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      }))
    };
  } catch (error) {
    console.error('❌ Microphone access failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function checkMediaPermissions() {
  if (!navigator.permissions) {
    console.warn('Permissions API not available');
    return;
  }

  navigator.permissions.query({ name: 'microphone' as PermissionName })
    .then((result) => {
      console.log('🎤 Microphone permission state:', result.state);

      result.addEventListener('change', () => {
        console.log('🎤 Microphone permission changed to:', result.state);
      });
    })
    .catch((error) => {
      console.error('Error checking microphone permission:', error);
    });
}