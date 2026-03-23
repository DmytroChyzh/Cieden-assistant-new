import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous({
      // Anonymous provider can optionally validate an abuse-prevention token.
      // For now we allow anonymous sign-in without extra validation.
      profile(params) {
        // Accept optional identity fields provided by the client.
        // This lets us show name/email in chat even without password auth.
        const name = (params?.name as string | undefined) ?? "Guest";
        const email = (params?.email as string | undefined) ?? "";
        return { isAnonymous: true, name, email };
      },
    }),
    Password({
      profile(params) {
        const email = params.email as string;

        // Log profile creation for debugging
        console.log("Creating/updating auth profile for:", email);

        return {
          email: email,
          name: params.name as string || email.split("@")[0],
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      console.log("Auth redirect callback:", redirectTo);
      return redirectTo;
    },
  },
});