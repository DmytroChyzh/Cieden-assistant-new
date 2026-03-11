import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
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