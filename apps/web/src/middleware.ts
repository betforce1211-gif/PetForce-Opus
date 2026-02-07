import { clerkMiddleware } from "@clerk/nextjs/server";

const protectedRoutes = ["/dashboard", "/onboard"];

export default clerkMiddleware(async (auth, request) => {
  const path = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some(
    (route) => path === route || path.startsWith(route + "/")
  );

  if (isProtected) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
