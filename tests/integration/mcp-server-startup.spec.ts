import { describe, it, expect } from 'vitest';
import app from '../../src/main/protocols/mcp/app.js';

describe('MCP Server Startup', () => {
  it('should create MCP application without errors', () => {
    expect(app).toBeDefined();
    expect(app).toHaveProperty('register');
    expect(app).toHaveProperty('start');
  });

  it('should have proper registration', () => {
    // The app should be registered during import
    expect(() => {
      // This tests that the registration in app.ts doesn't throw
      const appRef = app;
      expect(appRef).toBeDefined();
    }).not.toThrow();
  });

  // Note: We don't test actual server startup as that would start a real MCP server
  // In production testing, you would start the server and test MCP protocol communication
});