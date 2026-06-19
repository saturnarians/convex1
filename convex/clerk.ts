/// <reference types="node" />
import { createClerkClient } from "@clerk/backend";


export async function verifyClerkToken(token: string, issuerDomain: string) {
  if (!issuerDomain) throw new Error("No issuer configured");

  // Format the issuer domain correctly for Clerk's validator
  const issuer = issuerDomain.startsWith("https://") 
    ? issuerDomain 
    : `https://${issuerDomain}`;

  // Initialize the modern Clerk backend client
  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  try {
    // Modern authentication token verification method
    const verifiedToken = await clerkClient.authenticateRequest(
      new Request(issuer, {
        headers: new Headers({
          Authorization: `Bearer ${token}`,
        }),
      }),
    );

    if (!verifiedToken.isAuthenticated) {
      throw new Error("Token verification failed: Not signed in");
    }

    return verifiedToken.toAuth().sessionClaims;
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error occurred");
    throw new Error(`Clerk token verification failed: ${err.message}`);
  }
}
