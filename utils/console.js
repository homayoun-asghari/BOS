// Save original console methods
const originalConsole = { ...console };

// Only override in client-side code
if (typeof window !== 'undefined') {
  // Enable/disable logs based on environment variables
  const ENABLE_LOGS = process.env.NEXT_PUBLIC_ENABLE_LOGS === 'true';
  
  if (!ENABLE_LOGS) {
    // Override all console methods to be no-ops
    ['log', 'warn', 'info', 'debug'].forEach(method => {
      console[method] = () => {};
    });
    
    // Keep error logging by default
    console.error = originalConsole.error;
  }
}

// Optional: Export the original console methods if needed elsewhere
export default console;
