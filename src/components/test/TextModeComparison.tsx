'use client';

import { useConversation } from '@elevenlabs/react';
import { useState, useRef } from 'react';

export function TextModeComparison() {
  const [testResults, setTestResults] = useState<{
    sdkLatency: number[];
    customLatency: number[];
    connectionType: string | null;
  }>({
    sdkLatency: [],
    customLatency: [],
    connectionType: null
  });

  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testStatus, setTestStatus] = useState<string>('Ready to test');
  const messageSentTimeRef = useRef<number>(0);

  // Test 1: SDK with textOnly flag AND overrides
  const sdkConversation = useConversation({
    textOnly: true,  // This tells SDK to skip audio setup
    // Add overrides to ensure text-only mode is enforced
    overrides: {
      conversation: {
        textOnly: true  // Critical: enforce text-only at runtime
      }
    },
    onMessage: (message) => {
      if (message.source === 'ai' && messageSentTimeRef.current > 0) {
        const latency = Date.now() - messageSentTimeRef.current;
        console.log('📊 SDK Response Latency:', latency, 'ms');
        setTestResults(prev => ({
          ...prev,
          sdkLatency: [...prev.sdkLatency, latency]
        }));
        messageSentTimeRef.current = 0;
      }
    },
    onConnect: () => {
      console.log('🔗 SDK Connected - Inspecting connection type...');
      setTestStatus('SDK Connected');

      // Try to detect connection type
      const connectionInfo = sdkConversation as unknown;
      console.log('SDK Connection Details:', {
        status: sdkConversation.status,
        internalState: connectionInfo,
        // Check for WebRTC indicators
        hasGetInputVolume: typeof sdkConversation.getInputVolume === 'function',
        hasChangeInputDevice: typeof sdkConversation.changeInputDevice === 'function'
      });
    },
    onError: (error) => {
      console.error('❌ SDK Error:', error);
      setTestStatus(`SDK Error: ${String(error)}`);
    },
    onDebug: (message) => {
      console.log('🐛 SDK Debug:', message);
    }
  });

  // Test the SDK approach
  const testSDKApproach = async () => {
    if (isTestRunning) return;

    setIsTestRunning(true);
    setTestStatus('Testing SDK with textOnly=true...');
    console.log('🧪 Testing SDK with textOnly=true');

    try {
      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      if (!agentId) {
        throw new Error('ELEVENLABS_AGENT_ID not configured');
      }

      // Get signed URL for authentication
      console.log('🔐 Getting signed URL for authentication...');
      const signedUrlResponse = await fetch('/api/elevenlabs/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId })
      });

      if (!signedUrlResponse.ok) {
        throw new Error('Failed to get signed URL');
      }

      const { signed_url } = await signedUrlResponse.json();
      console.log('🚀 Starting SDK session with signed URL');

      const conversationId = await sdkConversation.startSession({
        signedUrl: signed_url,
        connectionType: 'websocket'  // Explicitly specify WebSocket for text mode
      });

      // Check the actual connection type
      console.log('📌 SDK Conversation started:', {
        conversationId,
        status: sdkConversation.status,
        // Inspect the internal connection object (if accessible)
        hasAudioMethods: {
          getInputVolume: typeof sdkConversation.getInputVolume === 'function',
          getOutputVolume: typeof sdkConversation.getOutputVolume === 'function',
        }
      });

      // Detect connection type based on available methods
      const isWebRTC = typeof sdkConversation.getInputVolume === 'function';
      setTestResults(prev => ({
        ...prev,
        connectionType: isWebRTC ? 'WebRTC (detected via audio methods)' : 'WebSocket (no audio methods)'
      }));

      // Wait a bit for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send test messages and measure latency
      setTestStatus('Sending test messages...');

      for (let i = 0; i < 3; i++) {
        messageSentTimeRef.current = Date.now();
        await sdkConversation.sendUserMessage(`Test message ${i + 1}: What is 2 + 2?`);

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setTestStatus('Test complete - check results');

      // End session
      await new Promise(resolve => setTimeout(resolve, 2000));
      await sdkConversation.endSession();

    } catch (error) {
      console.error('Test failed:', error);
      setTestStatus(`Test failed: ${error}`);
    } finally {
      setIsTestRunning(false);
    }
  };

  // Calculate average latency
  const avgLatency = testResults.sdkLatency.length > 0
    ? Math.round(testResults.sdkLatency.reduce((a, b) => a + b, 0) / testResults.sdkLatency.length)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold">Text Mode Connection Test</h2>

      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="font-semibold mb-2">Test Status:</p>
        <p className="text-sm">{testStatus}</p>
      </div>

      <button
        onClick={testSDKApproach}
        disabled={isTestRunning}
        className={`px-6 py-3 text-white rounded-lg font-medium ${
          isTestRunning
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isTestRunning ? 'Testing in progress...' : 'Test SDK Approach (textOnly=true)'}
      </button>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Connection Type Detection:</h3>
          <p className="text-sm font-mono">
            {testResults.connectionType || 'Not tested yet'}
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold mb-2">Latency Results:</h3>
          <div className="space-y-1 text-sm">
            <p>Messages sent: {testResults.sdkLatency.length}</p>
            <p>Latencies: {testResults.sdkLatency.join(', ')} ms</p>
            <p className="font-semibold">Average: {avgLatency} ms</p>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold mb-2">What to Check:</h3>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Open DevTools Network tab and filter by &quot;WS&quot;</li>
            <li>Look for WebSocket connections to api.elevenlabs.io</li>
            <li>Check Console for detailed connection logs</li>
            <li>Latency should be under 200ms for WebSocket</li>
          </ul>
        </div>

        <div className="p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Raw Test Data:</h3>
          <pre className="text-xs overflow-x-auto">{JSON.stringify(testResults, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}