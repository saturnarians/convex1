/// <reference types="node" />
const clerkIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

const authConfig = {
  providers: clerkIssuerDomain
    ? [
        {
          domain: clerkIssuerDomain,
          applicationID: "convex",
        },
      ]
    : [],
};

export default authConfig;
