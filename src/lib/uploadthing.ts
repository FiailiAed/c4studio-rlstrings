import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  dropOffPhoto: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    // WARNING: No auth — drop-off is a public page (no Clerk session).
    // If abuse becomes a concern, add IP rate limiting at the Vercel edge.
    .middleware(async () => ({}))
    .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
  productImage: f({ image: { maxFileSize: "8MB", maxFileCount: 4 } })
    // Auth is enforced at the Astro API route level (Clerk-guarded create/update endpoints).
    .middleware(async () => ({}))
    .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
  dyeReference: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    // Public — used on the shop page for Tier 2 dye reference photo uploads.
    .middleware(async () => ({}))
    .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
  pocketPhoto: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    // Public — used on the shop page for pocket replication photo uploads.
    .middleware(async () => ({}))
    .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
