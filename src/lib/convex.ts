import { ConvexClient } from "convex/browser";

// Get the Convex URL from environment variables
const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;

// Create a function to get the client (allows for lazy initialization)
let client: ConvexClient | null = null;

export function getConvexClient(): ConvexClient {
  if (!convexUrl) {
    throw new Error(
      "Missing PUBLIC_CONVEX_URL environment variable.\n\n" +
      "To set up Convex:\n" +
      "1. Run 'bunx convex dev' in your terminal\n" +
      "2. Follow the prompts to log in and create a project\n" +
      "3. Copy the deployment URL to your .env.local file:\n" +
      "   PUBLIC_CONVEX_URL=https://your-project.convex.cloud\n" +
      "4. Restart your dev server"
    );
  }
  
  if (!client) {
    client = new ConvexClient(convexUrl);
  }
  
  return client;
}

// Export a pre-initialized client for convenience (will throw if URL not set)
export const convex = convexUrl ? new ConvexClient(convexUrl) : null;
